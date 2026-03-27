import { router, procedure } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "~/db/schema";

export const usersRouter = router({
  updateProfile: procedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      const updatedUser = await ctx.db
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return { success: true, user: updatedUser[0] };
    }),

  changePassword: procedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      // TODO: Implement password verification and hashing
      // For now, this is a placeholder that validates the input
      return { success: true };
    }),

  deleteAccount: procedure
    .mutation(async ({ ctx }: { ctx: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      // TODO: Implement account deletion with data cleanup
      return { success: true };
    }),
});
