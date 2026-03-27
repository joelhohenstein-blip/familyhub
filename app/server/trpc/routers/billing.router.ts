import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  subscriptions,
  subscriptionTiers,
  invoices,
  auditLog,
  users,
  type NewSubscriptionTier,
} from '~/db/schema';
import { eq, and } from 'drizzle-orm';

// Validation schemas
const selectTierSchema = z.object({
  tierId: z.string().min(1, 'Tier ID required'),
});

const upgradeDowngradeSchema = z.object({
  tierId: z.string().min(1, 'Tier ID required'),
  effectiveDate: z.date().optional(), // If not provided, changes immediately
});

const getTiersSchema = z.object({
  activeOnly: z.boolean().default(true),
});

const getSubscriptionSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(), // If not provided, uses current user
});

const getInvoicesSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  limit: z.number().default(20),
  offset: z.number().default(0),
});

const createPlanSchema = z.object({
  id: z.string().min(1, 'Plan ID required').max(50),
  name: z.string().min(1, 'Plan name required').max(100),
  description: z.string().max(500).optional(),
  priceMonthly: z.number().int().min(0).nullable().optional(),
  priceYearly: z.number().int().min(0).nullable().optional(),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  stripeProductId: z.string().optional(),
  trialDays: z.number().int().min(0).default(14),
  features: z.record(z.string(), z.boolean()).default(() => ({})),
  maxFamilyMembers: z.number().int().nullable().optional(),
  maxStorageGB: z.number().int().nullable().optional(),
  maxMediaLibraryItems: z.number().int().nullable().optional(),
  displayOrder: z.number().int().default(0),
  internalNotes: z.string().optional(),
});

const updatePlanSchema = z.object({
  id: z.string().min(1, 'Plan ID required'),
  name: z.string().min(1, 'Plan name required').optional(),
  description: z.string().max(500).optional(),
  priceMonthly: z.number().int().min(0).nullable().optional(),
  priceYearly: z.number().int().min(0).nullable().optional(),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  maxFamilyMembers: z.number().int().nullable().optional(),
  maxStorageGB: z.number().int().nullable().optional(),
  maxMediaLibraryItems: z.number().int().nullable().optional(),
  displayOrder: z.number().int().optional(),
  internalNotes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const getPlanSchema = z.object({
  id: z.string().min(1, 'Plan ID required'),
});

const deletePlanSchema = z.object({
  id: z.string().min(1, 'Plan ID required'),
});

export const billingRouter = router({
  /**
   * Get all available subscription tiers (public endpoint)
   */
  getTiers: procedure
    .input(getTiersSchema)
    .query(async ({ ctx, input }) => {
      try {
        const tiers = await ctx.db.query.subscriptionTiers.findMany({
          where: input.activeOnly ? eq(subscriptionTiers.isActive, true) : undefined,
          orderBy: subscriptionTiers.displayOrder,
        });

        return tiers;
      } catch (error) {
        console.error('Error fetching tiers:', error);
        throw new Error('Failed to fetch subscription tiers');
      }
    }),

  /**
   * Get current user's subscription
   */
  getSubscription: procedure
    .input(getSubscriptionSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = input.userId || ctx.user.id;

      // If requesting another user's subscription, verify permission
      if (userId !== ctx.user.id) {
        // In a real app, check if current user is admin or has permission
        throw new Error('Unauthorized');
      }

      try {
        const [subscription] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (!subscription) {
          // Return a default free tier subscription
          return {
            tier: 'free',
            status: 'active',
            entitlements: {},
          };
        }

        return subscription;
      } catch (error) {
        console.error('Error fetching subscription:', error);
        throw new Error('Failed to fetch subscription');
      }
    }),

  /**
   * Select a tier during onboarding (for free tier)
   */
  selectTier: procedure
    .input(selectTierSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Fetch the tier to verify it exists
        const [tier] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.tierId))
          .limit(1);

        if (!tier) {
          throw new Error('Tier not found');
        }

        // Only allow selection of free tier without payment
        if (tier.priceMonthly !== null && tier.priceMonthly > 0) {
          throw new Error('Use payment flow for paid tiers');
        }

        // Check if user already has subscription
        const [existing] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        if (existing) {
          // Update to new free tier
          const [updated] = await ctx.db
            .update(subscriptions)
            .set({
              tier: input.tierId,
              status: 'active',
              entitlements: tier.features,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existing.id))
            .returning();

          // Log audit
          await ctx.db.insert(auditLog).values({
            actionType: 'subscription_tier_changed',
            actorId: ctx.user.id,
            targetId: existing.id,
            targetType: 'subscription',
            description: `Changed to tier: ${input.tierId}`,
          });

          return updated;
        }

        // Create new subscription
        const subscriptionId = `sub_${Date.now()}`;
        const [newSub] = await ctx.db
          .insert(subscriptions)
          .values({
            id: subscriptionId,
            userId: ctx.user.id,
            stripeCustomerId: '', // Will be populated when paying
            tier: input.tierId,
            status: 'active',
            entitlements: tier.features,
          })
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'subscription_created',
          actorId: ctx.user.id,
          targetId: subscriptionId,
          targetType: 'subscription',
          description: `Created subscription with tier: ${input.tierId}`,
        });

        return newSub;
      } catch (error) {
        console.error('Error selecting tier:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to select tier'
        );
      }
    }),

  /**
   * Get all available subscription tiers with pricing information
   */
  getAvailableTiersWithPricing: procedure.query(async ({ ctx }) => {
    try {
      const tiers = await ctx.db.query.subscriptionTiers.findMany({
        where: eq(subscriptionTiers.isActive, true),
        orderBy: (t) => t.displayOrder,
      });

      return tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        priceMonthly: tier.priceMonthly,
        priceYearly: tier.priceYearly,
        features: tier.features,
        maxFamilyMembers: tier.maxFamilyMembers,
        maxStorageGB: tier.maxStorageGB,
        maxMediaLibraryItems: tier.maxMediaLibraryItems,
        trialDays: tier.trialDays,
        displayOrder: tier.displayOrder,
      }));
    } catch (error) {
      console.error('Error fetching available tiers:', error);
      throw new Error('Failed to fetch available tiers');
    }
  }),

  /**
   * Get user's invoices
   */
  getInvoices: procedure
    .input(getInvoicesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const userId = input.userId || ctx.user.id;

      // If requesting another user's invoices, verify permission
      if (userId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      try {
        const userInvoices = await ctx.db
          .select()
          .from(invoices)
          .where(eq(invoices.userId, userId))
          .orderBy(invoices.issuedAt)
          .limit(input.limit)
          .offset(input.offset);

        return userInvoices;
      } catch (error) {
        console.error('Error fetching invoices:', error);
        throw new Error('Failed to fetch invoices');
      }
    }),

  /**
   * Get a specific invoice by ID
   */
  getInvoice: procedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        const [invoice] = await ctx.db
          .select()
          .from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Verify user owns invoice
        if (invoice.userId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }

        return invoice;
      } catch (error) {
        console.error('Error fetching invoice:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch invoice'
        );
      }
    }),

  /**
   * Check subscription status for current user
   */
  checkSubscriptionStatus: procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return null;
    }

    try {
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!subscription) {
        return {
          tier: 'free',
          status: 'active',
          currentPeriodEnd: null,
        };
      }

      return subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      throw new Error('Failed to check subscription status');
    }
  }),

  /**
   * Access billing portal (redirect to Stripe customer portal)
   */
  accessBillingPortal: procedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User must be authenticated');
    }

    try {
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!subscription || !subscription.stripeCustomerId) {
        throw new Error('No active subscription found');
      }

      // In a real app, create a Stripe billing portal session:
      // const session = await stripe.billingPortal.sessions.create({
      //   customer: subscription.stripeCustomerId,
      //   return_url: `${process.env.PREDEV_DEPLOYMENT_URL}/dashboard`,
      // });

      // For now, return a placeholder
      return {
        url: `/dashboard/billing`, // Would be session.url in production
        success: true,
      };
    } catch (error) {
      console.error('Error accessing billing portal:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to access billing portal'
      );
    }
  }),

  /**
   * Initiate Stripe checkout for plan upgrade
   */
  initiateStripeCheckout: procedure
    .input(
      z.object({
        planId: z.string(),
        tier: z.enum(['free', 'pro', 'enterprise', 'premium']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // If free tier, use selectTier instead
        if (input.planId === 'free') {
          return {
            url: null,
            message: 'Use selectTier for free tier',
          };
        }

        // In a real app, create Stripe checkout session
        // For now, return a mock response
        return {
          url: `https://checkout.stripe.com/pay/mock_${input.planId}`,
          sessionId: `cs_${Date.now()}`,
        };
      } catch (error) {
        console.error('Error initiating checkout:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to initiate checkout'
        );
      }
    }),

  /**
   * Check feature access for current user (used by feature gating)
   */
  hasFeatureAccess: procedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return false;
      }

      try {
        const [subscription] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        if (!subscription) {
          // Default free tier - check feature flags
          const [freeTier] = await ctx.db
            .select()
            .from(subscriptionTiers)
            .where(eq(subscriptionTiers.id, 'free'))
            .limit(1);

          return freeTier?.features?.[input.feature] ?? false;
        }

        // Check subscription entitlements first
        if (subscription.entitlements?.[input.feature]) {
          return true;
        }

        // Fallback to tier features
        const [tier] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, subscription.tier))
          .limit(1);

        return tier?.features?.[input.feature] ?? false;
      } catch (error) {
        console.error('Error checking feature access:', error);
        return false;
      }
    }),

  /**
   * Admin: Create a new subscription plan
   */
  createPlan: procedure
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Check if user is admin (simplified check - should be more robust)
        const adminRole = (ctx as any).userRole || 'user';
        if (adminRole !== 'admin') {
          throw new Error('Only admins can create plans');
        }

        // Check for duplicate plan
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (existing) {
          throw new Error('Plan with this ID already exists');
        }

        // Create the plan
        const tierData: NewSubscriptionTier = {
          id: input.id,
          name: input.name,
          description: input.description || null,
          priceMonthly: input.priceMonthly ?? null,
          priceYearly: input.priceYearly ?? null,
          stripePriceIdMonthly: input.stripePriceIdMonthly || null,
          stripePriceIdYearly: input.stripePriceIdYearly || null,
          stripeProductId: input.stripeProductId || null,
          trialDays: input.trialDays,
          features: input.features as Record<string, boolean>,
          maxFamilyMembers: input.maxFamilyMembers ?? null,
          maxStorageGB: input.maxStorageGB ?? null,
          maxMediaLibraryItems: input.maxMediaLibraryItems ?? null,
          displayOrder: input.displayOrder,
          internalNotes: input.internalNotes || null,
          isActive: true,
        };

        const result = await ctx.db
          .insert(subscriptionTiers)
          .values(tierData)
          .returning();
        
        const createdPlan = result[0];

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'plan_created',
          actorId: ctx.user.id,
          targetId: createdPlan.id,
          targetType: 'subscription_tier',
          description: `Created plan: ${createdPlan.name}`,
        });

        return createdPlan;
      } catch (error) {
        console.error('Error creating plan:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create plan'
        );
      }
    }),

  /**
   * Admin: Update an existing subscription plan
   */
  updatePlan: procedure
    .input(updatePlanSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Check if user is admin
        const adminRole = (ctx as any).userRole || 'user';
        if (adminRole !== 'admin') {
          throw new Error('Only admins can update plans');
        }

        // Check if plan exists
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (!existing) {
          throw new Error('Plan not found');
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.priceMonthly !== undefined) updateData.priceMonthly = input.priceMonthly;
        if (input.priceYearly !== undefined) updateData.priceYearly = input.priceYearly;
        if (input.stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = input.stripePriceIdMonthly;
        if (input.stripePriceIdYearly !== undefined) updateData.stripePriceIdYearly = input.stripePriceIdYearly;
        if (input.features !== undefined) updateData.features = input.features;
        if (input.maxFamilyMembers !== undefined) updateData.maxFamilyMembers = input.maxFamilyMembers;
        if (input.maxStorageGB !== undefined) updateData.maxStorageGB = input.maxStorageGB;
        if (input.maxMediaLibraryItems !== undefined) updateData.maxMediaLibraryItems = input.maxMediaLibraryItems;
        if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
        if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        const [updated] = await ctx.db
          .update(subscriptionTiers)
          .set(updateData)
          .where(eq(subscriptionTiers.id, input.id))
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'plan_updated',
          actorId: ctx.user.id,
          targetId: updated.id,
          targetType: 'subscription_tier',
          description: `Updated plan: ${updated.name}`,
        });

        return updated;
      } catch (error) {
        console.error('Error updating plan:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to update plan'
        );
      }
    }),

  /**
   * Admin: Get a specific plan by ID
   */
  getPlan: procedure
    .input(getPlanSchema)
    .query(async ({ ctx, input }) => {
      try {
        const [plan] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (!plan) {
          throw new Error('Plan not found');
        }

        return plan;
      } catch (error) {
        console.error('Error fetching plan:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch plan'
        );
      }
    }),

  /**
   * Admin: Get plan by tier ID (alias for getPlan)
   */
  getPlanByTierId: procedure
    .input(z.object({ tierId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const [plan] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.tierId))
          .limit(1);

        if (!plan) {
          throw new Error('Plan not found');
        }

        return plan;
      } catch (error) {
        console.error('Error fetching plan by tier ID:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch plan'
        );
      }
    }),

  /**
   * Admin: Delete a subscription plan (soft delete)
   */
  deletePlan: procedure
    .input(deletePlanSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Check if user is admin
        const adminRole = (ctx as any).userRole || 'user';
        if (adminRole !== 'admin') {
          throw new Error('Only admins can delete plans');
        }

        // Check if plan exists
        const [existing] = await ctx.db
          .select()
          .from(subscriptionTiers)
          .where(eq(subscriptionTiers.id, input.id))
          .limit(1);

        if (!existing) {
          throw new Error('Plan not found');
        }

        // Soft delete the plan
        const [deleted] = await ctx.db
          .update(subscriptionTiers)
          .set({
            isDeleted: true,
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionTiers.id, input.id))
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'plan_deleted',
          actorId: ctx.user.id,
          targetId: deleted.id,
          targetType: 'subscription_tier',
          description: `Deleted plan: ${deleted.name}`,
        });

        return deleted;
      } catch (error) {
        console.error('Error deleting plan:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to delete plan'
        );
      }
    }),

  /**
   * Create invoice for a subscription
   */
  createInvoice: procedure
    .input(
      z.object({
        subscriptionId: z.string().min(1, 'Subscription ID required'),
        amount: z.number().int().min(0, 'Amount must be non-negative'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Verify user owns the subscription
        const subscription = await ctx.db.query.subscriptions.findFirst({
          where: eq(subscriptions.id, input.subscriptionId),
        });

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        if (subscription.userId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }

        // Create invoice
        const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const [newInvoice] = await ctx.db
          .insert(invoices)
          .values({
            id: invoiceId,
            userId: ctx.user.id,
            stripeInvoiceId: null,
            amount: input.amount,
            currency: 'USD',
            status: 'paid',
            issuedAt: new Date(),
            dueAt: null,
            paidAt: new Date(),
            description: input.description || 'Invoice',
            itemsMetadata: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'invoice_created',
          actorId: ctx.user.id,
          targetId: invoiceId,
          targetType: 'invoice',
          description: `Created invoice for subscription ${input.subscriptionId}`,
        });

        return newInvoice;
      } catch (error) {
        console.error('Error creating invoice:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create invoice'
        );
      }
    }),

  /**
   * Send confirmation email after tier selection/upgrade
   */
  sendConfirmationEmail: procedure
    .input(
      z.object({
        tierId: z.string().min(1, 'Tier ID required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Get tier details
        const tier = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, input.tierId),
        });

        if (!tier) {
          throw new Error('Tier not found');
        }

        // Get user details
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        });

        if (!user?.email) {
          throw new Error('User email not found');
        }

        // Send confirmation email
        const { EmailService } = await import('~/server/services/email.service');

        const userName = user.firstName || user.lastName
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : 'Valued Member';

        const emailData = {
          email: user.email,
          userName,
          tierName: tier.name,
          amount: tier.priceMonthly ?? undefined,
          features: Object.entries(tier.features || {})
            .filter(([_, enabled]) => enabled)
            .map(([feature]) => feature),
          billingInterval: 'monthly' as const,
        };

        const result = await EmailService.sendSubscriptionCreatedEmail(
          emailData,
          ctx.user.id
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to send email');
        }

        // Log audit
        await ctx.db.insert(auditLog).values({
          actionType: 'confirmation_email_sent',
          actorId: ctx.user.id,
          targetId: input.tierId,
          targetType: 'tier',
          description: `Sent confirmation email for tier: ${tier.name}`,
        });

        return { success: true, message: 'Confirmation email sent' };
      } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to send confirmation email'
        );
      }
    }),
});
