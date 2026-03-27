import { db } from '~/db/index.server';
import { notifications } from '~/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface CreateNotificationInput {
  userId: string;
  familyId: string;
  message: string;
  type?: NotificationType;
}

export interface NotificationResult {
  id: string;
  userId: string;
  familyId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationService handles all notification-related operations
 */
export class NotificationService {
  /**
   * Create a new notification with retry logic
   */
  static async createNotification(
    input: CreateNotificationInput,
    maxRetries: number = 3
  ): Promise<NotificationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check for duplicates first
        const isDuplicate = await this.checkDuplicate(
          input.userId,
          input.message,
          5 // 5 minute window
        );

        if (isDuplicate) {
          throw new Error('Similar notification sent recently - deduplication prevented');
        }

        const [newNotification] = await db
          .insert(notifications)
          .values({
            userId: input.userId,
            familyId: input.familyId,
            message: input.message,
            type: input.type || 'info',
            read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return newNotification as NotificationResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to create notification after retries');
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getNotificationsByUser(
    userId: string,
    familyId: string,
    limit: number = 20,
    offset: number = 0,
    onlyUnread: boolean = false
  ): Promise<{ items: NotificationResult[]; total: number }> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.familyId, familyId),
    ];

    if (onlyUnread) {
      conditions.push(eq(notifications.read, false));
    }

    const items = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy((table) => sql`${table.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    return {
      items: items as NotificationResult[],
      total: count,
    };
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<NotificationResult> {
    const [updated] = await db
      .update(notifications)
      .set({
        read: true,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated as NotificationResult;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, familyId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({
        read: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.familyId, familyId),
          eq(notifications.read, false)
        )
      )
      .returning();

    return result.length;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<NotificationResult> {
    const [deleted] = await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    return deleted as NotificationResult;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string, familyId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.familyId, familyId),
          eq(notifications.read, false)
        )
      );

    return count;
  }

  /**
   * Check for duplicate notifications (deduplication)
   * Returns true if a similar notification exists within the time window
   */
  private static async checkDuplicate(
    userId: string,
    message: string,
    minutesWindow: number = 5
  ): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - minutesWindow * 60 * 1000);

    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.message, message),
          sql`${notifications.createdAt} > ${cutoffTime}`
        )
      )
      .limit(1);

    return !!existing;
  }
}
