import { pgTable, text, boolean, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";

// Notification channel preference enum
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "phone",
  "in_app",
]);

export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull(),
  messageNotifications: boolean("message_notifications").default(true),
  messageEmailNotifications: boolean("message_email_notifications").default(false),
  calendarReminders: boolean("calendar_reminders").default(true),
  calendarEmailReminders: boolean("calendar_email_reminders").default(true),
  mediaNotifications: boolean("media_notifications").default(true),
  mediaEmailNotifications: boolean("media_email_notifications").default(false),
  mentionNotifications: boolean("mention_notifications").default(true),
  mentionEmailNotifications: boolean("mention_email_notifications").default(false),
  dailyDigest: boolean("daily_digest").default(false),
  weeklyDigest: boolean("weekly_digest").default(true),
  // Photo digitization notification preferences
  photoDigitizationNotifications: boolean("photo_digitization_notifications").default(true),
  photoDigitizationEmailNotifications: boolean("photo_digitization_email_notifications").default(true),
  photoDigitizationPreferredChannel: notificationChannelEnum("photo_digitization_preferred_channel").default("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
