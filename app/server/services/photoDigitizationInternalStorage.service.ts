import { db } from "~/db/index.server";
import {
  photoDigitizationInternalNotes,
  photoDigitizationAccessAuditLog,
  photoDigitizationOrders,
  type NewPhotoDigitizationInternalNote,
  type AccessType,
} from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Service for managing internal storage of photo digitization jobs
 * Handles internal notes, documents, and access auditing
 */

export class PhotoDigitizationInternalStorageService {
  /**
   * Verify that user is admin/owner with access to internal storage
   */
  private async verifyAdminAccess(userId: string): Promise<void> {
    // Check if user is admin or owner
    // This should be verified via authentication/authorization middleware
    // For now, we rely on the middleware to enforce this
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User must be authenticated",
      });
    }
  }

  /**
   * Log access to internal storage for audit trail
   */
  private async logAccess(
    internalNoteId: string,
    accessedBy: string,
    accessType: AccessType
  ): Promise<void> {
    try {
      await db.insert(photoDigitizationAccessAuditLog).values({
        internalNoteId,
        accessedBy,
        accessType,
      });
    } catch (error) {
      console.error("Failed to log access to internal storage:", error);
      // Don't throw - audit logging shouldn't break the operation
    }
  }

  /**
   * Create a new internal note for a job
   */
  async createInternalNote(
    orderId: string,
    createdBy: string,
    content: string,
    attachmentUrls?: string[]
  ): Promise<typeof photoDigitizationInternalNotes.$inferSelect> {
    await this.verifyAdminAccess(createdBy);

    // Verify order exists
    const order = await db
      .select()
      .from(photoDigitizationOrders)
      .where(eq(photoDigitizationOrders.id, orderId))
      .limit(1);

    if (!order.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    const [newNote] = await db
      .insert(photoDigitizationInternalNotes)
      .values({
        orderId,
        createdBy,
        content,
        attachmentUrls: attachmentUrls || [],
      })
      .returning();

    // Log the creation
    await this.logAccess(newNote.id, createdBy, "create");

    console.info("Internal note created:", { orderId, noteId: newNote.id, createdBy });

    return newNote;
  }

  /**
   * Get all internal notes for a specific order
   */
  async getInternalNotes(
    orderId: string,
    accessedBy: string
  ): Promise<typeof photoDigitizationInternalNotes.$inferSelect[]> {
    await this.verifyAdminAccess(accessedBy);

    const notes = await db
      .select()
      .from(photoDigitizationInternalNotes)
      .where(eq(photoDigitizationInternalNotes.orderId, orderId))
      .orderBy(desc(photoDigitizationInternalNotes.createdAt));

    // Log access for each note
    for (const note of notes) {
      await this.logAccess(note.id, accessedBy, "view");
    }

    return notes;
  }

  /**
   * Update an internal note
   */
  async updateInternalNote(
    noteId: string,
    content: string,
    attachmentUrls?: string[],
    updatedBy?: string
  ): Promise<typeof photoDigitizationInternalNotes.$inferSelect> {
    if (updatedBy) {
      await this.verifyAdminAccess(updatedBy);
    }

    // Verify note exists
    const [note] = await db
      .select()
      .from(photoDigitizationInternalNotes)
      .where(eq(photoDigitizationInternalNotes.id, noteId))
      .limit(1);

    if (!note) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Internal note not found",
      });
    }

    const [updatedNote] = await db
      .update(photoDigitizationInternalNotes)
      .set({
        content,
        attachmentUrls: attachmentUrls !== undefined ? attachmentUrls : note.attachmentUrls,
        updatedAt: new Date(),
      })
      .where(eq(photoDigitizationInternalNotes.id, noteId))
      .returning();

    // Log the edit
    if (updatedBy) {
      await this.logAccess(noteId, updatedBy, "edit");
    }

    console.info("Internal note updated:", { noteId });

    return updatedNote;
  }

  /**
   * Delete an internal note
   */
  async deleteInternalNote(
    noteId: string,
    deletedBy: string
  ): Promise<void> {
    await this.verifyAdminAccess(deletedBy);

    // Verify note exists first
    const [note] = await db
      .select()
      .from(photoDigitizationInternalNotes)
      .where(eq(photoDigitizationInternalNotes.id, noteId))
      .limit(1);

    if (!note) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Internal note not found",
      });
    }

    // Log the deletion before we delete
    await this.logAccess(noteId, deletedBy, "delete");

    await db
      .delete(photoDigitizationInternalNotes)
      .where(eq(photoDigitizationInternalNotes.id, noteId));

    console.info("Internal note deleted:", { noteId, deletedBy });
  }

  /**
   * Get access audit log for an internal note
   */
  async getAccessLog(
    noteId: string,
    requestedBy: string
  ): Promise<typeof photoDigitizationAccessAuditLog.$inferSelect[]> {
    await this.verifyAdminAccess(requestedBy);

    return await db
      .select()
      .from(photoDigitizationAccessAuditLog)
      .where(
        eq(photoDigitizationAccessAuditLog.internalNoteId, noteId)
      )
      .orderBy(desc(photoDigitizationAccessAuditLog.timestamp));
  }

  /**
   * Get all access logs for a specific order
   */
  async getOrderAccessLog(
    orderId: string,
    requestedBy: string
  ): Promise<typeof photoDigitizationAccessAuditLog.$inferSelect[]> {
    await this.verifyAdminAccess(requestedBy);

    // Get all notes for the order
    const notes = await db
      .select()
      .from(photoDigitizationInternalNotes)
      .where(eq(photoDigitizationInternalNotes.orderId, orderId));

    if (!notes.length) {
      return [];
    }

    const noteIds = notes.map((n: any) => n.id);

    // Get all audit logs for those notes
    const logs: typeof photoDigitizationAccessAuditLog.$inferSelect[] = [];
    for (const noteId of noteIds) {
      const noteLogs = await db
        .select()
        .from(photoDigitizationAccessAuditLog)
        .where(eq(photoDigitizationAccessAuditLog.internalNoteId, noteId));
      logs.push(...noteLogs);
    }
    
    return logs;
  }

  /**
   * Get order dashboard data including payment info, timeline, and access logs
   */
  async getOrderDashboardData(
    orderId: string,
    adminId: string
  ): Promise<{
    order: typeof photoDigitizationOrders.$inferSelect | null;
    payment: {
      status: string;
      estimatedPrice: string | null;
      submittedAt: Date;
      dueDate: Date | null;
    } | null;
    timeline: {
      status: string;
      dates: Record<string, Date | null>;
    } | null;
    accessCount: number;
  }> {
    await this.verifyAdminAccess(adminId);

    // Get order
    const [order] = await db
      .select()
      .from(photoDigitizationOrders)
      .where(eq(photoDigitizationOrders.id, orderId))
      .limit(1);

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    // Log the access
    await this.logAccess(orderId, adminId, "view");

    // Get access count
    const accessLogs = await this.getOrderAccessLog(orderId, adminId);

    return {
      order,
      payment: {
        status: order.status,
        estimatedPrice: order.estimatedPrice,
        submittedAt: order.submittedAt,
        dueDate: order.dueDate,
      },
      timeline: {
        status: order.status,
        dates: {
          submitted: order.submittedAt,
          due: order.dueDate,
          created: order.createdAt,
          updated: order.updatedAt,
        },
      },
      accessCount: accessLogs.length,
    };
  }
}

export const photoDigitizationInternalStorageService =
  new PhotoDigitizationInternalStorageService();
