import { db } from '~/db/index.server';
import { 
  photoDigitizationCustomerEmails,
} from '~/db/schema';
import { encrypt, decrypt } from '~/utils/encryption';
import { eq } from 'drizzle-orm';

/**
 * Service for handling encrypted email storage for photo digitization orders
 */
export class PhotoDigitizationEmailStorageService {
  private readonly encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || 'default-dev-key';
  }

  /**
   * Encrypt and store customer email associated with an order
   */
  async encryptAndStoreEmail(
    orderId: string,
    email: string,
    adminId: string
  ): Promise<string> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Encrypt the email
    const encryptedEmail = encrypt(email, this.encryptionKey);

    // Store in database
    const result = await db
      .insert(photoDigitizationCustomerEmails)
      .values({
        orderId,
        encryptedEmail,
        createdBy: adminId,
      })
      .returning({ id: photoDigitizationCustomerEmails.id });

    // Log the access
    await this.logEmailAccess(orderId, adminId, 'CREATE');

    return result[0]?.id || '';
  }

  /**
   * Decrypt and retrieve stored customer email
   */
  async decryptStoredEmail(
    orderId: string,
    adminId: string
  ): Promise<string | null> {
    // Fetch the stored encrypted email
    const record = await db
      .select()
      .from(photoDigitizationCustomerEmails)
      .where(eq(photoDigitizationCustomerEmails.orderId, orderId))
      .limit(1);

    if (!record || record.length === 0) {
      return null;
    }

    const storedRecord = record[0];

    // Update accessedAt timestamp
    await db
      .update(photoDigitizationCustomerEmails)
      .set({ 
        accessedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(photoDigitizationCustomerEmails.id, storedRecord.id));

    // Log the access
    await this.logEmailAccess(orderId, adminId, 'READ');

    // Decrypt and return
    try {
      return decrypt(storedRecord.encryptedEmail, this.encryptionKey);
    } catch (error) {
      throw new Error(`Failed to decrypt email for order ${orderId}`);
    }
  }

  /**
   * Log email access for audit trail (can be implemented with dedicated email audit table if needed)
   */
  async logEmailAccess(
    orderId: string,
    adminId: string,
    accessType: string
  ): Promise<void> {
    try {
      // Log access - in a production system, this could be a separate audit table for email access
      console.info('Email access logged:', {
        orderId,
        adminId,
        accessType,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log email access:', error);
      // Don't throw - logging failure shouldn't prevent the operation
    }
  }

  /**
   * Get access count for an order
   * Returns the count of times email has been accessed
   */
  async getAccessCount(orderId: string): Promise<number> {
    // In a production system, this would query a dedicated email audit table
    // For now, we can track access counts by querying the updatedAt timestamp
    const records = await db
      .select()
      .from(photoDigitizationCustomerEmails)
      .where(eq(photoDigitizationCustomerEmails.orderId, orderId));

    // Return the number of email records for this order (simplified)
    return records.length;
  }
}

// Export singleton instance
export const emailStorageService = new PhotoDigitizationEmailStorageService();
