import { router, procedure } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { privacySettings } from "~/db/schema";

export const privacySettingsRouter = router({
  getSettings: procedure
    .query(async ({ ctx }: { ctx: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      const settings = await ctx.db.query.privacySettings.findFirst({
        where: eq(privacySettings.userId, ctx.user.id),
      });

      // Return default settings if none exist
      return (
        settings || {
          profileVisibility: "family" as const,
          allowMessageRequests: true,
          allowMediaSharing: true,
          allowLocationSharing: false,
          allowActivityStatus: true,
          twoFactorEnabled: false,
          blockNonFamilyMessages: true,
        }
      );
    }),

  updateSettings: procedure
    .input(
      z.object({
        profileVisibility: z.enum(["public", "family", "private"]),
        allowMessageRequests: z.boolean(),
        allowMediaSharing: z.boolean(),
        allowLocationSharing: z.boolean(),
        allowActivityStatus: z.boolean(),
        twoFactorEnabled: z.boolean(),
        blockNonFamilyMessages: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      const existing = await ctx.db.query.privacySettings.findFirst({
        where: eq(privacySettings.userId, ctx.user.id),
      });

      if (existing) {
        const updated = await ctx.db
          .update(privacySettings)
          .set(input)
          .where(eq(privacySettings.userId, ctx.user.id))
          .returning();
        return updated[0];
      } else {
        const created = await ctx.db
          .insert(privacySettings)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .returning();
        return created[0];
      }
    }),
});
