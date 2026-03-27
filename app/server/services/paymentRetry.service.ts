import { db } from "~/db/index.server";
import { subscriptions } from "~/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

interface FailedPaymentRecord {
  invoiceId: string;
  userId: string;
  stripeInvoiceId: string;
  attemptCount: number;
  lastAttemptAt: Date;
  nextRetryAt: Date;
  error?: string;
}

/**
 * PaymentRetryService handles failed payment retries with exponential backoff
 */
export class PaymentRetryService {
  /**
   * Queue a failed payment for retry with exponential backoff
   */
  static async queueRetry(
    invoiceId: string,
    userId: string,
    stripeInvoiceId: string,
    error?: string
  ): Promise<FailedPaymentRecord> {
    const attemptCount = 1;
    const baseDelayMinutes = 5; // Start with 5 minutes
    const maxRetries = 3;

    // Calculate exponential backoff: 5 min, 1 hour, 24 hours
    const delayMultiplier = Math.pow(2, attemptCount - 1);
    const delayMinutes = baseDelayMinutes * delayMultiplier;
    const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    const record: FailedPaymentRecord = {
      invoiceId,
      userId,
      stripeInvoiceId,
      attemptCount,
      lastAttemptAt: new Date(),
      nextRetryAt,
      error,
    };

    console.log(
      `[PaymentRetry] Queued retry for invoice ${invoiceId} - attempt ${attemptCount} - next retry in ${delayMinutes} minutes`
    );

    return record;
  }

  /**
   * Retry a failed payment
   */
  static async retryPayment(stripeInvoiceId: string): Promise<boolean> {
    try {
      const invoice = await stripe.invoices.pay(stripeInvoiceId);

      if ((invoice as any).paid) {
        console.log(
          `[PaymentRetry] Successfully retried payment for invoice ${stripeInvoiceId}`
        );
        return true;
      }

      console.log(
        `[PaymentRetry] Payment retry failed for invoice ${stripeInvoiceId} - status: ${(invoice as any).status}`
      );
      return false;
    } catch (error) {
      console.error(
        `[PaymentRetry] Error retrying payment for invoice ${stripeInvoiceId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Process pending retries that are due
   */
  static async processPendingRetries(): Promise<{
    successful: number;
    failed: number;
  }> {
    const successful = 0;
    const failed = 0;

    console.log("[PaymentRetry] Processing pending retries...");

    // In a production system, you would:
    // 1. Query a failed_payments table for records where nextRetryAt <= now
    // 2. Attempt to retry each payment
    // 3. Update the database with the result
    // 4. Send notification emails to users

    return { successful, failed };
  }

  /**
   * Mark a payment as failed and increment retry count
   */
  static async markPaymentFailed(
    userId: string,
    stripeInvoiceId: string,
    error?: string
  ): Promise<void> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (subscription) {
      // In a real implementation, you would update a failed_payments table
      // and increment the failedPaymentAttempts counter
      await db
        .update(subscriptions)
        .set({
          failedPaymentAttempts: (subscription.failedPaymentAttempts || 0) + 1,
          lastPaymentError: error || "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      console.log(
        `[PaymentRetry] Marked payment as failed for user ${userId} - invoice: ${stripeInvoiceId}`
      );
    }
  }

  /**
   * Notify user of payment failure
   */
  static async notifyPaymentFailure(
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<void> {
    // In a real implementation, you would send an email via EmailService
    console.log(
      `[PaymentRetry] Would send payment failure notification to ${userEmail}`
    );
  }

  /**
   * Notify user of payment retry
   */
  static async notifyPaymentRetry(
    userId: string,
    userName: string,
    userEmail: string,
    nextRetryDate: Date
  ): Promise<void> {
    // In a real implementation, you would send an email via EmailService
    console.log(
      `[PaymentRetry] Would send payment retry notification to ${userEmail} - next retry: ${nextRetryDate.toISOString()}`
    );
  }

  /**
   * Cancel retry attempts for a subscription
   */
  static async cancelRetries(userId: string): Promise<void> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (subscription) {
      await db
        .update(subscriptions)
        .set({
          failedPaymentAttempts: 0,
          nextRetryAt: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      console.log(`[PaymentRetry] Cancelled retries for user ${userId}`);
    }
  }
}
