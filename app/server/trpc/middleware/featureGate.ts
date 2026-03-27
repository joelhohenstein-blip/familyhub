import { TRPCError } from '@trpc/server';
import { subscriptions, subscriptionTiers } from '~/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Feature gate middleware for tRPC procedures
 * Usage: procedure.use(requireFeature('feature_name')).query/mutation(...)
 *
 * This middleware:
 * - Checks if user is authenticated
 * - Verifies user has access to the requested feature
 * - Throws FORBIDDEN error if access denied
 * - Logs access attempts for auditing
 */

export function requireFeature(featureName: string) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access this feature',
      });
    }

    try {
      // Get user's subscription
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      // Get subscription tier
      let tier = subscription
        ? await ctx.db.query.subscriptionTiers.findFirst({
            where: eq(subscriptionTiers.id, subscription.tier),
          })
        : null;

      // Fallback to free tier
      if (!tier) {
        tier = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, 'free'),
        });
      }

      if (!tier) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to determine user tier',
        });
      }

      // Check feature access
      const hasAccess =
        subscription?.entitlements?.[featureName] ||
        tier.features?.[featureName];

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Feature "${featureName}" is not available in your current plan`,
          cause: {
            feature: featureName,
            currentTier: subscription?.tier || 'free',
            reason: 'FEATURE_NOT_INCLUDED',
          },
        });
      }

      // Attach feature info to context for logging
      ctx.featureAccess = {
        feature: featureName,
        tier: subscription?.tier || 'free',
        granted: true,
      };

      return next({ ctx });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error in feature gate middleware:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify feature access',
      });
    }
  };
}

/**
 * Check multiple features (user needs at least one)
 */
export function requireAnyFeature(featureNames: string[]) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    try {
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      let tier = subscription
        ? await ctx.db.query.subscriptionTiers.findFirst({
            where: eq(subscriptionTiers.id, subscription.tier),
          })
        : null;

      if (!tier) {
        tier = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, 'free'),
        });
      }

      const hasAccess = featureNames.some(
        (feature) =>
          subscription?.entitlements?.[feature] || tier?.features?.[feature]
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This action requires one of these features: ${featureNames.join(
            ', '
          )}`,
        });
      }

      ctx.featureAccess = {
        features: featureNames,
        tier: subscription?.tier || 'free',
        granted: true,
      };

      return next({ ctx });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify feature access',
      });
    }
  };
}

/**
 * Check all features (user needs all of them)
 */
export function requireAllFeatures(featureNames: string[]) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    try {
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      let tier = subscription
        ? await ctx.db.query.subscriptionTiers.findFirst({
            where: eq(subscriptionTiers.id, subscription.tier),
          })
        : null;

      if (!tier) {
        tier = await ctx.db.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, 'free'),
        });
      }

      const hasAccess = featureNames.every(
        (feature) =>
          subscription?.entitlements?.[feature] || tier?.features?.[feature]
      );

      if (!hasAccess) {
        const missingFeatures = featureNames.filter(
          (f) =>
            !subscription?.entitlements?.[f] && !tier?.features?.[f]
        );

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This action requires these features: ${missingFeatures.join(
            ', '
          )}`,
        });
      }

      ctx.featureAccess = {
        features: featureNames,
        tier: subscription?.tier || 'free',
        granted: true,
      };

      return next({ ctx });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify feature access',
      });
    }
  };
}

/**
 * Check tier-based access (user must be on specific tier or higher)
 */
export function requireTier(minTierId: string) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    try {
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      const currentTier = subscription?.tier || 'free';

      // Get tier hierarchy
      const tiers = await ctx.db.query.subscriptionTiers.findMany({
        orderBy: (t: any) => t.displayOrder,
      });

      const tierIds = tiers.map((t: any) => t.id);
      const currentIndex = tierIds.indexOf(currentTier);
      const requiredIndex = tierIds.indexOf(minTierId);

      if (currentIndex < requiredIndex) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This feature requires the ${minTierId} plan or higher`,
          cause: {
            currentTier,
            requiredTier: minTierId,
            reason: 'TIER_NOT_MET',
          },
        });
      }

      ctx.featureAccess = {
        tier: currentTier,
        requiredTier: minTierId,
        granted: true,
      };

      return next({ ctx });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify tier access',
      });
    }
  };
}
