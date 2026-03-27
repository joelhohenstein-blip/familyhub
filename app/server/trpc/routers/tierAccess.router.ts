import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "~/db/index.server";
import { subscriptions } from "~/db/schema";
import { eq } from "drizzle-orm";
import { tierFeatures } from "~/utils/tierFeatures";

export const tierAccessRouter = router({
  getCurrentTier: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
    });

    return {
      tier: subscription?.tier || "free",
      status: subscription?.status || "none",
    };
  }),

  canAccessFeature: protectedProcedure
    .input(
      z.object({
        featureName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ctx.user.id),
      });

      const userTier = subscription?.tier || "free";
      const canAccess = tierFeatures.canUserAccessFeature(
        userTier,
        input.featureName
      );

      // Log access decision for audit trail
      if (!canAccess) {
        console.log(
          `[AUDIT] User ${ctx.user.id} denied access to ${input.featureName} - tier: ${userTier}`
        );
      }

      return {
        allowed: canAccess,
        currentTier: userTier,
        requiredTier: tierFeatures.getFeatureRequiredTier(input.featureName),
      };
    }),

  listAvailableFeatures: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
    });

    const userTier = subscription?.tier || "free";
    const features = tierFeatures.getFeaturesByTier(userTier);

    return {
      currentTier: userTier,
      features,
      allFeatures: tierFeatures.getAllFeatures(),
    };
  }),

  getFeatureList: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
    });

    const userTier = subscription?.tier || "free";

    return {
      tier: userTier,
      freeFeatures: tierFeatures.getFeaturesByTier("free"),
      premiumFeatures: tierFeatures.getFeaturesByTier("premium"),
      userHasAccess: (featureName: string) =>
        tierFeatures.canUserAccessFeature(userTier, featureName),
    };
  }),
});
