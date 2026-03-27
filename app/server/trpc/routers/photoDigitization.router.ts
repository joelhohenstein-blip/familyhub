import { z } from 'zod';
import { router, procedure, adminProcedure } from '../trpc';
import { PhotoDigitizationService, ItemType, OrderStatus } from '../../services/photoDigitization.service';
import { photoDigitizationOrders } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { photoDigitizationInternalStorageService } from '../../services/photoDigitizationInternalStorage.service';
import { emailStorageService } from '../../services/photoDigitizationEmailStorage.service';
import { PhotoDigitizationPrivateFoldersService } from '../../services/photoDigitizationPrivateFolders.service';
import { PhotoDigitizationProjectThreadsService } from '../../services/photoDigitizationProjectThreads.service';

// Validation schemas
const submitInquirySchema = z.object({
  itemType: z.enum(['loose_slides', 'carousel']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  newStatus: z.enum([
    'inquiry_submitted',
    'quantity_verified',
    'payment_pending',
    'payment_confirmed',
    'in_processing',
    'completed',
    'cancelled',
  ]),
  notes: z.string().optional(),
});

const getOrderStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const getCustomerOrdersSchema = z.object({
  customerId: z.string(),
});

// Internal storage schemas
const createInternalNoteSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  content: z.string().min(1, 'Content cannot be empty'),
  attachmentUrls: z.array(z.string().url()).optional(),
});

const updateInternalNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
  content: z.string().min(1, 'Content cannot be empty'),
  attachmentUrls: z.array(z.string().url()).optional(),
});

const deleteInternalNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
});

const getInternalNotesSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const getAccessLogSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
});

// Email storage schemas
const storeCustomerEmailSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  email: z.string().email('Invalid email address'),
});

const getCustomerEmailSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const getOrderWithPaymentTimelineSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

// Private Folder schemas
const createPrivateFolderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  folderName: z.string().min(1, 'Folder name is required').max(255),
  description: z.string().optional(),
});

const getPrivateFolderSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID'),
});

const updatePrivateFolderSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID'),
  folderName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isLocked: z.boolean().optional(),
  lockedReason: z.string().optional(),
});

const lockFolderSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID'),
  reason: z.string().min(1, 'Lock reason is required'),
  until: z.date().optional(),
});

const getFoldersForOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const getFolderAccessLogSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID'),
});

// Threading schemas
const createThreadSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
});

const getThreadSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
});

const getThreadsForOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const postMessageSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
  content: z.string().min(1, 'Message content cannot be empty').max(10000),
  attachmentUrls: z.array(z.string().url()).optional(),
});

const getThreadMessagesSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const editMessageSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  content: z.string().min(1, 'Message content cannot be empty').max(10000),
});

const deleteMessageSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

const markMessageAsReadSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

const archiveThreadSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
});

const resolveThreadSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
});

// ⚠️ FEATURE FLAG: Photo Digitization Service
// Status: PREPARING FOR FUTURE RELEASE - Currently locked to prevent production use
// To enable: Set FEATURE_PHOTO_DIGITIZATION=true in environment variables
const isPhotoDigitizationEnabled = process.env.FEATURE_PHOTO_DIGITIZATION === 'true';

export const photoDigitizationRouter = router({
  /**
   * Submit a new photo digitization inquiry
   * @warning Feature is currently locked - set FEATURE_PHOTO_DIGITIZATION=true to enable
   */
  submitInquiry: procedure
    .input(submitInquirySchema)
    .mutation(async ({ ctx, input }) => {
      if (!isPhotoDigitizationEnabled) {
        throw new Error('Photo digitization service is not available yet. Check back soon!');
      }

      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const order = await PhotoDigitizationService.submitOrder({
          customerId: ctx.user.id,
          itemType: input.itemType as ItemType,
          quantity: input.quantity,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
        });

        return {
          success: true,
          orderId: order.id,
          status: order.status,
          message: 'Your photo digitization inquiry has been submitted successfully. You will receive an email confirmation within 2 hours.',
        };
      } catch (error) {
        throw new Error(
          `Failed to submit inquiry: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get order status (admin only)
   */
  getOrderStatus: adminProcedure
    .input(getOrderStatusSchema)
    .query(async ({ ctx, input }) => {
      try {
        const order = await PhotoDigitizationService.getOrderStatus(input.orderId);
        return order;
      } catch (error) {
        throw new Error(
          `Failed to get order status: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Update order status (admin only)
   */
  updateOrderStatus: adminProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedOrder = await PhotoDigitizationService.updateOrderStatus({
          orderId: input.orderId,
          newStatus: input.newStatus as OrderStatus,
          changedBy: ctx.user.id,
          notes: input.notes,
        });

        return {
          success: true,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          message: `Order status updated to ${input.newStatus}. Customer notification sent.`,
        };
      } catch (error) {
        throw new Error(
          `Failed to update order status: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get all orders for the current customer
   */
  getCustomerOrders: procedure
    .input(getCustomerOrdersSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify user is requesting their own orders or is an admin
      if (input.customerId !== ctx.user.id) {
        throw new Error('You do not have permission to view these orders');
      }

      try {
        const orders = await PhotoDigitizationService.getCustomerOrders(input.customerId);
        return orders;
      } catch (error) {
        throw new Error(
          `Failed to get customer orders: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get order status history (admin only)
   */
  getOrderHistory: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      // Verify user has permission to view this order's history
      const [order] = await ctx.db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.customerId !== ctx.user.id) {
        throw new Error('You do not have permission to view this order history');
      }

      try {
        const history = await PhotoDigitizationService.getOrderHistory(input.orderId);
        return history;
      } catch (error) {
        throw new Error(
          `Failed to get order history: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Create internal note (admin only)
   * Securely store internal notes and documents related to a job
   */
  createInternalNote: adminProcedure
    .input(createInternalNoteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const note = await photoDigitizationInternalStorageService.createInternalNote(
          input.orderId,
          ctx.user.id,
          input.content,
          input.attachmentUrls
        );

        return {
          success: true,
          note,
          message: 'Internal note created successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to create internal note: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get internal notes for an order (admin only)
   * Retrieve all internal notes linked to a specific job
   */
  getInternalNotes: adminProcedure
    .input(getInternalNotesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const notes = await photoDigitizationInternalStorageService.getInternalNotes(
          input.orderId,
          ctx.user.id
        );

        return {
          success: true,
          notes,
          count: notes.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to get internal notes: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Update internal note (admin only)
   * Modify existing internal notes and documents
   */
  updateInternalNote: adminProcedure
    .input(updateInternalNoteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const note = await photoDigitizationInternalStorageService.updateInternalNote(
          input.noteId,
          input.content,
          input.attachmentUrls,
          ctx.user.id
        );

        return {
          success: true,
          note,
          message: 'Internal note updated successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to update internal note: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Delete internal note (admin only)
   * Remove internal notes and documents
   */
  deleteInternalNote: adminProcedure
    .input(deleteInternalNoteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await photoDigitizationInternalStorageService.deleteInternalNote(
          input.noteId,
          ctx.user.id
        );

        return {
          success: true,
          message: 'Internal note deleted successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to delete internal note: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get access audit log (admin only)
   * Retrieve audit log for a specific internal note
   */
  getAccessLog: adminProcedure
    .input(getAccessLogSchema)
    .query(async ({ ctx, input }) => {
      try {
        const log = await photoDigitizationInternalStorageService.getAccessLog(
          input.noteId,
          ctx.user.id
        );

        return {
          success: true,
          log,
          count: log.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to get access log: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Store customer email securely (admin only)
   * Encrypt and store customer email associated with a job order
   */
  storeCustomerEmail: adminProcedure
    .input(storeCustomerEmailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const id = await emailStorageService.encryptAndStoreEmail(
          input.orderId,
          input.email,
          ctx.user.id
        );

        return {
          success: true,
          id,
          message: 'Customer email stored securely',
        };
      } catch (error) {
        throw new Error(
          `Failed to store email: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get customer email (admin only)
   * Decrypt and retrieve stored customer email for a job
   */
  getCustomerEmail: adminProcedure
    .input(getCustomerEmailSchema)
    .query(async ({ ctx, input }) => {
      try {
        const email = await emailStorageService.decryptStoredEmail(
          input.orderId,
          ctx.user.id
        );

        return {
          success: true,
          email,
        };
      } catch (error) {
        throw new Error(
          `Failed to retrieve email: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get order with payment timeline (admin only)
   * Retrieve order data with payment status and timeline information
   */
  getOrderWithPaymentTimeline: adminProcedure
    .input(getOrderWithPaymentTimelineSchema)
    .query(async ({ ctx, input }) => {
      try {
        const dashboardData = await photoDigitizationInternalStorageService.getOrderDashboardData(
          input.orderId,
          ctx.user.id
        );

        return {
          success: true,
          data: dashboardData,
        };
      } catch (error) {
        throw new Error(
          `Failed to get order payment timeline: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ============================================================
  // PRIVATE FOLDER OPERATIONS
  // ============================================================

  /**
   * Create a private folder for an order
   * Admin only - used to organize sensitive project materials
   */
  createPrivateFolder: adminProcedure
    .input(createPrivateFolderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const folder = await service.createPrivateFolder(
          input.orderId,
          ctx.user.id,
          input.folderName,
          input.description
        );

        return {
          success: true,
          folder,
          message: 'Private folder created successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to create private folder: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get a private folder
   * Admin only - enforces access controls
   */
  getPrivateFolder: adminProcedure
    .input(getPrivateFolderSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const folder = await service.getPrivateFolder(
          input.folderId,
          ctx.user.id,
          true // isAdmin - admin users have full access
        );

        return {
          success: true,
          folder,
        };
      } catch (error) {
        throw new Error(
          `Failed to get private folder: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get all private folders for an order
   */
  getFoldersForOrder: adminProcedure
    .input(getFoldersForOrderSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const folders = await service.getFoldersForOrder(
          input.orderId,
          ctx.user.id,
          true // isAdmin - admin users have full access
        );

        return {
          success: true,
          folders,
          count: folders.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to get folders: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Update a private folder
   * Admin only
   */
  updatePrivateFolder: adminProcedure
    .input(updatePrivateFolderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const { folderId, ...updates } = input;
        
        const folder = await service.updatePrivateFolder(
          folderId,
          ctx.user.id,
          true, // isAdmin - admin users have full access
          updates
        );

        return {
          success: true,
          folder,
          message: 'Private folder updated successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to update private folder: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Lock a private folder
   * Admin only - prevents modifications
   */
  lockPrivateFolder: adminProcedure
    .input(lockFolderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const folder = await service.lockFolder(
          input.folderId,
          ctx.user.id,
          true, // isAdmin - admin users have full access
          input.reason,
          input.until
        );

        return {
          success: true,
          folder,
          message: 'Folder locked successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to lock folder: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Unlock a private folder
   * Admin only
   */
  unlockPrivateFolder: adminProcedure
    .input(getPrivateFolderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const folder = await service.unlockFolder(
          input.folderId,
          ctx.user.id,
          true // isAdmin - admin users have full access
        );

        return {
          success: true,
          folder,
          message: 'Folder unlocked successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to unlock folder: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get folder access audit log
   * Admin only
   */
  getFolderAccessLog: adminProcedure
    .input(getFolderAccessLogSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationPrivateFoldersService(ctx.db);
        const log = await service.getAccessLog(
          input.folderId,
          ctx.user.id,
          true // isAdmin - admin users have full access
        );

        return {
          success: true,
          log,
          count: log.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to get folder access log: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ============================================================
  // PROJECT THREADING OPERATIONS
  // ============================================================

  /**
   * Create a new thread for a project
   * Available to admin and customer
   */
  createProjectThread: procedure
    .input(createThreadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const thread = await service.createThread(
          input.orderId,
          ctx.user.id,
          input.title,
          input.description
        );

        return {
          success: true,
          thread,
          message: 'Project thread created successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to create project thread: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get a project thread
   */
  getProjectThread: procedure
    .input(getThreadSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const thread = await service.getThread(input.threadId, ctx.user.id);

        return {
          success: true,
          thread,
        };
      } catch (error) {
        throw new Error(
          `Failed to get project thread: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get all threads for an order
   */
  getProjectThreadsForOrder: procedure
    .input(getThreadsForOrderSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const threads = await service.getThreadsForOrder(input.orderId);

        return {
          success: true,
          threads,
          count: threads.length,
        };
      } catch (error) {
        throw new Error(
          `Failed to get project threads: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Post a message to a project thread
   * Available to admin and customer
   */
  postThreadMessage: procedure
    .input(postMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const result = await service.postMessage(
          input.threadId,
          ctx.user.id,
          input.content,
          input.attachmentUrls
        );

        return {
          success: true,
          message: result.message,
          threadUpdated: result.threadUpdated,
        };
      } catch (error) {
        throw new Error(
          `Failed to post message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Get all messages in a thread with pagination
   * Supports high message volume efficiently
   */
  getThreadMessages: procedure
    .input(getThreadMessagesSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const result = await service.getThreadMessages(
          input.threadId,
          input.limit,
          input.offset
        );

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new Error(
          `Failed to get thread messages: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Edit a thread message
   * User can only edit their own messages
   */
  editThreadMessage: adminProcedure
    .input(editMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const message = await service.editMessage(
          input.messageId,
          ctx.user.id,
          input.content
        );

        return {
          success: true,
          message,
        };
      } catch (error) {
        throw new Error(
          `Failed to edit message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Delete a thread message
   * User can delete their own messages, admins can delete any
   */
  deleteThreadMessage: adminProcedure
    .input(deleteMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const result = await service.deleteMessage(
          input.messageId,
          ctx.user.id,
          true // isAdmin - admin users can delete any message
        );

        return {
          success: true,
          message: 'Message deleted successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Mark a message as read
   */
  markThreadMessageAsRead: adminProcedure
    .input(markMessageAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const message = await service.markMessageAsRead(
          input.messageId,
          ctx.user.id
        );

        return {
          success: true,
          message,
        };
      } catch (error) {
        throw new Error(
          `Failed to mark message as read: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Archive a project thread
   * Hides thread from active list but preserves data
   */
  archiveProjectThread: adminProcedure
    .input(archiveThreadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const thread = await service.archiveThread(input.threadId, ctx.user.id);

        return {
          success: true,
          thread,
          message: 'Thread archived successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to archive thread: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * Mark a project thread as resolved
   * Indicates the issue/discussion has been resolved
   */
  resolveProjectThread: adminProcedure
    .input(resolveThreadSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User must be authenticated');
      }

      try {
        const service = new PhotoDigitizationProjectThreadsService(ctx.db);
        const thread = await service.resolveThread(input.threadId, ctx.user.id);

        return {
          success: true,
          thread,
          message: 'Thread resolved successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to resolve thread: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ============================================================
  // ADMIN DASHBOARD OPERATIONS
  // ============================================================

  /**
   * Get photo digitization dashboard data (admin only)
   * Fetches comprehensive dashboard summary including:
   * - Total orders and breakdown by status
   * - Payment statistics (pending, completed, total quantity)
   * - Recent orders (last 10)
   */
  getPhotoDigitizationDashboardData: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const dashboardData = await PhotoDigitizationService.getPhotoDigitizationDashboardData();

        return {
          success: true,
          data: dashboardData,
          message: 'Dashboard data retrieved successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to get dashboard data: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),
});
