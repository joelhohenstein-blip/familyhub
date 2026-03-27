import { TRPCError } from "@trpc/server";
import { db } from "~/db/index.server";
import { subscriptions } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function tierCheckMiddleware(
  userId: string,
  requiredTier: "free" | "premium" = "free"
) {
  if (requiredTier === "free") {
    // All authenticated users have at least free tier
    return true;
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  const userTier = subscription?.tier || "free";

  if (requiredTier === "premium" && userTier !== "premium") {
    console.log(
      `[AUDIT] User ${userId} denied premium access - tier: ${userTier}`
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Premium subscription required for this feature",
    });
  }

  return true;
}

export function createTierCheckMiddleware(requiredTier: "free" | "premium") {
  return async (userId: string) => {
    return tierCheckMiddleware(userId, requiredTier);
  };
}
