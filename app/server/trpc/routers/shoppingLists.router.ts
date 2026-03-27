import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, procedure } from '../trpc';
import { emitter } from '~/utils/emitter.server';
import { pusherEvents } from '~/utils/pusher.server';
import {
  taskLists,
  shoppingListItems,
  familyMembers,
  listEventLinks,
  listAnnouncements,
  listShares,
} from '../../../db/schema';
import { eq, desc, and, count } from 'drizzle-orm';

// Validation schemas
const createListSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters'),
  date: z.string().datetime().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

const updateListSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters')
    .optional(),
  date: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
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
  itemName: z.string()
    .min(1, 'Item name cannot be empty')
    .max(255, 'Item name must be less than 255 characters'),
  quantity: z.number().int().positive().optional(),
  unit: z.enum(['piece', 'kg', 'lbs', 'ml', 'L', 'dozen', 'oz', 'cup', 'tbsp', 'tsp']).optional(),
  category: z.enum(['produce', 'meat', 'dairy', 'pantry', 'household', 'other']).default('other'),
});

const updateItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  itemName: z.string()
    .min(1, 'Item name cannot be empty')
    .max(255, 'Item name must be less than 255 characters')
    .optional(),
  quantity: z.number().int().positive().optional().nullable(),
  unit: z.enum(['piece', 'kg', 'lbs', 'ml', 'L', 'dozen', 'oz', 'cup', 'tbsp', 'tsp']).optional().nullable(),
  category: z.enum(['produce', 'meat', 'dairy', 'pantry', 'household', 'other']).optional(),
  isChecked: z.boolean().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
});

const deleteItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
});

const onShoppingListUpdateSchema = z.object({
  familyId: z.string().uuid('Invalid family ID'),
});

const linkListToEventSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  eventId: z.string().uuid('Invalid event ID'),
});

const unlinkListFromEventSchema = z.object({
  linkId: z.string().uuid('Invalid link ID'),
});

const createAnnouncementSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  eventLinkId: z.string().uuid('Invalid event link ID').optional(),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters'),
  content: z.string().max(1000, 'Content must be less than 1000 characters').optional(),
});

const getListEventLinksSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
});

const getListAnnouncementsSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
});

const shareListSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  members: z.array(
    z.object({
      memberId: z.string().uuid('Invalid member ID'),
      accessLevel: z.enum(['view', 'edit']),
    })
  ).min(1, 'At least one member must be selected'),
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

export const shoppingListsRouter = router({
  /**
   * Create a new shopping list
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
          description: input.notes?.trim(),
          type: 'shopping',
          status: 'active',
        })
        .returning();

      // Emit event for real-time updates
      emitter.emit('shopping-lists-update', {
        familyId: input.familyId,
        type: 'list-created',
        list: newList,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(input.familyId, 'shopping-list-created', newList);
      } catch (error) {
        console.error('Failed to broadcast list creation via Pusher:', error);
      }

      return newList;
    }),

  /**
   * Update a shopping list
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
      if (input.notes !== undefined) {
        updateData.description = input.notes?.trim();
      }

      const [updatedList] = await ctx.db.update(taskLists)
        .set(updateData)
        .where(eq(taskLists.id, input.listId))
        .returning();

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'list-updated',
        list: updatedList,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-list-updated', updatedList);
      } catch (error) {
        console.error('Failed to broadcast list update via Pusher:', error);
      }

      return updatedList;
    }),

  /**
   * Delete a shopping list
   */
  deleteList: procedure
    .input(deleteListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Delete the list (cascades to items)
      await ctx.db.delete(taskLists)
        .where(eq(taskLists.id, input.listId));

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'list-deleted',
        listId: input.listId,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-list-deleted', { listId: input.listId });
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

      // Get shopping lists for this family
      const lists = await ctx.db.select()
        .from(taskLists)
        .where(
          and(
            eq(taskLists.familyId, input.familyId),
            eq(taskLists.type, 'shopping'),
            eq(taskLists.status, 'active')
          )
        )
        .orderBy(desc(taskLists.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Return lists with calculated item counts (simplified approach)
      const listsWithCounts = lists.map((list) => ({
        ...list,
        itemCount: 0, // Will be populated on demand via getListById
      }));

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
        .from(shoppingListItems)
        .where(eq(shoppingListItems.listId, input.listId))
        .orderBy(desc(shoppingListItems.createdAt));

      return { list, items };
    }),

  /**
   * Add an item to a shopping list
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
      const [newItem] = await ctx.db.insert(shoppingListItems)
        .values({
          listId: input.listId,
          itemName: input.itemName.trim(),
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
          isChecked: false,
          createdBy: ctx.user.id,
        })
        .returning();

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'item-added',
        listId: input.listId,
        item: newItem,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-item-added', { listId: input.listId, item: newItem });
      } catch (error) {
        console.error('Failed to broadcast item addition via Pusher:', error);
      }

      return newItem;
    }),

  /**
   * Update a shopping list item
   */
  updateItem: procedure
    .input(updateItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item and verify access
      const [item] = await ctx.db.select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found or you do not have access to edit it');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Validate assignee exists if provided
      if (input.assignedTo !== undefined && input.assignedTo !== null) {
        const [assignee] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.id, input.assignedTo),
              eq(familyMembers.familyId, list.familyId)
            )
          )
          .limit(1);

        if (!assignee) {
          throw new Error('Member not found in this family. Please select a valid family member.');
        }
      }

      // Check for duplicate item names if itemName is being changed
      if (input.itemName !== undefined && input.itemName.trim() !== item.itemName) {
        const [duplicateItem] = await ctx.db.select()
          .from(shoppingListItems)
          .where(
            and(
              eq(shoppingListItems.listId, item.listId),
              eq(shoppingListItems.itemName, input.itemName.trim()),
              // Exclude the current item from the check
              // Use raw SQL to compare IDs differently
            )
          )
          .limit(1);

        if (duplicateItem && duplicateItem.id !== input.itemId) {
          throw new Error('An item with this name already exists in this list');
        }
      }

      // Update the item
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.itemName !== undefined) {
        updateData.itemName = input.itemName.trim();
      }
      if (input.quantity !== undefined) {
        updateData.quantity = input.quantity;
      }
      if (input.unit !== undefined) {
        updateData.unit = input.unit;
      }
      if (input.category !== undefined) {
        updateData.category = input.category;
      }
      if (input.isChecked !== undefined) {
        updateData.isChecked = input.isChecked;
      }
      if (input.assignedTo !== undefined) {
        updateData.assignedTo = input.assignedTo;
      }

      const [updatedItem] = await ctx.db.update(shoppingListItems)
        .set(updateData)
        .where(eq(shoppingListItems.id, input.itemId))
        .returning();

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'item-updated',
        listId: item.listId,
        item: updatedItem,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-item-updated', { listId: item.listId, item: updatedItem });
      } catch (error) {
        console.error('Failed to broadcast item update via Pusher:', error);
      }

      return updatedItem;
    }),

  /**
   * Delete a shopping list item
   */
  deleteItem: procedure
    .input(deleteItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the item and verify access
      const [item] = await ctx.db.select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.id, input.itemId))
        .limit(1);

      if (!item) {
        throw new Error('Item not found');
      }

      // Get the list and verify access
      const list = await verifyListAccess(ctx.db, ctx.user.id, item.listId);

      // Delete the item
      await ctx.db.delete(shoppingListItems)
        .where(eq(shoppingListItems.id, input.itemId));

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'item-deleted',
        listId: item.listId,
        itemId: input.itemId,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-item-deleted', { listId: item.listId, itemId: input.itemId });
      } catch (error) {
        console.error('Failed to broadcast item deletion via Pusher:', error);
      }

      return { success: true };
    }),

  /**
   * Link a shopping list to a calendar event
   */
  linkListToEvent: procedure
    .input(linkListToEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Create the event link
      const [newLink] = await ctx.db.insert(listEventLinks)
        .values({
          listId: input.listId,
          eventId: input.eventId,
          linkedBy: ctx.user.id,
        })
        .returning();

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'list-linked-to-event',
        listId: input.listId,
        eventId: input.eventId,
        link: newLink,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-list-linked', { listId: input.listId, eventId: input.eventId });
      } catch (error) {
        console.error('Failed to broadcast list link via Pusher:', error);
      }

      return newLink;
    }),

  /**
   * Unlink a shopping list from a calendar event
   */
  unlinkListFromEvent: procedure
    .input(unlinkListFromEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Get the link and verify access
      const [link] = await ctx.db.select()
        .from(listEventLinks)
        .where(eq(listEventLinks.id, input.linkId))
        .limit(1);

      if (!link) {
        throw new Error('Event link not found');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, link.listId);

      // Delete the link
      await ctx.db.delete(listEventLinks)
        .where(eq(listEventLinks.id, input.linkId));

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'list-unlinked-from-event',
        listId: link.listId,
        eventId: link.eventId,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-list-unlinked', { listId: link.listId });
      } catch (error) {
        console.error('Failed to broadcast list unlink via Pusher:', error);
      }

      return { success: true };
    }),

  /**
   * Get event links for a shopping list
   */
  getListEventLinks: procedure
    .input(getListEventLinksSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Get event links for this list
      const links = await ctx.db.select()
        .from(listEventLinks)
        .where(eq(listEventLinks.listId, input.listId))
        .orderBy(desc(listEventLinks.createdAt));

      return { links };
    }),

  /**
   * Create an announcement for a shopping list
   */
  createAnnouncement: procedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Verify event link exists if provided
      if (input.eventLinkId) {
        const [eventLink] = await ctx.db.select()
          .from(listEventLinks)
          .where(eq(listEventLinks.id, input.eventLinkId))
          .limit(1);

        if (!eventLink || eventLink.listId !== input.listId) {
          throw new Error('Event link not found or does not belong to this list');
        }
      }

      // Create the announcement
      const [newAnnouncement] = await ctx.db.insert(listAnnouncements)
        .values({
          listId: input.listId,
          eventLinkId: input.eventLinkId,
          title: input.title.trim(),
          content: input.content?.trim(),
          createdBy: ctx.user.id,
        })
        .returning();

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'announcement-created',
        listId: input.listId,
        announcement: newAnnouncement,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-announcement-created', { listId: input.listId, announcement: newAnnouncement });
      } catch (error) {
        console.error('Failed to broadcast announcement via Pusher:', error);
      }

      return newAnnouncement;
    }),

  /**
   * Get announcements for a shopping list
   */
  getListAnnouncements: procedure
    .input(getListAnnouncementsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // Get announcements for this list
      const announcements = await ctx.db.select()
        .from(listAnnouncements)
        .where(eq(listAnnouncements.listId, input.listId))
        .orderBy(desc(listAnnouncements.createdAt));

      return { announcements };
    }),

  /**
   * Share a shopping list with family members
   */
  shareList: procedure
    .input(shareListSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User must be authenticated');
      }

      // Verify user has access to the list
      const list = await verifyListAccess(ctx.db, ctx.user.id, input.listId);

      // For each member, create a list share record
      const shares = [];
      for (const member of input.members) {
        // Verify the member exists in the family
        const [familyMember] = await ctx.db.select()
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.id, member.memberId),
              eq(familyMembers.familyId, list.familyId)
            )
          )
          .limit(1);

        if (!familyMember) {
          throw new Error(`Member not found in family`);
        }

        // Check if share already exists
        const [existingShare] = await ctx.db.select()
          .from(listShares)
          .where(
            and(
              eq(listShares.listId, input.listId),
              eq(listShares.sharedWith, member.memberId)
            )
          )
          .limit(1);

        if (existingShare) {
          // Update existing share
          const [updated] = await ctx.db.update(listShares)
            .set({
              accessLevel: member.accessLevel,
              updatedAt: new Date(),
            })
            .where(eq(listShares.id, existingShare.id))
            .returning();
          shares.push(updated);
        } else {
          // Create new share
          const [newShare] = await ctx.db.insert(listShares)
            .values({
              listId: input.listId,
              sharedWith: member.memberId,
              accessLevel: member.accessLevel,
              sharedBy: ctx.user.id,
            })
            .returning();
          shares.push(newShare);
        }
      }

      // Emit event
      emitter.emit('shopping-lists-update', {
        familyId: list.familyId,
        type: 'list-shared',
        listId: input.listId,
        shares,
      });

      // Broadcast via Pusher
      try {
        await pusherEvents.trigger(list.familyId, 'shopping-list-shared', { listId: input.listId, shareCount: shares.length });
      } catch (error) {
        console.error('Failed to broadcast list share via Pusher:', error);
      }

      return { shares, message: `List shared with ${shares.length} member(s)` };
    }),

  /**
   * Subscribe to shopping list updates for a family
   */
  onShoppingListUpdate: procedure
    .input(onShoppingListUpdateSchema)
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

        emitter.on('shopping-lists-update', onUpdate);

        return () => {
          emitter.off('shopping-lists-update', onUpdate);
        };
      });
    }),
});
