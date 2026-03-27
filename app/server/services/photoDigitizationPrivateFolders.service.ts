import { eq, and } from "drizzle-orm";
import {
  photoDigitizationPrivateFolders,
  photoDigitizationFolderAccessLogs,
  photoDigitizationOrders,
} from "../../db/schema";
import type { FolderAccessType } from "../../db/schema/photoDigitizationFolderAccessLogs";

/**
 * Private Folders Service
 * Manages access-controlled private folders for photo digitization projects
 * Handles folder creation, access control, and audit logging
 */
export class PhotoDigitizationPrivateFoldersService {
  constructor(private db: any) {}

  /**
   * Create a private folder for an order
   * @param orderId - The order ID to create the folder for
   * @param userId - The ID of the user creating the folder
   * @param folderName - Name of the folder
   * @param description - Optional description
   */
  async createPrivateFolder(
    orderId: string,
    userId: string,
    folderName: string,
    description?: string
  ) {
    try {
      // Verify the order exists
      const [order] = await this.db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.id, orderId));

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Create the folder
      const [folder] = await this.db
        .insert(photoDigitizationPrivateFolders)
        .values({
          orderId,
          folderName,
          description,
          createdBy: userId as any,
        })
        .returning();

      // Log the access
      await this.logFolderAccess(
        folder.id,
        userId,
        "create",
        undefined,
        "Private folder created"
      );

      return folder;
    } catch (error) {
      throw new Error(
        `Failed to create private folder: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a private folder by ID with access control check
   * @param folderId - The folder ID
   * @param userId - The ID of the user requesting access
   * @param isAdmin - Whether the user is an admin
   */
  async getPrivateFolder(folderId: string, userId: string, isAdmin: boolean) {
    try {
      // Get the folder
      const [folder] = await this.db
        .select()
        .from(photoDigitizationPrivateFolders)
        .where(eq(photoDigitizationPrivateFolders.id, folderId));

      if (!folder) {
        throw new Error(`Private folder ${folderId} not found`);
      }

      // Check access - only creators and admins can access
      const canAccess =
        isAdmin || folder.createdBy === (userId as any);
      if (!canAccess) {
        throw new Error(
          "Access denied: You do not have permission to access this folder"
        );
      }

      // Log the access
      await this.logFolderAccess(
        folderId,
        userId,
        "view",
        undefined,
        "Folder accessed"
      );

      return folder;
    } catch (error) {
      throw new Error(
        `Failed to get private folder: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all private folders for an order
   * @param orderId - The order ID
   * @param userId - The ID of the user requesting
   * @param isAdmin - Whether the user is an admin
   */
  async getFoldersForOrder(orderId: string, userId: string, isAdmin: boolean) {
    try {
      // Get all folders for this order
      const folders = await this.db
        .select()
        .from(photoDigitizationPrivateFolders)
        .where(eq(photoDigitizationPrivateFolders.orderId, orderId));

      // Filter by access control - only admins can see all, others see only their own
      const accessible = folders.filter(
        (f: typeof folders[0]) => isAdmin || f.createdBy === (userId as any)
      );

      // Log view access for each folder
      for (const folder of accessible) {
        await this.logFolderAccess(
          folder.id,
          userId,
          "view",
          undefined,
          "Folder list accessed"
        ).catch(() => {
          // Silently fail on audit log errors
        });
      }

      return accessible;
    } catch (error) {
      throw new Error(
        `Failed to get folders for order: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update a private folder
   * @param folderId - The folder ID
   * @param userId - The ID of the user updating
   * @param isAdmin - Whether the user is an admin
   * @param updates - Partial updates to the folder
   */
  async updatePrivateFolder(
    folderId: string,
    userId: string,
    isAdmin: boolean,
    updates: { folderName?: string; description?: string; isLocked?: boolean; lockedReason?: string; lockedUntil?: Date }
  ) {
    try {
      // Get the folder
      const [folder] = await this.db
        .select()
        .from(photoDigitizationPrivateFolders)
        .where(eq(photoDigitizationPrivateFolders.id, folderId));

      if (!folder) {
        throw new Error(`Private folder ${folderId} not found`);
      }

      // Check access - only creators and admins can update
      const canUpdate =
        isAdmin || folder.createdBy === (userId as any);
      if (!canUpdate) {
        throw new Error(
          "Access denied: You do not have permission to update this folder"
        );
      }

      // Update the folder
      const [updated] = await this.db
        .update(photoDigitizationPrivateFolders)
        .set({
          ...updates,
          lastModifiedBy: userId as any,
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationPrivateFolders.id, folderId))
        .returning();

      // Log the access
      await this.logFolderAccess(
        folderId,
        userId,
        "edit",
        undefined,
        `Folder updated: ${JSON.stringify(updates)}`
      );

      return updated;
    } catch (error) {
      throw new Error(
        `Failed to update private folder: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get access audit log for a folder
   * @param folderId - The folder ID
   * @param userId - The ID of the user requesting logs
   * @param isAdmin - Whether the user is an admin
   */
  async getAccessLog(folderId: string, userId: string, isAdmin: boolean) {
    try {
      // Verify folder exists and user has access
      await this.getPrivateFolder(folderId, userId, isAdmin);

      // Get audit logs
      const logs = await this.db
        .select()
        .from(photoDigitizationFolderAccessLogs)
        .where(
          eq(photoDigitizationFolderAccessLogs.folderId, folderId)
        )
        .orderBy(photoDigitizationFolderAccessLogs.timestamp);

      return logs;
    } catch (error) {
      throw new Error(
        `Failed to get access log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Log folder access for audit trail
   * @param folderId - The folder ID
   * @param userId - The ID of the user accessing
   * @param accessType - Type of access (view, create, edit, delete, download)
   * @param itemId - Optional ID of specific item accessed
   * @param description - Optional description of the access
   */
  async logFolderAccess(
    folderId: string,
    userId: string,
    accessType: FolderAccessType,
    itemId?: string,
    description?: string
  ) {
    try {
      await this.db.insert(photoDigitizationFolderAccessLogs).values({
        folderId: folderId as any,
        accessedBy: userId as any,
        accessType,
        itemId: itemId as any,
        description,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to log folder access:", error);
      // Don't throw - audit logging should not block operations
    }
  }

  /**
   * Lock a private folder (prevents modifications)
   * @param folderId - The folder ID
   * @param userId - The ID of the user locking
   * @param isAdmin - Whether the user is an admin
   * @param reason - Reason for locking
   * @param until - Optional timestamp for automatic unlock
   */
  async lockFolder(
    folderId: string,
    userId: string,
    isAdmin: boolean,
    reason: string,
    until?: Date
  ) {
    return this.updatePrivateFolder(
      folderId,
      userId,
      isAdmin,
      {
        isLocked: true,
        lockedReason: reason,
        lockedUntil: until,
      }
    );
  }

  /**
   * Unlock a private folder
   * @param folderId - The folder ID
   * @param userId - The ID of the user unlocking
   * @param isAdmin - Whether the user is an admin
   */
  async unlockFolder(
    folderId: string,
    userId: string,
    isAdmin: boolean
  ) {
    return this.updatePrivateFolder(
      folderId,
      userId,
      isAdmin,
      {
        isLocked: false,
        lockedReason: undefined,
        lockedUntil: undefined,
      }
    );
  }
}
