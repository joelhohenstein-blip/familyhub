import { z } from 'zod';
import { router, procedure } from '../trpc';
import { notifications } from '../../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Validation schemas
const createNotificationSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  familyId: z.string().uuid('Invalid family ID'),
});

const getNotificationsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  onlyUnread: z.boolean().default(false),
});

const markAsReadSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

const deleteNotificationSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

// Helper to prevent duplicate alerts (deduplication)
async function checkForDuplicate(
  db: any,
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

export const notificationsRouter = router({
  /**
   * Get notifications for the current user
   */
  getNotifications: procedure
    .input(getNotificationsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Build the where clause
      const whereConditions = [
        eq(notifications.userId, ctx.user!.id),
        eq(notifications.familyId, input.familyId),
      ];

      if (input.onlyUnread) {
        whereConditions.push(eq(notifications.read, false));
      }

      const items = await ctx.db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...whereConditions));

      return {
        items,
        total: count,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Create a notification for a user
   */
  createNotification: procedure
    .input(createNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Check for duplicates to prevent spam
      const isDuplicate = await checkForDuplicate(ctx.db, ctx.user.id, input.message);
      if (isDuplicate) {
        throw new Error('Similar notification sent recently - please wait before trying again');
      }

      const [newNotification] = await ctx.db
        .insert(notifications)
        .values({
          userId: ctx.user.id,
          familyId: input.familyId,
          message: input.message,
          type: input.type,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newNotification;
    }),

  /**
   * Mark a notification as read
   */
  markAsRead: procedure
    .input(markAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify the notification belongs to the current user
      const [notification] = await ctx.db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.id))
        .limit(1);

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== ctx.user.id) {
        throw new Error('You do not have permission to update this notification');
      }

      const [updatedNotification] = await ctx.db
        .update(notifications)
        .set({
          read: true,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, input.id))
        .returning();

      return updatedNotification;
    }),

  /**
   * Delete a notification
   */
  deleteNotification: procedure
    .input(deleteNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify the notification belongs to the current user
      const [notification] = await ctx.db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.id))
        .limit(1);

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== ctx.user.id) {
        throw new Error('You do not have permission to delete this notification');
      }

      const [deletedNotification] = await ctx.db
        .delete(notifications)
        .where(eq(notifications.id, input.id))
        .returning();

      return deletedNotification;
    }),

  /**
   * Mark all notifications as read for the current user
   */
  markAllAsRead: procedure
    .input(z.object({ familyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      const result = await ctx.db
        .update(notifications)
        .set({
          read: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.familyId, input.familyId),
            eq(notifications.read, false)
          )
        )
        .returning();

      return { markedCount: result.length };
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: procedure
    .input(z.object({ familyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.familyId, input.familyId),
            eq(notifications.read, false)
          )
        );

      return { unreadCount: count };
    }),
});
