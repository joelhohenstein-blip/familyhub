import { z } from 'zod';
import { router, procedure } from '../trpc';
import * as schema from '~/db/schema';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

/**
 * Announcements Router
 * Handles family-wide broadcast announcements designed for:
 * - Geographically dispersed families
 * - Multigenerational communication
 * - Important information sharing
 */

export const announcementsRouter = router({
  /**
   * Create a new announcement (admin/owner only)
   */
  create: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        category: z.enum([
          'family_news',
          'events',
          'reminders',
          'important',
          'milestones',
        ]),
        isPinned: z.boolean().default(false),
        priority: z.number().int().min(0).max(2).default(0),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { familyId, title, content, category, isPinned, priority, expiresAt } =
        input;

      // Verify user is a family member with admin role
      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, familyId),
            eq(schema.familyMembers.userId, ctx.user.id),
            eq(schema.familyMembers.role, 'admin')
          )
        );

      if (!member) {
        throw new Error('Only family admins can create announcements');
      }

      const announcementId = uuid();
      const [announcement] = await ctx.db
        .insert(schema.announcements)
        .values({
          id: announcementId,
          familyId,
          createdBy: ctx.user.id,
          title,
          content,
          category,
          isPinned,
          priority,
          expiresAt,
          status: 'published',
        })
        .returning();

      return announcement;
    }),

  /**
   * Get all announcements for a family (excluding expired)
   */
  getForFamily: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
        category: z.enum([
          'family_news',
          'events',
          'reminders',
          'important',
          'milestones',
        ]).optional(),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { familyId, category, includeArchived } = input;

      // Verify user is a family member
      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, familyId),
            eq(schema.familyMembers.userId, ctx.user.id)
          )
        );

      if (!member) {
        throw new Error('You are not a member of this family');
      }

      const announcements = await ctx.db
        .select()
        .from(schema.announcements)
        .where(
          and(
            eq(schema.announcements.familyId, familyId),
            includeArchived
              ? undefined
              : eq(schema.announcements.status, 'published'),
            category
              ? eq(schema.announcements.category, category)
              : undefined
          )
        )
        .orderBy(
          desc(schema.announcements.isPinned),
          desc(schema.announcements.priority),
          desc(schema.announcements.createdAt)
        );

      // Get read status for each announcement
      const announcementsWithReadStatus = await Promise.all(
        announcements.map(async (ann) => {
          const [readReceipt] = await ctx.db
            .select()
            .from(schema.announcementReadReceipts)
            .where(
              and(
                eq(schema.announcementReadReceipts.announcementId, ann.id),
                eq(schema.announcementReadReceipts.userId, ctx.user!.id)
              )
            );

          return {
            ...ann,
            isRead: !!readReceipt,
            isAcknowledged: readReceipt?.acknowledged || false,
          };
        })
      );

      return announcementsWithReadStatus;
    }),

  /**
   * Mark announcement as read
   */
  markAsRead: procedure
    .input(
      z.object({
        announcementId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { announcementId } = input;

      // Check if already read
      const [existing] = await ctx.db
        .select()
        .from(schema.announcementReadReceipts)
        .where(
          and(
            eq(schema.announcementReadReceipts.announcementId, announcementId),
            eq(schema.announcementReadReceipts.userId, ctx.user.id)
          )
        );

      if (existing) {
        return existing;
      }

      const [readReceipt] = await ctx.db
        .insert(schema.announcementReadReceipts)
        .values({
          id: uuid(),
          announcementId,
          userId: ctx.user.id,
          readAt: new Date(),
          acknowledged: false,
        })
        .returning();

      return readReceipt;
    }),

  /**
   * Acknowledge announcement (confirm understanding)
   */
  acknowledge: procedure
    .input(
      z.object({
        announcementId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { announcementId } = input;

      const [readReceipt] = await ctx.db
        .update(schema.announcementReadReceipts)
        .set({
          acknowledged: true,
          acknowledgedAt: new Date(),
        })
        .where(
          and(
            eq(schema.announcementReadReceipts.announcementId, announcementId),
            eq(schema.announcementReadReceipts.userId, ctx.user.id)
          )
        )
        .returning();

      if (!readReceipt) {
        throw new Error('Read receipt not found');
      }

      return readReceipt;
    }),

  /**
   * Get read receipts for an announcement (admin only)
   */
  getReadReceipts: procedure
    .input(
      z.object({
        announcementId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { announcementId } = input;

      // Get the announcement to verify admin permission
      const [announcement] = await ctx.db
        .select()
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcementId));

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      // Verify user is admin of the family
      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, announcement.familyId),
            eq(schema.familyMembers.userId, ctx.user.id),
            eq(schema.familyMembers.role, 'admin')
          )
        );

      if (!member) {
        throw new Error('Only family admins can view read receipts');
      }

      const receipts = await ctx.db
        .select({
          id: schema.announcementReadReceipts.id,
          userId: schema.announcementReadReceipts.userId,
          readAt: schema.announcementReadReceipts.readAt,
          acknowledged: schema.announcementReadReceipts.acknowledged,
          acknowledgedAt: schema.announcementReadReceipts.acknowledgedAt,
          user: {
            id: schema.users.id,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          },
        })
        .from(schema.announcementReadReceipts)
        .innerJoin(
          schema.users,
          eq(schema.announcementReadReceipts.userId, schema.users.id)
        )
        .where(
          eq(schema.announcementReadReceipts.announcementId, announcementId)
        )
        .orderBy(
          desc(schema.announcementReadReceipts.acknowledged),
          asc(schema.announcementReadReceipts.readAt)
        );

      // Get all family members to show who hasn't read
      const allMembers = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(eq(schema.familyMembers.familyId, announcement.familyId));

      const readUserIds = receipts.map((r) => r.userId);
      const unreadMembers = allMembers.filter(
        (m) => !readUserIds.includes(m.userId)
      );

      return {
        totalMembers: allMembers.length,
        readCount: receipts.length,
        acknowledgmentCount: receipts.filter((r) => r.acknowledged).length,
        receipts,
        unreadMembers,
      };
    }),

  /**
   * Update announcement (admin only)
   */
  update: procedure
    .input(
      z.object({
        announcementId: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        isPinned: z.boolean().optional(),
        priority: z.number().int().min(0).max(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { announcementId, ...updates } = input;

      // Get the announcement and verify admin permission
      const [announcement] = await ctx.db
        .select()
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcementId));

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, announcement.familyId),
            eq(schema.familyMembers.userId, ctx.user.id),
            eq(schema.familyMembers.role, 'admin')
          )
        );

      if (!member) {
        throw new Error('Only family admins can update announcements');
      }

      const [updated] = await ctx.db
        .update(schema.announcements)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.announcements.id, announcementId))
        .returning();

      return updated;
    }),

  /**
   * Archive announcement (admin only)
   */
  archive: procedure
    .input(
      z.object({
        announcementId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { announcementId } = input;

      // Get the announcement and verify admin permission
      const [announcement] = await ctx.db
        .select()
        .from(schema.announcements)
        .where(eq(schema.announcements.id, announcementId));

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, announcement.familyId),
            eq(schema.familyMembers.userId, ctx.user.id),
            eq(schema.familyMembers.role, 'admin')
          )
        );

      if (!member) {
        throw new Error('Only family admins can archive announcements');
      }

      const [archived] = await ctx.db
        .update(schema.announcements)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(schema.announcements.id, announcementId))
        .returning();

      return archived;
    }),

  /**
   * Get announcement statistics for a family
   */
  getStats: procedure
    .input(
      z.object({
        familyId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      const { familyId } = input;

      // Verify user is admin
      const [member] = await ctx.db
        .select()
        .from(schema.familyMembers)
        .where(
          and(
            eq(schema.familyMembers.familyId, familyId),
            eq(schema.familyMembers.userId, ctx.user.id),
            eq(schema.familyMembers.role, 'admin')
          )
        );

      if (!member) {
        throw new Error('Only family admins can view stats');
      }

      const announcements = await ctx.db
        .select()
        .from(schema.announcements)
        .where(eq(schema.announcements.familyId, familyId));

      const stats = await Promise.all(
        announcements.map(async (ann) => {
          const receipts = await ctx.db
            .select()
            .from(schema.announcementReadReceipts)
            .where(
              eq(schema.announcementReadReceipts.announcementId, ann.id)
            );

          const acknowledged = receipts.filter((r) => r.acknowledged).length;
          const allMembers = await ctx.db
            .select()
            .from(schema.familyMembers)
            .where(eq(schema.familyMembers.familyId, familyId));

          return {
            announcementId: ann.id,
            title: ann.title,
            category: ann.category,
            priority: ann.priority,
            readCount: receipts.length,
            acknowledgedCount: acknowledged,
            totalMembers: allMembers.length,
            readPercentage:
              allMembers.length > 0
                ? (receipts.length / allMembers.length) * 100
                : 0,
            acknowledgedPercentage:
              receipts.length > 0 ? (acknowledged / receipts.length) * 100 : 0,
            createdAt: ann.createdAt,
          };
        })
      );

      return {
        totalAnnouncements: announcements.length,
        stats,
      };
    }),
});
