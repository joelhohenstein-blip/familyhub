import { z } from 'zod';
import { router, procedure } from '../trpc';
import { reminders } from '../../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Validation schemas
const createReminderSchema = z.object({
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  channels: z.array(z.enum(['in-app', 'email', 'push'])).default(['in-app']),
  enabled: z.boolean().default(true),
  timezone: z.string().default('UTC'),
  familyId: z.string().uuid('Invalid family ID'),
});

const updateReminderSchema = z.object({
  id: z.string().uuid('Invalid reminder ID'),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  channels: z.array(z.enum(['in-app', 'email', 'push'])).optional(),
  enabled: z.boolean().optional(),
  timezone: z.string().optional(),
});

const getRemindersSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const deleteReminderSchema = z.object({
  id: z.string().uuid('Invalid reminder ID'),
});

// Helper to validate time format
function isValidTime(timeStr: string): boolean {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

// Helper to validate timezone
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Helper to count daily reminders
async function countDailyReminders(
  db: any,
  userId: string,
  familyId: string
): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.familyId, familyId),
        eq(reminders.enabled, true)
      )
    );

  return count;
}

export const remindersRouter = router({
  /**
   * Get all reminders for the current user
   */
  getReminders: procedure
    .input(getRemindersSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      const items = await ctx.db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, ctx.user.id),
            eq(reminders.familyId, input.familyId)
          )
        )
        .orderBy(reminders.reminderTime);

      return { items };
    }),

  /**
   * Create a new reminder
   */
  createReminder: procedure
    .input(createReminderSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Validate time format
      if (!isValidTime(input.reminderTime)) {
        throw new Error('Invalid time format. Use HH:MM (00:00-23:59)');
      }

      // Validate timezone
      if (!isValidTimezone(input.timezone)) {
        throw new Error(`Invalid timezone: ${input.timezone}`);
      }

      // Validate no more than 5 reminders per day per user
      const count = await countDailyReminders(ctx.db, ctx.user.id, input.familyId);
      if (count >= 5) {
        throw new Error('Maximum of 5 reminders per day allowed');
      }

      // Validate at least one channel selected
      if (input.channels.length === 0) {
        throw new Error('At least one notification channel must be selected');
      }

      const [newReminder] = await ctx.db
        .insert(reminders)
        .values({
          userId: ctx.user.id,
          familyId: input.familyId,
          reminderTime: input.reminderTime,
          channels: JSON.stringify(input.channels),
          enabled: input.enabled,
          timezone: input.timezone,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        ...newReminder,
        channels: JSON.parse(newReminder.channels as string),
      };
    }),

  /**
   * Update an existing reminder
   */
  updateReminder: procedure
    .input(updateReminderSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify the reminder belongs to the current user
      const [reminder] = await ctx.db
        .select()
        .from(reminders)
        .where(eq(reminders.id, input.id))
        .limit(1);

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.userId !== ctx.user.id) {
        throw new Error('You do not have permission to update this reminder');
      }

      // Validate time if provided
      if (input.reminderTime && !isValidTime(input.reminderTime)) {
        throw new Error('Invalid time format. Use HH:MM (00:00-23:59)');
      }

      // Validate timezone if provided
      if (input.timezone && !isValidTimezone(input.timezone)) {
        throw new Error(`Invalid timezone: ${input.timezone}`);
      }

      // Validate channels if provided
      if (input.channels && input.channels.length === 0) {
        throw new Error('At least one notification channel must be selected');
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.reminderTime) updateData.reminderTime = input.reminderTime;
      if (input.channels) updateData.channels = JSON.stringify(input.channels);
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.timezone) updateData.timezone = input.timezone;

      const [updatedReminder] = await ctx.db
        .update(reminders)
        .set(updateData)
        .where(eq(reminders.id, input.id))
        .returning();

      return {
        ...updatedReminder,
        channels: JSON.parse(updatedReminder.channels as string),
      };
    }),

  /**
   * Delete a reminder
   */
  deleteReminder: procedure
    .input(deleteReminderSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify the reminder belongs to the current user
      const [reminder] = await ctx.db
        .select()
        .from(reminders)
        .where(eq(reminders.id, input.id))
        .limit(1);

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.userId !== ctx.user.id) {
        throw new Error('You do not have permission to delete this reminder');
      }

      const [deletedReminder] = await ctx.db
        .delete(reminders)
        .where(eq(reminders.id, input.id))
        .returning();

      return deletedReminder;
    }),

  /**
   * Toggle reminder enabled/disabled
   */
  toggleReminder: procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      const [reminder] = await ctx.db
        .select()
        .from(reminders)
        .where(eq(reminders.id, input.id))
        .limit(1);

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.userId !== ctx.user.id) {
        throw new Error('You do not have permission to update this reminder');
      }

      const [updatedReminder] = await ctx.db
        .update(reminders)
        .set({
          enabled: !reminder.enabled,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, input.id))
        .returning();

      return {
        ...updatedReminder,
        channels: JSON.parse(updatedReminder.channels as string),
      };
    }),
});
