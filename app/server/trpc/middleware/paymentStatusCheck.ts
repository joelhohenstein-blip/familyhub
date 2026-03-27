import { TRPCError } from "@trpc/server";
import { db } from "~/db/index.server";
import { subscriptions } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function paymentStatusCheckMiddleware(userId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription) {
    // No subscription record - user on free tier
    return true;
  }

  // Check if subscription is active
  if (subscription.status === "active") {
    return true;
  }

  // If past_due, log and allow access with warning
  if (subscription.status === "past_due") {
    console.log(
      `[AUDIT] User ${userId} accessing features with past_due subscription`
    );
    return true; // Allow access but payment is overdue
  }

  // If cancelled or suspended, deny access
  if (
    subscription.status === "cancelled" ||
    subscription.status === "suspended"
  ) {
    console.log(
      `[AUDIT] User ${userId} denied access - subscription status: ${subscription.status}`
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your subscription is ${subscription.status}. Please renew or contact support.`,
    });
  }

  // Default allow for any other status
  return true;
}

export function createPaymentStatusCheckMiddleware() {
  return async (userId: string) => {
    return paymentStatusCheckMiddleware(userId);
  };
}
