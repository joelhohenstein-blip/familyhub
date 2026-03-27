import Stripe from 'stripe';
import { db } from '~/db/index.server';
import { invoices, auditLog } from '~/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export interface InvoiceItem {
  description: string;
  amount: number; // in cents
  quantity?: number;
}

/**
 * InvoiceService handles invoice creation and management
 */
export class InvoiceService {
  /**
   * Create an invoice from a Stripe event
   */
  static async createInvoiceFromStripeEvent(
    stripeInvoiceId: string,
    stripeInvoice: Stripe.Invoice,
    userId: string
  ): Promise<string> {
    try {
      // Check if invoice already exists
      const existing = await db.query.invoices.findFirst({
        where: eq(invoices.stripeInvoiceId, stripeInvoiceId),
      });

      if (existing) {
        return existing.id;
      }

      // Extract items from Stripe invoice
      const items = stripeInvoice.lines.data.map((line) => ({
        description: line.description || 'Subscription charge',
        amount: line.amount || 0,
        quantity: line.quantity || 1,
      }));

      // Create invoice record
      const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [created] = await db
        .insert(invoices)
        .values({
          id: invoiceId,
          userId,
          stripeInvoiceId,
          amount: stripeInvoice.amount_paid || stripeInvoice.amount_due || 0,
          currency: (stripeInvoice.currency?.toUpperCase() || 'USD') as any,
          status: (stripeInvoice.status || 'paid') as any,
          issuedAt: new Date((stripeInvoice.created || Date.now() / 1000) * 1000),
          dueAt: (stripeInvoice as any).due_date
            ? new Date((stripeInvoice as any).due_date * 1000)
            : null,
          paidAt:
            (stripeInvoice as any).paid && (stripeInvoice as any).paid_at
              ? new Date((stripeInvoice as any).paid_at * 1000)
              : null,
          description: `Invoice for ${stripeInvoice.description || 'subscription'} on ${new Date(stripeInvoice.created * 1000).toLocaleDateString()}`,
          itemsMetadata: items,
          pdfUrl: stripeInvoice.invoice_pdf || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Log audit
      await db.insert(auditLog).values({
        actionType: 'invoice_created' as any,
        actorId: userId,
        targetId: invoiceId,
        targetType: 'invoice' as any,
        description: `Created invoice from Stripe event: ${stripeInvoiceId}`,
      });

      return invoiceId;
    } catch (error) {
      console.error('Error creating invoice from Stripe event:', error);
      throw error;
    }
  }

  /**
   * Retrieve an invoice by ID
   */
  static async retrieveInvoice(invoiceId: string): Promise<any> {
    try {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });

      return invoice;
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      throw error;
    }
  }

  /**
   * Retrieve invoice by Stripe ID
   */
  static async retrieveByStripeId(stripeInvoiceId: string): Promise<any> {
    try {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.stripeInvoiceId, stripeInvoiceId),
      });

      return invoice;
    } catch (error) {
      console.error('Error retrieving invoice by Stripe ID:', error);
      throw error;
    }
  }

  /**
   * Get all invoices for a user
   */
  static async getInvoicesByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await db.query.invoices.findMany({
        where: eq(invoices.userId, userId),
        orderBy: (inv) => inv.issuedAt,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error getting invoices for user:', error);
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: string,
    paidAt?: Date
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (paidAt) {
        updateData.paidAt = paidAt;
      }

      await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, invoiceId));

      // Log audit
      await db.insert(auditLog).values({
        actionType: 'invoice_updated' as any,
        targetId: invoiceId,
        targetType: 'invoice' as any,
        description: `Updated invoice status to: ${status}`,
      } as any);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Generate PDF URL for an invoice (using Stripe's hosted PDF)
   */
  static async getInvoicePdfUrl(stripeInvoiceId: string): Promise<string | null> {
    try {
      const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
      return stripeInvoice.invoice_pdf || null;
    } catch (error) {
      console.error('Error getting invoice PDF URL:', error);
      return null;
    }
  }

  /**
   * Send invoice to user via email
   * This is called by the email service
   */
  static async recordInvoiceSent(invoiceId: string, userId: string): Promise<void> {
    try {
      // Log the email send
      await db.insert(auditLog).values({
        actionType: 'invoice_email_sent',
        actorId: userId,
        targetId: invoiceId,
        targetType: 'invoice',
        description: 'Sent invoice email to user',
      });
    } catch (error) {
      console.error('Error recording invoice sent:', error);
      throw error;
    }
  }
}
