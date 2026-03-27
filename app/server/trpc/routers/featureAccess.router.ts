import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  subscriptions,
  subscriptionTiers,
  auditLog,
  featureFlags,
} from '~/db/schema';
import { eq } from 'drizzle-orm';

const checkAccessSchema = z.object({
  feature: z.string().min(1, 'Feature name required'),
});

const checkTierAccessSchema = z.object({
  requiredTier: z.string().min(1, 'Required tier ID required'),
});

const getDeniedFeatureMessageSchema = z.object({
  feature: z.string().min(1, 'Feature name required'),
  currentTier: z.string().optional(),
});

const getAccessibilitySchema = z.object({
  features: z.array(z.string()).optional(),
});

const upgradePromptSchema = z.object({
  feature: z.string(),
  tier: z.string().optional(),
});

export const featureAccessRouter = router({
  /**
   * Check if user has access to a specific tier
   * Used for tier-based access control
   */
  checkTierAccess: procedure
    .input(checkTierAccessSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return {
          hasAccess: false,
          requiresAuth: true,
          reason: 'User not authenticated',
        };
      }

      try {
        // Get user's subscription
        const subscription = await ctx.db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, ctx.user.id),
        });

        // Get user's current tier
        let currentTier = 'free';
        if (subscription) {
          currentTier = subscription.tier;
        }

        // Get the required tier details
        const requiredTierData = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, input.requiredTier),
        });

        if (!requiredTierData) {
          return {
            hasAccess: false,
            reason: 'Required tier not found',
          };
        }

        // Get user's tier details
        const currentTierData = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, currentTier),
        });

        // Compare tiers by display order
        const currentTierOrder = currentTierData?.displayOrder || 0;
        const requiredTierOrder = requiredTierData.displayOrder || 0;

        const hasAccess = currentTierOrder >= requiredTierOrder;

        // Log audit for denied access
        if (!hasAccess) {
          await ctx.db.insert(auditLog).values({
            actionType: 'tier_access_denied',
            actorId: ctx.user.id,
            targetType: 'tier',
            description: `User attempted to access tier ${input.requiredTier}. Current tier: ${currentTier}`,
          });
        }

        return {
          hasAccess,
          currentTier,
          requiredTier: input.requiredTier,
          reason: hasAccess ? 'Tier access granted' : 'Current tier does not include this feature',
        };
      } catch (error) {
        console.error('Error checking tier access:', error);
        throw new Error('Failed to check tier access');
      }
    }),

  /**
   * Get a user-friendly message explaining why access was denied
   */
  getDeniedFeatureMessage: procedure
    .input(getDeniedFeatureMessageSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Get user's current tier
        let currentTier = 'free';
        if (ctx.user?.id) {
          const subscription = await ctx.db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, ctx.user.id),
          });
          if (subscription) {
            currentTier = subscription.tier;
          }
        }

        // Use provided tier or detected tier
        const userTier = input.currentTier || currentTier;

        // Find the lowest tier that has this feature
        const tiers = await ctx.db.query.subscriptionTiers.findMany({
          where: eq(subscriptionTiers.isActive, true),
          orderBy: (t) => t.displayOrder,
        });

        const tierWithFeature = tiers.find((t) => t.features?.[input.feature]);

        if (!tierWithFeature) {
          return {
            message: `The feature "${input.feature}" is not available in any plan.`,
            feature: input.feature,
            currentTier: userTier,
            suggestedTier: null,
          };
        }

        const currentTierData = tiers.find((t) => t.id === userTier);

        return {
          message: `The feature "${input.feature}" is not included in your ${currentTierData?.name || 'current'} plan. Upgrade to ${tierWithFeature.name} to access this feature.`,
          feature: input.feature,
          currentTier: userTier,
          suggestedTier: {
            id: tierWithFeature.id,
            name: tierWithFeature.name,
            priceMonthly: tierWithFeature.priceMonthly,
            priceYearly: tierWithFeature.priceYearly,
          },
        };
      } catch (error) {
        console.error('Error getting denied feature message:', error);
        return {
          message: `You don't have access to the feature "${input.feature}". Please upgrade your plan.`,
          feature: input.feature,
          currentTier: input.currentTier || 'free',
          suggestedTier: null,
        };
      }
    }),

  /**
   * Check if current user has access to a feature
   * Returns boolean for simple gate, or detailed access info
   */
  checkAccess: procedure
    .input(checkAccessSchema)
    .query(async ({ ctx, input }) => {
      // Guest access check
      if (!ctx.user?.id) {
        // Check if feature is public
        const [feature] = await ctx.db
          .select()
          .from(featureFlags)
          .where(eq(featureFlags.featureName, input.feature))
          .limit(1);

        return {
          hasAccess: false,
          requiresAuth: true,
          feature: input.feature,
          reason: 'User not authenticated',
        };
      }

      try {
        // Get user's subscription
        const [subscription] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        // Get tier details
        let tier = subscription
          ? await ctx.db.query.subscriptionTiers.findFirst({
              where: eq(subscriptionTiers.id, subscription.tier),
            })
          : null;

        // Default to free tier if no subscription
        if (!tier) {
          tier = await ctx.db.query.subscriptionTiers.findFirst({
            where: eq(subscriptionTiers.id, 'free'),
          });
        }

        if (!tier) {
          return {
            hasAccess: false,
            requiresAuth: false,
            feature: input.feature,
            reason: 'No valid subscription tier found',
          };
        }

        // Check entitlements in order of precedence
        const hasAccessFromSubscription = subscription?.entitlements?.[input.feature] ?? false;
        const hasAccessFromTier = tier.features?.[input.feature] ?? false;

        const hasAccess = hasAccessFromSubscription || hasAccessFromTier;

        // If no access, suggest upgrade tier
        let suggestedTier = null;
        if (!hasAccess) {
          // Find the lowest tier that has this feature
          const tiers = await ctx.db
            .selectDistinct()
            .from(subscriptionTiers)
            .orderBy((t) => t.displayOrder);

          suggestedTier = tiers.find((t) => t.features?.[input.feature]);
        }

        // Log audit trail for denied access
        if (!hasAccess) {
          await ctx.db.insert(auditLog).values({
            actionType: 'feature_access_denied',
            actorId: ctx.user.id,
            targetType: 'feature',
            description: `Denied access to ${input.feature}. Current tier: ${subscription?.tier || 'free'}`,
          });
        }

        return {
          hasAccess,
          feature: input.feature,
          currentTier: subscription?.tier || 'free',
          suggestedTier: suggestedTier?.id || null,
          reason: hasAccess ? 'Allowed' : 'Feature not in current tier',
        };
      } catch (error) {
        console.error('Error checking access:', error);
        throw new Error('Failed to check feature access');
      }
    }),

  /**
   * Get accessibility report for a set of features
   * Useful for rendering feature comparison tables
   */
  getAccessibility: procedure
    .input(getAccessibilitySchema)
    .query(async ({ ctx, input }) => {
      try {
        // Default to checking all features if none specified
        let features = input.features;
        if (!features || features.length === 0) {
          const allFeatures = await ctx.db.select().from(featureFlags);
          features = allFeatures.map((f) => f.featureName);
        }

        // Get user's tier
        let userTier = 'free';
        let userEntitlements: Record<string, boolean> = {};

        if (ctx.user?.id) {
          const [subscription] = await ctx.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, ctx.user.id))
            .limit(1);

          if (subscription) {
            userTier = subscription.tier;
            userEntitlements = subscription.entitlements || {};
          }
        }

        // Get all tiers
        const tiers = await ctx.db.query.subscriptionTiers.findMany({
          where: eq(subscriptionTiers.isActive, true),
          orderBy: (t) => t.displayOrder,
        });

        // Build accessibility matrix
        const accessibility: Record<
          string,
          {
            tiers: Record<string, boolean>;
            userHasAccess: boolean;
          }
        > = {};

        for (const feature of features) {
          const tierAccess: Record<string, boolean> = {};
          for (const tier of tiers) {
            tierAccess[tier.id] = tier.features?.[feature] ?? false;
          }

          // Check if user has access
          const userHasAccess =
            userEntitlements[feature] ||
            (tiers.find((t) => t.id === userTier)?.features?.[feature] ?? false);

          accessibility[feature] = {
            tiers: tierAccess,
            userHasAccess,
          };
        }

        return {
          userTier,
          accessibility,
          tiers: tiers.map((t) => ({
            id: t.id,
            name: t.name,
            priceMonthly: t.priceMonthly,
          })),
        };
      } catch (error) {
        console.error('Error getting accessibility:', error);
        throw new Error('Failed to get accessibility information');
      }
    }),

  /**
   * Get details for upgrade prompt
   * Returns information about what tier would grant access
   */
  getUpgradeInfo: procedure
    .input(upgradePromptSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Find tier that has the feature (or use specified tier)
        let targetTier = null;

        if (input.tier) {
          targetTier = await ctx.db.query.subscriptionTiers.findFirst({
            where: eq(subscriptionTiers.id, input.tier),
          });
        } else {
          // Find the lowest tier with this feature
          const tiers = await ctx.db.query.subscriptionTiers.findMany({
            where: eq(subscriptionTiers.isActive, true),
            orderBy: (t) => t.displayOrder,
          });
          targetTier = tiers.find((t) => t.features?.[input.feature]);
        }

        if (!targetTier) {
          throw new Error('Feature not available in any tier');
        }

        // Get current user tier
        let currentTier = 'free';
        if (ctx.user?.id) {
          const [subscription] = await ctx.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, ctx.user.id))
            .limit(1);
          if (subscription) currentTier = subscription.tier;
        }

        return {
          feature: input.feature,
          currentTier,
          targetTier: {
            id: targetTier.id,
            name: targetTier.name,
            description: targetTier.description,
            priceMonthly: targetTier.priceMonthly,
            priceYearly: targetTier.priceYearly,
          },
          canDowngrade: false, // Downgrade policies handled separately
          canUpgrade: currentTier !== targetTier.id,
        };
      } catch (error) {
        console.error('Error getting upgrade info:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get upgrade information'
        );
      }
    }),

  /**
   * Log attempted access to restricted feature
   * Used to track user behavior and understand feature demand
   */
  logAttemptedAccess: procedure
    .input(
      z.object({
        feature: z.string(),
        from: z.string().optional(), // Where the user was coming from (page, component)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { logged: false };
      }

      try {
        await ctx.db.insert(auditLog).values({
          actionType: 'feature_access_attempted',
          actorId: ctx.user.id,
          targetType: 'feature',
          description: `Attempted access to ${input.feature}${
            input.from ? ` from ${input.from}` : ''
          }`,
        });

        return { logged: true };
      } catch (error) {
        console.error('Error logging access attempt:', error);
        return { logged: false };
      }
    }),

  /**
   * Get feature request/feedback
   * Users can request features they need
   */
  requestFeature: procedure
    .input(
      z.object({
        feature: z.string(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Log as feature request
        await ctx.db.insert(auditLog).values({
          actionType: 'feature_requested',
          actorId: ctx.user.id,
          targetType: 'feature',
          description: `Requested feature: ${input.feature}${
            input.message ? ` - ${input.message}` : ''
          }`,
        });

        // In a real app, this might trigger notifications to admins
        // or create a feature request ticket in a system like Linear

        return { success: true, message: 'Feature request received' };
      } catch (error) {
        console.error('Error requesting feature:', error);
        throw new Error('Failed to submit feature request');
      }
    }),

  /**
   * List all available features and their tier distribution
   * Useful for admin dashboards
   */
  listAllFeatures: procedure.query(async ({ ctx }) => {
    try {
      const features = await ctx.db.query.featureFlags.findMany({
        where: eq(featureFlags.enabled, true),
        orderBy: (f) => f.featureName,
      });

      const tiers = await ctx.db.query.subscriptionTiers.findMany({
        where: eq(subscriptionTiers.isActive, true),
        orderBy: (t) => t.displayOrder,
      });

      // Build matrix
      const featureMatrix = features.map((feature) => ({
        name: feature.featureName,
        description: feature.description,
        tiers: tiers.map((tier) => ({
          tier: tier.id,
          included: tier.features?.[feature.featureName] ?? false,
        })),
      }));

      return {
        features: featureMatrix,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name,
          displayOrder: t.displayOrder,
        })),
      };
    } catch (error) {
      console.error('Error listing features:', error);
      throw new Error('Failed to list features');
    }
  }),
});
