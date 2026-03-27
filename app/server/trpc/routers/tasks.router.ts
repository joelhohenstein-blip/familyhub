import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import {
  taskLists,
  todoItems,
  listShares,
  familyMembers,
  families,
} from '../../../db/schema';
import { eq, desc, and, isNull, or, count } from 'drizzle-orm';
import crypto from 'crypto';

// Validation schemas
const createListSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  type: z.enum(['tasks', 'shopping']).default('tasks'),
});

const updateListSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const deleteListSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
});

const getListsByFamilySchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getListByIdSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
});

const addItemSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  title: z.string()
    .min(1, 'Item title cannot be empty')
    .max(255, 'Item title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

const updateItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  title: z.string()
    .min(1, 'Item title cannot be empty')
    .max(255, 'Item title must be less than 255 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const deleteItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
});

const assignItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  memberIdToAssign: z.string().uuid('Invalid member ID'),
});

const unassignItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
});

const shareListSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  memberIdsToShareWith: z.array(z.string().uuid('Invalid member ID')).min(1, 'Must share with at least one member'),
  accessLevel: z.enum(['view', 'edit']).default('view'),
});

const updateShareAccessSchema = z.object({
  shareId: z.string().uuid('Invalid share ID'),
  accessLevel: z.enum(['view', 'edit']),
});

const validateShareTokenSchema = z.object({
  shareToken: z.string(),
});

const getSharedWithMeSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const onTaskListUpdateSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

/**
 * Helper: Verify user is a family member
 */
async function verifyFamilyMember(
  db: any,
  userId: string,
  familyId: string
): Promise<any> {
  const [membership] = await db.select()
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error('You are not a member of this family');
  }

  return membership;
}

/**
 * Helper: Verify user has access to a list
 */
async function verifyListAccess(
  db: any,
  userId: string,
  listId: string
): Promise<any> {
  const [list] = await db.select()
    .from(taskLists)
    .where(eq(taskLists.id, listId))
    .limit(1);

  if (!list) {
    throw new Error('List not found');
  }

  // Verify user is member of the list's family
  await verifyFamilyMember(db, userId, list.familyId);

  return list;
}

/**
 * Helper: Generate share token
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const tasksRouter = router({
  /**
   * Create a new task list
   */
  createList: procedure
    .input(createListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      await verifyFamilyMember(ctx.db, ctx.user.id, input.familyId);

      // Create the list
      const [newList] = await ctx.db.insert(taskLists)
        .values({
          familyId: input.familyId,
          createdBy: ctx.user.id,
          title: input.title.trim(),
          description: input.description?.trim(),
          type: input.type,
          status: 'active',
        })
        .returning();

      // Emit event for real-time updates
      emitter.emit('tasks-update', {
        familyId: input.familyId,
        type: 'list-created',
        list: newList,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(input.familyId, 'task-list-created', newList);
      } catch (error) {
        console.error('Failed to broadcast list creation via Pusher:', error);
      }

      return newList;
    }),

  /**
   * Update a task list
   */
  updateList: procedure
    .input(updateListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Update the list
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) {
        updateData.title = input.title.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim();
      }
      if (input.status !== undefined) {
        updateData.status = input.status;
      }

      const [updatedList] = await ctx.db.update(taskLists)
        .set(updateData)
        .where(eq(taskLists.id, input.listId))
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'list-updated',
        list: updatedList,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-list-updated', updatedList);
      } catch (error) {
        console.error('Failed to broadcast list update via Pusher:', error);
      }

      return updatedList;
    }),

  /**
   * Delete a task list
   */
  deleteList: procedure
    .input(deleteListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Delete the list (cascades to items and shares)
      await ctx.db.delete(taskLists)
        .where(eq(taskLists.id, input.listId));

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'list-deleted',
        listId: input.listId,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-list-deleted', { listId: input.listId });
      } catch (error) {
        console.error('Failed to broadcast list deletion via Pusher:', error);
      }

      return { success: true };
    }),

  /**
   * Get lists for a family
   */
  getListsByFamily: procedure
    .input(getListsByFamilySchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      await verifyFamilyMember(ctx.db, ctx.user.id, input.familyId);

      // Get lists created by/shared with the user in this family
      const lists = await ctx.db.select()
        .from(taskLists)
        .where(
          and(
            eq(taskLists.familyId, input.familyId),
            eq(taskLists.status, 'active')
          )
        )
        .orderBy(desc(taskLists.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Enrich with item counts
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const [result] = await ctx.db.select({ count: count() })
            .from(todoItems)
            .where(eq(todoItems.listId, list.id));

          return {
            ...list,
            itemCount: result.count,
          };
        })
      );

      return { lists: listsWithCounts };
    }),

  /**
   * Get a list by ID with all its items
   */
  getListById: procedure
    .input(getListByIdSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Get all items in the list
      const items = await ctx.db.select()
        .from(todoItems)
        .where(eq(todoItems.listId, input.listId))
        .orderBy(desc(todoItems.createdAt));

      return { list, items };
    }),

  /**
   * Add an item to a list
   */
  addItem: procedure
    .input(addItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Create the item
      const [newItem] = await ctx.db.insert(todoItems)
        .values({
          listId: input.listId,
          title: input.title.trim(),
          description: input.description?.trim(),
          priority: input.priority,
          status: 'pending',
          createdBy: ctx.user.id,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        })
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'item-added',
        listId: input.listId,
        item: newItem,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-item-added', { listId: input.listId, item: newItem });
      } catch (error) {
        console.error('Failed to broadcast item addition via Pusher:', error);
      }

      return newItem;
    }),

  /**
   * Update an item
   */
  updateItem: procedure
    .input(updateItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item and verify access
      const [item] = await ctx.db.select()
        .from(todoItems)
        .where(eq(todoItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Update the item
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) {
        updateData.title = input.title.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim();
      }
      if (input.priority !== undefined) {
        updateData.priority = input.priority;
      }
      if (input.status !== undefined) {
        updateData.status = input.status;
      }
      if (input.dueDate !== undefined) {
        updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      }

      const [updatedItem] = await ctx.db.update(todoItems)
        .set(updateData)
        .where(eq(todoItems.id, input.itemId))
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'item-updated',
        listId: item.listId,
        item: updatedItem,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-item-updated', { listId: item.listId, item: updatedItem });
      } catch (error) {
        console.error('Failed to broadcast item update via Pusher:', error);
      }

      return updatedItem;
    }),

  /**
   * Delete an item
   */
  deleteItem: procedure
    .input(deleteItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item and verify access
      const [item] = await ctx.db.select()
        .from(todoItems)
        .where(eq(todoItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Delete the item
      await ctx.db.delete(todoItems)
        .where(eq(todoItems.id, input.itemId));

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'item-deleted',
        listId: item.listId,
        itemId: input.itemId,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-item-deleted', { listId: item.listId, itemId: input.itemId });
      } catch (error) {
        console.error('Failed to broadcast item deletion via Pusher:', error);
      }

      return { success: true };
    }),

  /**
   * Assign an item to a family member
   */
  assignItem: procedure
    .input(assignItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item
      const [item] = await ctx.db.select()
        .from(todoItems)
        .where(eq(todoItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Verify the member exists and is in the same family
      const [targetMember] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.id, input.memberIdToAssign),
            eq(familyMembers.familyId, list.familyId)
          )
        )
        .limit(1);

      if (!targetMember) {
        throw new Error('Member not found in this family');
      }

      // Assign the item
      const [updatedItem] = await ctx.db.update(todoItems)
        .set({
          assignedTo: input.memberIdToAssign,
          updatedAt: new Date(),
        })
        .where(eq(todoItems.id, input.itemId))
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'item-assigned',
        listId: item.listId,
        item: updatedItem,
        assignedTo: input.memberIdToAssign,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-item-assigned', { listId: item.listId, item: updatedItem, assignedToMemberId: input.memberIdToAssign });
      } catch (error) {
        console.error('Failed to broadcast item assignment via Pusher:', error);
      }

      return updatedItem;
    }),

  /**
   * Unassign an item from its current assignee
   */
  unassignItem: procedure
    .input(unassignItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item
      const [item] = await ctx.db.select()
        .from(todoItems)
        .where(eq(todoItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Unassign the item
      const [updatedItem] = await ctx.db.update(todoItems)
        .set({
          assignedTo: null,
          updatedAt: new Date(),
        })
        .where(eq(todoItems.id, input.itemId))
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'item-unassigned',
        listId: item.listId,
        item: updatedItem,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-item-unassigned', { listId: item.listId, item: updatedItem });
      } catch (error) {
        console.error('Failed to broadcast item unassignment via Pusher:', error);
      }

      return updatedItem;
    }),

  /**
   * Share a list with one or more family members
   */
  shareList: procedure
    .input(shareListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Create shares for each member
      const shares = await Promise.all(
        input.memberIdsToShareWith.map(async (memberId) => {
          // Verify member is in the same family
          const [member] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.id, memberId),
                eq(familyMembers.familyId, list.familyId)
              )
            )
            .limit(1);

          if (!member) {
            throw new Error(`Member ${memberId} not found in this family`);
          }

          // Create the share record
          const [share] = await ctx.db.insert(listShares)
            .values({
              listId: input.listId,
              sharedWith: memberId,
              accessLevel: input.accessLevel,
              sharedBy: ctx.user!.id,
              shareToken: generateShareToken(),
            })
            .returning();

          return share;
        })
      );

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'list-shared',
        listId: input.listId,
        shares,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-list-shared', { listId: input.listId, shares });
      } catch (error) {
        console.error('Failed to broadcast list share via Pusher:', error);
      }

      return { shares };
    }),

  /**
   * Update share access level
   */
  updateShareAccess: procedure
    .input(updateShareAccessSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the share record
      const [share] = await ctx.db.select()
        .from(listShares)
        .where(eq(listShares.id, input.shareId))
        .limit(1);

      if (!share) {
        throw new Error('Share not found');
      }

      // Get the list and verify user has access
      const list = await verifyListAccess(ctx.db, ctx.user.id, share.listId);

      // Update the share access level
      const [updatedShare] = await ctx.db.update(listShares)
        .set({
          accessLevel: input.accessLevel,
          updatedAt: new Date(),
        })
        .where(eq(listShares.id, input.shareId))
        .returning();

      // Emit event
      emitter.emit('tasks-update', {
        familyId: list.familyId,
        type: 'share-access-updated',
        share: updatedShare,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'task-share-access-updated', updatedShare);
      } catch (error) {
        console.error('Failed to broadcast share access update via Pusher:', error);
      }

      return updatedShare;
    }),

  /**
   * Validate a share token
   */
  validateShareToken: procedure
    .input(validateShareTokenSchema)
    .query(async ({ ctx, input }) => {
      const [share] = await ctx.db.select()
        .from(listShares)
        .where(eq(listShares.shareToken, input.shareToken))
        .limit(1);

      if (!share) {
        throw new Error('Invalid share token');
      }

      // Check if token has expired
      if (share.expiresAt && new Date() > share.expiresAt) {
        throw new Error('Share token has expired');
      }

      return { valid: true, share };
    }),

  /**
   * Get lists shared with me
   */
  getSharedWithMe: procedure
    .input(getSharedWithMeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user is a member of the family
      await verifyFamilyMember(ctx.db, ctx.user.id, input.familyId);

      // Get the user's family member record
      const [myMembership] = await ctx.db.select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyId, input.familyId),
            eq(familyMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!myMembership) {
        throw new Error('You are not a member of this family');
      }

      // Get lists shared with this user
      const sharedLists = await ctx.db.select()
        .from(listShares)
        .where(eq(listShares.sharedWith, myMembership.id));

      // Get the actual lists
      const lists = await Promise.all(
        sharedLists.map(async (share) => {
          const [list] = await ctx.db.select()
            .from(taskLists)
            .where(eq(taskLists.id, share.listId))
            .limit(1);

          return {
            ...list,
            accessLevel: share.accessLevel,
            shareId: share.id,
          };
        })
      );

      return {
        lists: lists.filter((l) => l !== null),
      };
    }),

  /**
   * Subscribe to task list updates for a family
   */
  onTaskListUpdate: procedure
    .input(onTaskListUpdateSchema)
    .subscription(({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      return observable<any>((emit) => {
        const onUpdate = async (data: any) => {
          // Only emit updates for the subscribed family
          if (data.familyId !== input.familyId) return;

          // Verify user still has access to the family
          const [membership] = await ctx.db.select()
            .from(familyMembers)
            .where(
              and(
                eq(familyMembers.familyId, input.familyId),
                eq(familyMembers.userId, ctx.user!.id)
              )
            )
            .limit(1);

          if (!membership) return; // User no longer has access

          emit.next(data);
        };

        emitter.on('tasks-update', onUpdate);

        return () => {
          emitter.off('tasks-update', onUpdate);
        };
      });
    }),
});
