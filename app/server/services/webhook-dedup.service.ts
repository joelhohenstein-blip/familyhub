import { db } from '~/db/index.server';
import { webhookDedup, auditLog } from '~/db/schema';
import { eq } from 'drizzle-orm';

export interface WebhookDedup {
  stripeEventId: string;
  processedAt: Date;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

/**
 * WebhookDedupService handles webhook deduplication and idempotency
 * Prevents duplicate webhook processing by storing processed webhook IDs
 */
export class WebhookDedupService {
  private static readonly DEDUP_WINDOW_HOURS = 24; // Keep records for 24 hours

  /**
   * Check if a webhook has already been processed
   */
  static async isProcessed(stripeEventId: string): Promise<boolean> {
    try {
      const existing = await db.query.webhookDedup.findFirst({
        where: eq(webhookDedup.stripeEventId, stripeEventId),
      });

      return !!existing;
    } catch (error) {
      console.error('Error checking webhook dedup:', error);
      return false;
    }
  }

  /**
   * Mark a webhook as pending processing
   */
  static async markPending(stripeEventId: string): Promise<void> {
    try {
      // Check if already exists
      const existing = await db.query.webhookDedup.findFirst({
        where: eq(webhookDedup.stripeEventId, stripeEventId),
      });

      if (existing) {
        return;
      }

      await db.insert(webhookDedup).values({
        stripeEventId,
        status: 'pending',
        processedAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking webhook as pending:', error);
      throw error;
    }
  }

  /**
   * Mark a webhook as successfully processed
   */
  static async markProcessed(
    stripeEventId: string,
    userId?: string
  ): Promise<void> {
    try {
      await db
        .update(webhookDedup)
        .set({
          status: 'processed',
          processedAt: new Date(),
        })
        .where(eq(webhookDedup.stripeEventId, stripeEventId));

      // Log successful processing
      if (userId) {
        await db.insert(auditLog).values({
          actionType: 'webhook_processed',
          actorId: userId,
          targetId: stripeEventId,
          targetType: 'webhook',
          description: `Successfully processed webhook: ${stripeEventId}`,
        });
      }
    } catch (error) {
      console.error('Error marking webhook as processed:', error);
      throw error;
    }
  }

  /**
   * Mark a webhook as failed
   */
  static async markFailed(
    stripeEventId: string,
    error: string,
    userId?: string
  ): Promise<void> {
    try {
      await db
        .update(webhookDedup)
        .set({
          status: 'failed',
          error: error.substring(0, 500), // Truncate to 500 chars
          processedAt: new Date(),
        })
        .where(eq(webhookDedup.stripeEventId, stripeEventId));

      // Log failed processing
      if (userId) {
        await db.insert(auditLog).values({
          actionType: 'webhook_failed',
          actorId: userId,
          targetId: stripeEventId,
          targetType: 'webhook',
          description: `Failed to process webhook: ${error.substring(0, 200)}`,
        });
      }
    } catch (error) {
      console.error('Error marking webhook as failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old webhook records (older than 24 hours)
   * Run this periodically to keep the table clean
   */
  static async cleanupOldRecords(): Promise<number> {
    try {
      const cutoffTime = new Date(
        Date.now() - this.DEDUP_WINDOW_HOURS * 60 * 60 * 1000
      );

      // Delete old records using a comparison operator that works with Drizzle
      const { lt } = await import('drizzle-orm');
      await db
        .delete(webhookDedup)
        .where(lt(webhookDedup.processedAt, cutoffTime));

      return 0; // Drizzle returns count differently
    } catch (error) {
      console.error('Error cleaning up webhook records:', error);
      throw error;
    }
  }

  /**
   * Get dedup status for a webhook
   */
  static async getStatus(stripeEventId: string): Promise<any | null> {
    try {
      const result = await db.query.webhookDedup.findFirst({
        where: eq(webhookDedup.stripeEventId, stripeEventId),
      });
      return result || null;
    } catch (error) {
      console.error('Error getting webhook status:', error);
      return null;
    }
  }
}
