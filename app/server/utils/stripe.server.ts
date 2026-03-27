import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Initialize and return the Stripe instance
 */
export function initializeStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }

    stripeInstance = new Stripe(apiKey);
  }

  return stripeInstance;
}

/**
 * Get the Stripe instance
 */
export function getStripe(): Stripe {
  return initializeStripe();
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  });

  return session;
}

/**
 * Get the customer portal URL
 */
export async function getCustomerPortalURL(
  customerId: string,
  returnUrl: string
) {
  const stripe = getStripe();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return portalSession.url;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripe();

  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Create a new Stripe customer
 */
export async function createCustomer(email: string, metadata?: Record<string, string>) {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email,
    metadata,
  });

  return customer;
}

/**
 * Get subscription details
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  const stripe = getStripe();

  return stripe.subscriptions.retrieve(subscriptionId);
}
