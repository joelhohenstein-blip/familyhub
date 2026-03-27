import { z } from 'zod';
import { router, procedure } from '../trpc';
import { subscriptions, subscriptionTiers } from '~/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const subscriptionSyncRouter = router({
  /**
   * Manually sync subscription status with Stripe
   * Useful for handling edge cases and ensuring eventual consistency
   */
  syncWithStripe: procedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User must be authenticated');
    }

    try {
      // Get user's subscription from database
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!subscription || !subscription.stripeSubscriptionId) {
        return {
          success: false,
          message: 'No Stripe subscription found',
        };
      }

      // Fetch current subscription status from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Determine tier from Stripe metadata or product
      let tier = 'free';
      if (stripeSubscription.items.data.length > 0) {
        const item = stripeSubscription.items.data[0];
        const product = await stripe.products.retrieve(
          item.price.product as string
        );
        tier = (product.metadata?.tier as string) || 'premium';
      }

      // Get tier data to verify it exists
      const [tierData] = await ctx.db
        .select()
        .from(subscriptionTiers)
        .where(eq(subscriptionTiers.id, tier))
        .limit(1);

      if (!tierData) {
        return {
          success: false,
          message: `Tier '${tier}' not configured`,
        };
      }

      // Update local subscription record
      const [updated] = await ctx.db
        .update(subscriptions)
        .set({
          tier: tier as any,
          status: stripeSubscription.status as any,
          currentPeriodStart: new Date(
            (stripeSubscription as any).current_period_start * 1000
          ),
          currentPeriodEnd: new Date(
            (stripeSubscription as any).current_period_end * 1000
          ),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id))
        .returning();

      return {
        success: true,
        message: 'Subscription synced successfully',
        subscription: updated,
      };
    } catch (error) {
      console.error('Error syncing subscription with Stripe:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to sync subscription',
      };
    }
  }),

  /**
   * Get current subscription status
   */
  getStatus: procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User must be authenticated');
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
          createdAt: new Date(),
        };
      }

      // Get tier details
      const [tier] = await ctx.db
        .select()
        .from(subscriptionTiers)
        .where(eq(subscriptionTiers.id, subscription.tier))
        .limit(1);

      return {
        ...subscription,
        tierDetails: tier,
      };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to fetch subscription status'
      );
    }
  }),

  /**
   * Check if subscription is active and can access premium features
   */
  canAccessPremium: procedure.query(async ({ ctx }) => {
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
        return false;
      }

      // Can access if tier is premium and status is active
      const isPremium = subscription.tier !== 'free' && subscription.tier !== null;
      const isActive = subscription.status === 'active';

      return isPremium && isActive;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }),

  /**
   * Check if subscription payment is overdue
   */
  isPaymentOverdue: procedure.query(async ({ ctx }) => {
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
        return false;
      }

      return subscription.status === 'past_due';
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }),

  /**
   * Get subscription sync history (for debugging)
   */
  getSyncHistory: procedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // In a real implementation, you would query a sync_history table
        // For now, just return basic info
        const [subscription] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        if (!subscription) {
          return [];
        }

        return [
          {
            timestamp: subscription.updatedAt,
            action: 'subscription_updated',
            details: {
              status: subscription.status,
              tier: subscription.tier,
              currentPeriodEnd: subscription.currentPeriodEnd,
            },
          },
        ];
      } catch (error) {
        console.error('Error fetching sync history:', error);
        throw new Error('Failed to fetch sync history');
      }
    }),
});
