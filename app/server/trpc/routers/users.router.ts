import { router, procedure } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "~/db/schema/auth";
import { families } from "~/db/schema/families";
import { familyMembers } from "~/db/schema/familyMembers";
import { gameInvitations } from "~/db/games.schema";
import { hash, verify } from "argon2";

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
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");
      
      // Fetch current user with password hash
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) throw new Error("User not found");
      if (!user.passwordHash) throw new Error("User has no password set");

      // Verify current password
      const isPasswordValid = await verify(user.passwordHash, input.currentPassword);
      if (!isPasswordValid) throw new Error("Current password is incorrect");

      // Hash new password
      const newPasswordHash = await hash(input.newPassword);

      // Update password
      await ctx.db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "Password changed successfully" };
    }),

  deleteAccount: procedure
    .input(
      z.object({
        password: z.string().min(1, "Password is required to delete account"),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      // Fetch current user with password hash
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user) throw new Error("User not found");
      if (!user.passwordHash) throw new Error("User has no password set");

      // Verify password before deletion
      const isPasswordValid = await verify(user.passwordHash, input.password);
      if (!isPasswordValid) throw new Error("Password is incorrect");

      // Delete game invitations where user is sender or recipient
      await ctx.db.delete(gameInvitations).where(eq(gameInvitations.senderId, ctx.user.id));
      await ctx.db.delete(gameInvitations).where(eq(gameInvitations.recipientId, ctx.user.id));

      // Remove from family members
      await ctx.db.delete(familyMembers).where(eq(familyMembers.userId, ctx.user.id));

      // Delete families owned by this user (cascading deletes will handle members)
      await ctx.db.delete(families).where(eq(families.ownerId, ctx.user.id));

      // Finally, delete the user account (cascading deletes handle related data)
      await ctx.db.delete(users).where(eq(users.id, ctx.user.id));

      return { success: true, message: "Account deleted successfully" };
    }),
});
