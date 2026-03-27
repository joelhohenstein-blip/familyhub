import { router, procedure } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { notificationSettings } from "~/db/schema";

export const notificationSettingsRouter = router({
  getSettings: procedure
    .query(async ({ ctx }: { ctx: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      const settings = await ctx.db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, ctx.user.id),
      });

      // Return default settings if none exist
      return (
        settings || {
          messageNotifications: true,
          messageEmailNotifications: false,
          calendarReminders: true,
          calendarEmailReminders: true,
          mediaNotifications: true,
          mediaEmailNotifications: false,
          mentionNotifications: true,
          mentionEmailNotifications: false,
          dailyDigest: false,
          weeklyDigest: true,
        }
      );
    }),

  updateSettings: procedure
    .input(
      z.object({
        messageNotifications: z.boolean(),
        messageEmailNotifications: z.boolean(),
        calendarReminders: z.boolean(),
        calendarEmailReminders: z.boolean(),
        mediaNotifications: z.boolean(),
        mediaEmailNotifications: z.boolean(),
        mentionNotifications: z.boolean(),
        mentionEmailNotifications: z.boolean(),
        dailyDigest: z.boolean(),
        weeklyDigest: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      const existing = await ctx.db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, ctx.user.id),
      });

      if (existing) {
        const updated = await ctx.db
          .update(notificationSettings)
          .set(input)
          .where(eq(notificationSettings.userId, ctx.user.id))
          .returning();
        return updated[0];
      } else {
        const created = await ctx.db
          .insert(notificationSettings)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .returning();
        return created[0];
      }
    }),
});
