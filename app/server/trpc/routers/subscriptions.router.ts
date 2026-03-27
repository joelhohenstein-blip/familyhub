import { z } from 'zod';
import { router, procedure } from '../trpc';
import {
  digestSubscriptions,
  familyMembers,
  users,
  auditLog,
  families,
} from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import type { DigestCadence } from '~/db/schema';

// Validation schemas
const getSubscriptionsSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const addMemberToDigestSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  userId: z.string().uuid('Invalid user ID'),
  cadence: z.enum(['daily', 'weekly']).default('weekly'),
});

const removeMemberFromDigestSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  userId: z.string().uuid('Invalid user ID'),
});

const updateCadenceSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  cadence: z.enum(['daily', 'weekly']),
});

const updateFiltersSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  contentFilters: z.record(z.string(), z.boolean()),
});

const toggleSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  isActive: z.boolean(),
});

export const subscriptionsRouter = router({
  /**
   * Get all digest subscriptions for a family (admin only)
   */
  getSubscriptions: procedure
    .input(getSubscriptionsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      // Check if user is admin
      if (membership.role !== 'admin') {
        throw new Error('Only family admins can view subscriptions');
      }

      try {
        const subscriptions = await ctx.db.query.digestSubscriptions.findMany({
          where: eq(digestSubscriptions.familyId, input.familyId),
          with: {
            user: {
              columns: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        });

        return subscriptions;
      } catch (error) {
        console.error('Error retrieving subscriptions:', error);
        throw new Error('Failed to retrieve subscriptions');
      }
    }),

  /**
   * Add a member to digest subscription (admin only)
   */
  addMemberToDigest: procedure
    .input(addMemberToDigestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      // Check if user is admin
      if (membership.role !== 'admin') {
        throw new Error('Only family admins can manage subscriptions');
      }

      try {
        // Verify target user is a member of the family
        const [targetMembership] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.familyId, input.familyId),
              eq(familyMembers.userId, input.userId)
            )
          )
          .limit(1);

        if (!targetMembership) {
          throw new Error('Target user is not a member of this family');
        }

        // Check if subscription already exists
        const [existing] = await ctx.db.select()
          .from(digestSubscriptions)
          .where(
            and(
              eq(digestSubscriptions.familyId, input.familyId),
              eq(digestSubscriptions.userId, input.userId)
            )
          )
          .limit(1);

        if (existing) {
          // Update if exists
          const [updated] = await ctx.db.update(digestSubscriptions)
            .set({
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(digestSubscriptions.id, existing.id))
            .returning();

          return updated;
        }

        // Create new subscription
        const [subscription] = await ctx.db.insert(digestSubscriptions)
          .values({
            familyId: input.familyId,
            userId: input.userId,
            cadence: input.cadence as DigestCadence,
            isActive: true,
          })
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'digest_subscription_added',
          actorId: ctx.user.id,
          targetId: subscription.id,
          targetType: 'subscription',
          description: `Added user ${input.userId} to digest subscriptions`,
        });

        return subscription;
      } catch (error) {
        console.error('Error adding member to digest:', error);
        throw new Error('Failed to add member to digest');
      }
    }),

  /**
   * Remove a member from digest subscription (admin only)
   */
  removeMemberFromDigest: procedure
    .input(removeMemberFromDigestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      const [membership] = await ctx.db.select()
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

      // Check if user is admin
      if (membership.role !== 'admin') {
        throw new Error('Only family admins can manage subscriptions');
      }

      try {
        // Find subscription
        const [subscription] = await ctx.db.select()
          .from(digestSubscriptions)
          .where(
            and(
              eq(digestSubscriptions.familyId, input.familyId),
              eq(digestSubscriptions.userId, input.userId)
            )
          )
          .limit(1);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        // Deactivate subscription
        const [updated] = await ctx.db.update(digestSubscriptions)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(digestSubscriptions.id, subscription.id))
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'digest_subscription_removed',
          actorId: ctx.user.id,
          targetId: subscription.id,
          targetType: 'subscription',
          description: `Removed user ${input.userId} from digest subscriptions`,
        });

        return updated;
      } catch (error) {
        console.error('Error removing member from digest:', error);
        throw new Error('Failed to remove member from digest');
      }
    }),

  /**
   * Update subscription cadence
   */
  updateCadence: procedure
    .input(updateCadenceSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Get subscription
        const [subscription] = await ctx.db.select()
          .from(digestSubscriptions)
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .limit(1);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        // Verify user is a member of the family and admin
        const [membership] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.familyId, subscription.familyId),
              eq(familyMembers.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!membership || membership.role !== 'admin') {
          throw new Error('Only family admins can update subscriptions');
        }

        // Update cadence
        const [updated] = await ctx.db.update(digestSubscriptions)
          .set({
            cadence: input.cadence as DigestCadence,
            updatedAt: new Date(),
          })
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'subscription_cadence_updated',
          actorId: ctx.user.id,
          targetId: input.subscriptionId,
          targetType: 'subscription',
          description: `Updated cadence to ${input.cadence}`,
        });

        return updated;
      } catch (error) {
        console.error('Error updating cadence:', error);
        throw new Error('Failed to update cadence');
      }
    }),

  /**
   * Update content filters for a subscription
   */
  updateFilters: procedure
    .input(updateFiltersSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Get subscription
        const [subscription] = await ctx.db.select()
          .from(digestSubscriptions)
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .limit(1);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        // Verify user is a member of the family and admin
        const [membership] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.familyId, subscription.familyId),
              eq(familyMembers.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!membership || membership.role !== 'admin') {
          throw new Error('Only family admins can update filters');
        }

        // Update filters
        const [updated] = await ctx.db.update(digestSubscriptions)
          .set({
            contentFilters: input.contentFilters,
            updatedAt: new Date(),
          })
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: 'subscription_filters_updated',
          actorId: ctx.user.id,
          targetId: input.subscriptionId,
          targetType: 'subscription',
          description: `Updated content filters`,
        });

        return updated;
      } catch (error) {
        console.error('Error updating filters:', error);
        throw new Error('Failed to update filters');
      }
    }),

  /**
   * Toggle subscription active status
   */
  toggleSubscription: procedure
    .input(toggleSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      try {
        // Get subscription
        const [subscription] = await ctx.db.select()
          .from(digestSubscriptions)
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .limit(1);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        // Verify user can toggle (admin or self)
        if (subscription.userId !== ctx.user.id) {
          const [membership] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.familyId, subscription.familyId),
                eq(familyMembers.userId, ctx.user.id)
              )
            )
            .limit(1);

          if (!membership || membership.role !== 'admin') {
            throw new Error('You do not have permission to toggle this subscription');
          }
        }

        // Toggle subscription
        const [updated] = await ctx.db.update(digestSubscriptions)
          .set({
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(digestSubscriptions.id, input.subscriptionId))
          .returning();

        // Log audit trail
        await ctx.db.insert(auditLog).values({
          actionType: input.isActive ? 'subscription_activated' : 'subscription_deactivated',
          actorId: ctx.user.id,
          targetId: input.subscriptionId,
          targetType: 'subscription',
          description: `Subscription ${input.isActive ? 'activated' : 'deactivated'}`,
        });

        return updated;
      } catch (error) {
        console.error('Error toggling subscription:', error);
        throw new Error('Failed to toggle subscription');
      }
    }),
});
