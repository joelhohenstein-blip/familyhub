import type { LoaderFunctionArgs } from "react-router";
import Stripe from "stripe";
import { db } from "~/db/index.server";
import { subscriptions, users, subscriptionTiers } from "~/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { EmailService, type SubscriptionEmailData } from "~/server/services/email.service";
import { WebhookDedupService } from "~/server/services/webhook-dedup.service";
import { InvoiceService } from "~/server/services/invoice.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const resend = new Resend(process.env.RESEND_API_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Process webhook event asynchronously to avoid blocking the response
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    // Check for duplicate processing
    const isProcessed = await WebhookDedupService.isProcessed(event.id);
    if (isProcessed) {
      console.log(`Webhook already processed: ${event.id}`);
      return;
    }

    // Mark as pending
    await WebhookDedupService.markPending(event.id);

    const eventType = event.type;
    let userId: string | undefined;

    try {
      if (eventType === "invoice.payment_succeeded") {
        await handlePaymentSucceeded(event);
      } else if (eventType === "customer.subscription.updated") {
        await handleSubscriptionUpdated(event);
      } else if (eventType === "customer.subscription.created") {
        await handleSubscriptionCreated(event);
      } else if (eventType === "invoice.payment_failed") {
        await handlePaymentFailed(event);
      } else if (eventType === "customer.subscription.deleted") {
        await handleSubscriptionDeleted(event);
      }

      // Mark as processed - get user ID from event if available
      const subscription = (event.data.object as any).subscription;
      if (subscription && typeof subscription === "string") {
        const stripeSubscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subscription),
        });
        userId = stripeSubscription?.userId;
      }

      await WebhookDedupService.markProcessed(event.id, userId);
    } catch (error) {
      console.error(`Error processing event ${eventType}:`, error);
      await WebhookDedupService.markFailed(
        event.id,
        error instanceof Error ? error.message : String(error),
        userId
      );
      throw error;
    }
  } catch (error) {
    console.error("Unexpected error in processWebhookEvent:", error);
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as any as Stripe.Invoice;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    console.log("No subscription ID in invoice");
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    console.log("No user ID in subscription metadata");
    return;
  }

  // Create invoice record
  await InvoiceService.createInvoiceFromStripeEvent(
    invoice.id,
    invoice,
    userId
  );

  // Update subscription in database
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(
          (stripeSubscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          (stripeSubscription as any).current_period_end * 1000
        ),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));
  }

  // Send renewal email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.email) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
    });

    if (subscription) {
      const tier = await db.query.subscriptionTiers.findFirst({
        where: eq(subscriptionTiers.id, subscription.tier),
      });

      if (tier) {
        const isYearly =
          subscription.currentPeriodEnd &&
          subscription.currentPeriodStart &&
          (subscription.currentPeriodEnd.getTime() -
            subscription.currentPeriodStart.getTime()) /
            (1000 * 60 * 60 * 24) >
            180;

        const userName = user.firstName || user.lastName
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "Valued Member";

        const emailData: SubscriptionEmailData = {
          email: user.email,
          userName,
          tierName: tier.name,
          amount: isYearly ? tier.priceYearly ?? undefined : tier.priceMonthly ?? undefined,
          nextBillingDate: subscription.currentPeriodEnd || undefined,
          billingInterval: isYearly ? "yearly" : "monthly",
        };

        await EmailService.sendSubscriptionRenewalEmail(emailData, userId).catch(
          (error) => {
            console.error("Failed to send renewal email:", error);
          }
        );
      }
    }
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log("No user ID in subscription metadata");
    return;
  }

  // Determine tier based on Stripe metadata or product
  let tier = "free";
  if (subscription.items.data.length > 0) {
    const item = subscription.items.data[0];
    const product = await stripe.products.retrieve(item.price.product as string);
    tier = (product.metadata?.tier as string) || "pro";
  }

  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  });

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        tier: tier as any,
        status: subscription.status as any,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));
  } else {
    const newId = `sub_${Date.now()}`;
    await db.insert(subscriptions).values({
      id: newId,
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      tier: tier as any,
      status: subscription.status as any,
      currentPeriodStart: new Date(
        (subscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    });
  }

  // Update user's subscriptionId
  await db
    .update(users)
    .set({
      subscriptionId: existingSub?.id || `sub_${Date.now()}`,
    })
    .where(eq(users.id, userId));

  // Send subscription update email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.email) {
    const updatedSub =
      existingSub ||
      (await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, subscription.id),
      }));

    if (updatedSub) {
      const tierData = await db.query.subscriptionTiers.findFirst({
        where: eq(subscriptionTiers.id, updatedSub.tier),
      });

      if (tierData) {
        const isYearly =
          updatedSub.currentPeriodEnd &&
          updatedSub.currentPeriodStart &&
          (updatedSub.currentPeriodEnd.getTime() -
            updatedSub.currentPeriodStart.getTime()) /
            (1000 * 60 * 60 * 24) >
            180;

        const userName = user.firstName || user.lastName
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "Valued Member";

        const emailData: SubscriptionEmailData = {
          email: user.email,
          userName,
          tierName: tierData.name,
          amount: isYearly
            ? tierData.priceYearly ?? undefined
            : tierData.priceMonthly ?? undefined,
          nextBillingDate: updatedSub.currentPeriodEnd || undefined,
          billingInterval: isYearly ? "yearly" : "monthly",
        };

        await EmailService.sendSubscriptionRenewalEmail(emailData, userId).catch(
          (error) => {
            console.error("Failed to send subscription update email:", error);
          }
        );
      }
    }
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log("No user ID in subscription metadata");
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.email) {
    return;
  }

  let tier = "free";
  if (subscription.items.data.length > 0) {
    const item = subscription.items.data[0];
    const product = await stripe.products.retrieve(item.price.product as string);
    tier = (product.metadata?.tier as string) || "pro";
  }

  const tierData = await db.query.subscriptionTiers.findFirst({
    where: eq(subscriptionTiers.id, tier),
  });

  if (tierData) {
    const isYearly =
      (subscription as any).current_period_end &&
      (subscription as any).current_period_start &&
      ((subscription as any).current_period_end -
        (subscription as any).current_period_start) /
        (24 * 60 * 60) >
        180;

    const userName = user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Valued Member";

    const emailData: SubscriptionEmailData = {
      email: user.email,
      userName,
      tierName: tierData.name,
      amount: isYearly ? tierData.priceYearly ?? undefined : tierData.priceMonthly ?? undefined,
      nextBillingDate: new Date((subscription as any).current_period_end * 1000),
      features: Object.entries(tierData.features || {})
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      billingInterval: isYearly ? "yearly" : "monthly",
    };

    await EmailService.sendSubscriptionCreatedEmail(emailData, userId).catch(
      (error) => {
        console.error("Failed to send subscription created email:", error);
      }
    );
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    console.log("No subscription ID in failed invoice");
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    console.log("No user ID in subscription metadata");
    return;
  }

  // Update subscription to past_due status
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));
  }

  // Send payment failure notification email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.email) {
    const userName = user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Valued Member";

    // Send email to notify user of failed payment
    await resend.emails
      .send({
        from: "noreply@familyhub.com",
        to: user.email,
        subject: "Payment Failed - Action Required",
        html: `<h1>Payment Failed</h1><p>Hi ${userName},</p><p>We were unable to process your payment. Please update your payment method to continue your subscription.</p>`,
      })
      .catch((error) => {
        console.error("Failed to send payment failure email:", error);
      });
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log("No user ID in subscription metadata");
    return;
  }

  // Update subscription status to cancelled
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  });

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));
  }

  // Send cancellation email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.email && existingSub) {
    const tierData = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, existingSub.tier),
    });

    if (tierData) {
      const userName = user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : "Valued Member";

      const emailData: SubscriptionEmailData = {
        email: user.email,
        userName,
        tierName: tierData.name,
      };

      await EmailService.sendSubscriptionCancelledEmail(emailData, userId).catch(
        (error) => {
          console.error("Failed to send cancellation email:", error);
        }
      );
    }
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return new Response("Invalid signature", { status: 400 });
    }

    // Process event asynchronously to ensure we respond within 2 seconds
    // Fire and forget - don't await
    processWebhookEvent(event).catch((error) => {
      console.error("Error in async webhook processing:", error);
    });

    // Return immediately within 2 seconds requirement
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
