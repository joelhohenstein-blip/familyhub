import { db } from '~/db/index.server';
import { reminders } from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateReminderInput {
  userId: string;
  familyId: string;
  reminderTime: string; // HH:MM format
  channels: ('in-app' | 'email' | 'push')[];
  timezone: string;
  enabled?: boolean;
}

export interface UpdateReminderInput {
  id: string;
  reminderTime?: string;
  channels?: ('in-app' | 'email' | 'push')[];
  timezone?: string;
  enabled?: boolean;
}

export interface ReminderResult {
  id: string;
  userId: string;
  familyId: string;
  reminderTime: string;
  channels: ('in-app' | 'email' | 'push')[];
  enabled: boolean;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RemindersService handles all reminder-related operations
 */
export class RemindersService {
  /**
   * Validate time format (HH:MM)
   */
  private static isValidTime(timeStr: string): boolean {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  }

  /**
   * Validate timezone
   */
  private static isValidTimezone(tz: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new reminder
   */
  static async createReminder(input: CreateReminderInput): Promise<ReminderResult> {
    // Validate time format
    if (!this.isValidTime(input.reminderTime)) {
      throw new Error('Invalid time format. Use HH:MM (00:00-23:59)');
    }

    // Validate timezone
    if (!this.isValidTimezone(input.timezone)) {
      throw new Error(`Invalid timezone: ${input.timezone}`);
    }

    // Validate at least one channel selected
    if (input.channels.length === 0) {
      throw new Error('At least one notification channel must be selected');
    }

    const [newReminder] = await db
      .insert(reminders)
      .values({
        userId: input.userId,
        familyId: input.familyId,
        reminderTime: input.reminderTime,
        channels: JSON.stringify(input.channels),
        enabled: input.enabled ?? true,
        timezone: input.timezone,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return this.formatReminder(newReminder);
  }

  /**
   * Get all reminders for a user
   */
  static async getReminders(userId: string, familyId: string): Promise<ReminderResult[]> {
    const items = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.familyId, familyId)
        )
      )
      .orderBy(reminders.reminderTime);

    return items.map(this.formatReminder);
  }

  /**
   * Get a single reminder by ID
   */
  static async getReminderById(reminderId: string): Promise<ReminderResult | null> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    return reminder ? this.formatReminder(reminder) : null;
  }

  /**
   * Update a reminder
   */
  static async updateReminder(input: UpdateReminderInput): Promise<ReminderResult> {
    const existing = await this.getReminderById(input.id);
    if (!existing) {
      throw new Error('Reminder not found');
    }

    // Validate time if provided
    if (input.reminderTime && !this.isValidTime(input.reminderTime)) {
      throw new Error('Invalid time format. Use HH:MM (00:00-23:59)');
    }

    // Validate timezone if provided
    if (input.timezone && !this.isValidTimezone(input.timezone)) {
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

    const [updated] = await db
      .update(reminders)
      .set(updateData)
      .where(eq(reminders.id, input.id))
      .returning();

    return this.formatReminder(updated);
  }

  /**
   * Delete a reminder
   */
  static async deleteReminder(reminderId: string): Promise<ReminderResult> {
    const [deleted] = await db
      .delete(reminders)
      .where(eq(reminders.id, reminderId))
      .returning();

    if (!deleted) {
      throw new Error('Reminder not found');
    }

    return this.formatReminder(deleted);
  }

  /**
   * Toggle reminder enabled/disabled
   */
  static async toggleReminder(reminderId: string): Promise<ReminderResult> {
    const existing = await this.getReminderById(reminderId);
    if (!existing) {
      throw new Error('Reminder not found');
    }

    const [updated] = await db
      .update(reminders)
      .set({
        enabled: !existing.enabled,
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    return this.formatReminder(updated);
  }

  /**
   * Get enabled reminders for a specific time (for scheduling)
   */
  static async getRemindersForTime(
    reminderTime: string,
    timezone?: string
  ): Promise<ReminderResult[]> {
    const items = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.reminderTime, reminderTime),
          eq(reminders.enabled, true)
        )
      );

    return items.map(this.formatReminder);
  }

  /**
   * Format reminder object - parse channels from JSON
   */
  private static formatReminder(reminder: any): ReminderResult {
    return {
      ...reminder,
      channels: typeof reminder.channels === 'string'
        ? JSON.parse(reminder.channels)
        : reminder.channels,
    };
  }
}
