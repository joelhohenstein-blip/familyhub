import { eq, and, desc, sql } from "drizzle-orm";
import {
  photoDigitizationProjectThreads,
  photoDigitizationProjectThreadMessages,
  photoDigitizationOrders,
} from "../../db/schema";

/**
 * Project Threads Service
 * Manages threaded conversations within photo digitization projects
 * Handles thread creation, message management, and history preservation
 */
export class PhotoDigitizationProjectThreadsService {
  constructor(private db: any) {}

  /**
   * Create a new thread for a project
   * @param orderId - The order ID
   * @param userId - The ID of the user creating the thread
   * @param title - Thread title
   * @param description - Optional description
   */
  async createThread(
    orderId: string,
    userId: string,
    title: string,
    description?: string
  ) {
    try {
      // Verify order exists
      const [order] = await this.db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.id, orderId));

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Create thread
      const [thread] = await this.db
        .insert(photoDigitizationProjectThreads)
        .values({
          orderId: orderId as any,
          title,
          description,
          createdBy: userId as any,
          status: "active",
          messageCount: "0",
        })
        .returning();

      return thread;
    } catch (error) {
      throw new Error(
        `Failed to create thread: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a thread by ID with access check
   * @param threadId - The thread ID
   * @param userId - The ID of the user requesting
   */
  async getThread(threadId: string, userId: string) {
    try {
      // Get the thread
      const [thread] = await this.db
        .select()
        .from(photoDigitizationProjectThreads)
        .where(eq(photoDigitizationProjectThreads.id, threadId));

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Threads are accessible to the order customer or admins
      // (access control is enforced at router level)
      return thread;
    } catch (error) {
      throw new Error(
        `Failed to get thread: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all threads for an order
   * @param orderId - The order ID
   */
  async getThreadsForOrder(orderId: string) {
    try {
      const threads = await this.db
        .select()
        .from(photoDigitizationProjectThreads)
        .where(eq(photoDigitizationProjectThreads.orderId, orderId as any))
        .orderBy(
          desc(photoDigitizationProjectThreads.lastMessageAt),
          desc(photoDigitizationProjectThreads.createdAt)
        );

      return threads;
    } catch (error) {
      throw new Error(
        `Failed to get threads for order: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Archive a thread
   * @param threadId - The thread ID
   * @param userId - The ID of the user archiving
   */
  async archiveThread(threadId: string, userId: string) {
    try {
      const [updated] = await this.db
        .update(photoDigitizationProjectThreads)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreads.id, threadId as any))
        .returning();

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to archive thread: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Mark thread as resolved
   * @param threadId - The thread ID
   * @param userId - The ID of the user resolving
   */
  async resolveThread(threadId: string, userId: string) {
    try {
      const [updated] = await this.db
        .update(photoDigitizationProjectThreads)
        .set({
          status: "resolved",
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreads.id, threadId as any))
        .returning();

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to resolve thread: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Post a message to a thread
   * @param threadId - The thread ID
   * @param senderId - The ID of the sender
   * @param content - Message content
   * @param attachmentUrls - Optional attachment URLs
   */
  async postMessage(
    threadId: string,
    senderId: string,
    content: string,
    attachmentUrls?: string[]
  ) {
    try {
      // Sanitize content (basic sanitization - remove script tags)
      const sanitizedContent = this.sanitizeContent(content);

      // Verify thread exists
      const [thread] = await this.db
        .select()
        .from(photoDigitizationProjectThreads)
        .where(eq(photoDigitizationProjectThreads.id, threadId as any));

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Create the message
      const [message] = await this.db
        .insert(photoDigitizationProjectThreadMessages)
        .values({
          threadId: threadId as any,
          senderId: senderId as any,
          content: sanitizedContent,
          status: "sent",
          attachmentUrls: attachmentUrls || [],
        })
        .returning();

      // Update thread message count and last message timestamp
      const [updatedThread] = await this.db
        .update(photoDigitizationProjectThreads)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`CAST((CAST(${photoDigitizationProjectThreads.messageCount} AS INTEGER) + 1) AS TEXT)`,
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreads.id, threadId as any))
        .returning();

      return {
        message,
        threadUpdated: updatedThread,
      };
    } catch (error) {
      throw new Error(
        `Failed to post message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all messages in a thread
   * @param threadId - The thread ID
   * @param limit - Max messages to return (default 50)
   * @param offset - Pagination offset
   */
  async getThreadMessages(threadId: string, limit = 50, offset = 0) {
    try {
      const messages = await this.db
        .select()
        .from(photoDigitizationProjectThreadMessages)
        .where(
          eq(photoDigitizationProjectThreadMessages.threadId, threadId as any)
        )
        .orderBy(photoDigitizationProjectThreadMessages.createdAt)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [countResult] = await this.db
        .select({ count: sql`COUNT(*)` })
        .from(photoDigitizationProjectThreadMessages)
        .where(
          eq(photoDigitizationProjectThreadMessages.threadId, threadId as any)
        );

      const total = parseInt(countResult?.count?.toString() || "0", 10);

      return {
        messages,
        total,
        limit,
        offset,
      };
    } catch (error) {
      throw new Error(
        `Failed to get thread messages: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Edit a message
   * @param messageId - The message ID
   * @param senderId - The ID of the user editing (must be original sender)
   * @param newContent - New message content
   */
  async editMessage(messageId: string, senderId: string, newContent: string) {
    try {
      // Get the message
      const [message] = await this.db
        .select()
        .from(photoDigitizationProjectThreadMessages)
        .where(eq(photoDigitizationProjectThreadMessages.id, messageId as any));

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Verify sender is the original author
      if (message.senderId !== (senderId as any)) {
        throw new Error(
          "Access denied: You can only edit your own messages"
        );
      }

      // Sanitize new content
      const sanitizedContent = this.sanitizeContent(newContent);

      // Update the message
      const [updated] = await this.db
        .update(photoDigitizationProjectThreadMessages)
        .set({
          content: sanitizedContent,
          isEdited: true,
          editedAt: new Date(),
          editedBy: senderId as any,
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreadMessages.id, messageId as any))
        .returning();

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to edit message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a message
   * @param messageId - The message ID
   * @param senderId - The ID of the user deleting (must be original sender or admin)
   * @param isAdmin - Whether the user is an admin
   */
  async deleteMessage(messageId: string, senderId: string, isAdmin: boolean) {
    try {
      // Get the message
      const [message] = await this.db
        .select()
        .from(photoDigitizationProjectThreadMessages)
        .where(eq(photoDigitizationProjectThreadMessages.id, messageId as any));

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Verify sender is the original author or is admin
      if (message.senderId !== (senderId as any) && !isAdmin) {
        throw new Error(
          "Access denied: You can only delete your own messages"
        );
      }

      // Delete the message
      await this.db
        .delete(photoDigitizationProjectThreadMessages)
        .where(eq(photoDigitizationProjectThreadMessages.id, messageId as any));

      // Update thread message count
      const threadId = message.threadId;
      await this.db
        .update(photoDigitizationProjectThreads)
        .set({
          messageCount: sql`CAST((CAST(${photoDigitizationProjectThreads.messageCount} AS INTEGER) - 1) AS TEXT)`,
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreads.id, threadId));

      return { success: true };
    } catch (error) {
      throw new Error(
        `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Mark message as read
   * @param messageId - The message ID
   * @param userId - The ID of the user reading
   */
  async markMessageAsRead(messageId: string, userId: string) {
    try {
      const [updated] = await this.db
        .update(photoDigitizationProjectThreadMessages)
        .set({
          status: "read",
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationProjectThreadMessages.id, messageId as any))
        .returning();

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to mark message as read: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sanitize message content to prevent XSS
   * Basic HTML/script tag removal
   */
  private sanitizeContent(content: string): string {
    // Remove script tags and dangerous HTML
    let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    sanitized = sanitized.replace(/javascript:/gi, "");
    return sanitized.trim();
  }
}
