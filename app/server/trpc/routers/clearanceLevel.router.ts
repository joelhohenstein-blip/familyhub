import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { userClearanceLevels, familyMembers } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAction } from '~/utils/auditLog.server';

const createClearanceLevelSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  levelName: z.string().min(1, 'Level name is required').max(255),
  description: z.string().max(1000).optional(),
});

const updateClearanceLevelSchema = z.object({
  id: z.string().uuid('Invalid clearance level ID'),
  levelName: z.string().min(1, 'Level name is required').max(255),
  description: z.string().max(1000).optional(),
});

const deleteClearanceLevelSchema = z.object({
  id: z.string().uuid('Invalid clearance level ID'),
});

const listClearanceLevelsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

export const clearanceLevelRouter = router({
  getClearanceLevels: protectedProcedure
    .input(listClearanceLevelsSchema)
    .query(async ({ ctx, input }) => {
      // Verify user is a member of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You are not a member of this family');
      }

      const levels = await ctx.db
        .select()
        .from(userClearanceLevels)
        .where(eq(userClearanceLevels.familyId, input.familyId));

      return levels;
    }),

  createClearanceLevel: protectedProcedure
    .input(createClearanceLevelSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is an admin of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, 'admin')
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You must be a family admin to create clearance levels');
      }

      const [newLevel] = await ctx.db
        .insert(userClearanceLevels)
        .values({
          familyId: input.familyId,
          levelName: input.levelName,
          description: input.description || null,
        })
        .returning();

      // Log the action
      await logAction({
        actionType: 'CLEARANCE_LEVEL_CREATED',
        actorId: ctx.user.id,
        targetId: newLevel.id,
        targetType: 'clearanceLevel',
        description: `Created clearance level: ${input.levelName}`,
        metadata: {
          familyId: input.familyId,
          levelName: input.levelName,
        },
      });

      return newLevel;
    }),

  updateClearanceLevel: protectedProcedure
    .input(updateClearanceLevelSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the clearance level to verify family
      const [level] = await ctx.db
        .select()
        .from(userClearanceLevels)
        .where(eq(userClearanceLevels.id, input.id))
        .limit(1);

      if (!level) {
        throw new Error('Clearance level not found');
      }

      // Verify user is an admin of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, level.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, 'admin')
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You must be a family admin to update clearance levels');
      }

      const [updatedLevel] = await ctx.db
        .update(userClearanceLevels)
        .set({
          levelName: input.levelName,
          description: input.description || null,
          updatedAt: new Date(),
        })
        .where(eq(userClearanceLevels.id, input.id))
        .returning();

      // Log the action
      await logAction({
        actionType: 'CLEARANCE_LEVEL_UPDATED',
        actorId: ctx.user.id,
        targetId: updatedLevel.id,
        targetType: 'clearanceLevel',
        description: `Updated clearance level: ${input.levelName}`,
        metadata: {
          familyId: level.familyId,
          levelName: input.levelName,
        },
      });

      return updatedLevel;
    }),

  deleteClearanceLevel: protectedProcedure
    .input(deleteClearanceLevelSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the clearance level to verify family
      const [level] = await ctx.db
        .select()
        .from(userClearanceLevels)
        .where(eq(userClearanceLevels.id, input.id))
        .limit(1);

      if (!level) {
        throw new Error('Clearance level not found');
      }

      // Verify user is an admin of the family
      const [membership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, level.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, 'admin')
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('You must be a family admin to delete clearance levels');
      }

      await ctx.db
        .delete(userClearanceLevels)
        .where(eq(userClearanceLevels.id, input.id));

      // Log the action
      await logAction({
        actionType: 'CLEARANCE_LEVEL_DELETED',
        actorId: ctx.user.id,
        targetId: input.id,
        targetType: 'clearanceLevel',
        description: `Deleted clearance level: ${level.levelName}`,
        metadata: {
          familyId: level.familyId,
          levelName: level.levelName,
        },
      });

      return { success: true };
    }),

  assignClearanceToMember: protectedProcedure
    .input(
      z.object({
        familyMemberId: z.string().uuid('Invalid family member ID'),
        clearanceLevelId: z.string().uuid('Invalid clearance level ID'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the family member
      const [member] = await ctx.db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.id, input.familyMemberId));

      if (!member) {
        throw new Error('Family member not found');
      }

      // Verify user is admin of the family
      const [adminMembership] = await ctx.db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, member.familyId),
            eq(familyMembers.userId, ctx.user.id),
            eq(familyMembers.role, 'admin')
          )
        );

      if (!adminMembership) {
        throw new Error('You must be an admin to assign clearance levels');
      }

      // Verify the clearance level belongs to the same family
      const [clearanceLevel] = await ctx.db
        .select()
        .from(userClearanceLevels)
        .where(
          and(
            eq(userClearanceLevels.id, input.clearanceLevelId),
            eq(userClearanceLevels.familyId, member.familyId)
          )
        );

      if (!clearanceLevel) {
        throw new Error('Clearance level not found or does not belong to this family');
      }

      // Update the family member's clearance level
      const [updatedMember] = await ctx.db
        .update(familyMembers)
        .set({ clearanceLevelId: input.clearanceLevelId })
        .where(eq(familyMembers.id, input.familyMemberId))
        .returning();

      // Log the action
      await logAction({
        actionType: 'CLEARANCE_LEVEL_ASSIGNED',
        actorId: ctx.user.id,
        targetId: input.familyMemberId,
        targetType: 'familyMember',
        description: `Assigned clearance level ${clearanceLevel.levelName} to family member`,
        metadata: {
          familyId: member.familyId,
          memberId: input.familyMemberId,
          clearanceLevelId: input.clearanceLevelId,
          clearanceLevelName: clearanceLevel.levelName,
        },
      });

      return updatedMember;
    }),
});
