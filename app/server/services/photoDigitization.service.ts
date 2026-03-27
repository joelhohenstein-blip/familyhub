import { db } from '~/db/index.server';
import {
  photoDigitizationOrders,
  photoDigitizationStatusHistory,
  orderStatusEnum,
  itemTypeEnum,
} from '~/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotificationService } from './notifications.service';
import { PhotoDigitizationNotificationsService } from './photoDigitizationNotifications.service';

export type OrderStatus = typeof orderStatusEnum.enumValues[number];
export type ItemType = typeof itemTypeEnum.enumValues[number];

export interface SubmitOrderInput {
  customerId: string;
  itemType: ItemType;
  quantity: number;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
  changedBy: string; // admin user ID
  notes?: string;
}

export interface OrderResult {
  id: string;
  customerId: string;
  status: string;
  itemType: string;
  quantity: number;
  estimatedPrice: string | null;
  submittedAt: Date;
  dueDate: Date | null;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PhotoDigitizationService handles all photo digitization order operations
 */

// Valid status transitions - defines which statuses can follow which
const VALID_TRANSITIONS: Record<string, string[]> = {
  'inquiry_submitted': ['quantity_verified', 'cancelled'],
  'quantity_verified': ['payment_pending', 'cancelled'],
  'payment_pending': ['payment_confirmed', 'cancelled'],
  'payment_confirmed': ['in_processing', 'cancelled'],
  'in_processing': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
};

export class PhotoDigitizationService {
  /**
   * Submit a new photo digitization inquiry
   */
  static async submitOrder(input: SubmitOrderInput): Promise<OrderResult> {
    try {
      // Validate input
      if (!input.customerId || !input.customerEmail) {
        throw new Error('Customer ID and email are required');
      }

      if (input.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Create the order
      const [newOrder] = await db
        .insert(photoDigitizationOrders)
        .values({
          customerId: input.customerId,
          status: 'inquiry_submitted',
          itemType: input.itemType,
          quantity: input.quantity,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Send notification to customer about inquiry submission
      await PhotoDigitizationNotificationsService.sendStatusNotification(
        newOrder as any,
        'inquiry_submitted',
        input.customerId
      );

      return newOrder as OrderResult;
    } catch (error) {
      throw new Error(`Failed to submit order: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update order status and track history
   */
  static async updateOrderStatus(input: UpdateOrderStatusInput): Promise<OrderResult> {
    try {
      // Get current order
      const [currentOrder] = await db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.id, input.orderId))
        .limit(1);

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const previousStatus = currentOrder.status;

      // Validate transition is allowed
      const allowedTransitions = VALID_TRANSITIONS[previousStatus];
      if (!allowedTransitions || !allowedTransitions.includes(input.newStatus)) {
        throw new Error(`Invalid status transition: cannot move from '${previousStatus}' to '${input.newStatus}'`);
      }

      // Update order status
      const [updatedOrder] = await db
        .update(photoDigitizationOrders)
        .set({
          status: input.newStatus,
          updatedAt: new Date(),
        })
        .where(eq(photoDigitizationOrders.id, input.orderId))
        .returning();

      // Record status change in history
      await db.insert(photoDigitizationStatusHistory).values({
        orderId: input.orderId,
        previousStatus: previousStatus as any,
        newStatus: input.newStatus,
        changedBy: input.changedBy,
        notes: input.notes,
        changedAt: new Date(),
        createdAt: new Date(),
      });

      // Send status update notification
      await PhotoDigitizationNotificationsService.sendStatusNotification(
        updatedOrder as any,
        input.newStatus,
        currentOrder.customerId
      );

      return updatedOrder as OrderResult;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get order status
   */
  static async getOrderStatus(orderId: string): Promise<OrderResult> {
    try {
      const [order] = await db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      return order as OrderResult;
    } catch (error) {
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get order status history
   */
  static async getOrderHistory(orderId: string) {
    try {
      const history = await db
        .select()
        .from(photoDigitizationStatusHistory)
        .where(eq(photoDigitizationStatusHistory.orderId, orderId))
        .orderBy((table) => sql`${table.changedAt} DESC`);

      return history;
    } catch (error) {
      throw new Error(`Failed to get order history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all orders for a customer
   */
  static async getCustomerOrders(customerId: string) {
    try {
      const orders = await db
        .select()
        .from(photoDigitizationOrders)
        .where(eq(photoDigitizationOrders.customerId, customerId))
        .orderBy((table) => sql`${table.submittedAt} DESC`);

      return orders;
    } catch (error) {
      throw new Error(`Failed to get customer orders: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get photo digitization dashboard data with order summaries, payment stats, and recent orders
   */
  static async getPhotoDigitizationDashboardData() {
    try {
      // Get all orders
      const allOrders = await db
        .select()
        .from(photoDigitizationOrders)
        .orderBy((table) => sql`${table.submittedAt} DESC`);

      // Calculate order summaries by status
      const orderSummaries = {
        total: allOrders.length,
        inquiry_submitted: allOrders.filter((o) => o.status === 'inquiry_submitted').length,
        quantity_verified: allOrders.filter((o) => o.status === 'quantity_verified').length,
        payment_pending: allOrders.filter((o) => o.status === 'payment_pending').length,
        payment_confirmed: allOrders.filter((o) => o.status === 'payment_confirmed').length,
        in_processing: allOrders.filter((o) => o.status === 'in_processing').length,
        completed: allOrders.filter((o) => o.status === 'completed').length,
        cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
      };

      // Calculate payment statistics
      const paymentStats = {
        totalOrders: allOrders.length,
        pendingPayment: allOrders.filter((o) => o.status === 'payment_pending').length,
        completedOrders: allOrders.filter((o) => o.status === 'completed').length,
        totalQuantity: allOrders.reduce((sum, o) => sum + o.quantity, 0),
        averageQuantityPerOrder:
          allOrders.length > 0
            ? Math.round((allOrders.reduce((sum, o) => sum + o.quantity, 0) / allOrders.length) * 100) / 100
            : 0,
      };

      // Get recent orders (last 10)
      const recentOrders = allOrders.slice(0, 10).map((order) => ({
        id: order.id,
        customerId: order.customerId,
        status: order.status,
        itemType: order.itemType,
        quantity: order.quantity,
        estimatedPrice: order.estimatedPrice,
        submittedAt: order.submittedAt,
        dueDate: order.dueDate,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
      }));

      return {
        orderSummaries,
        paymentStats,
        recentOrders,
      };
    } catch (error) {
      throw new Error(
        `Failed to get photo digitization dashboard data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get dashboard data with proper order filtering and summary statistics
   * Provides a clean interface for dashboard queries with configurable filtering
   */
  static async getDashboardData(options?: { limit?: number; status?: OrderStatus }) {
    try {
      // Get all orders ordered by submission date (newest first)
      // Build query with optional status filter
      const baseQuery = db.select().from(photoDigitizationOrders);
      
      const query = options?.status 
        ? baseQuery.where(eq(photoDigitizationOrders.status, options.status))
        : baseQuery;
      
      const allOrders = await query.orderBy((table) => sql`${table.submittedAt} DESC`);

      // Apply limit if provided (default to all)
      const limit = options?.limit || allOrders.length;
      const filteredOrders = allOrders.slice(0, limit);

      // Calculate comprehensive summary statistics
      const summaryStats = {
        total: allOrders.length,
        displayed: filteredOrders.length,
        byStatus: {
          inquiry_submitted: allOrders.filter((o) => o.status === 'inquiry_submitted').length,
          quantity_verified: allOrders.filter((o) => o.status === 'quantity_verified').length,
          payment_pending: allOrders.filter((o) => o.status === 'payment_pending').length,
          payment_confirmed: allOrders.filter((o) => o.status === 'payment_confirmed').length,
          in_processing: allOrders.filter((o) => o.status === 'in_processing').length,
          completed: allOrders.filter((o) => o.status === 'completed').length,
          cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
        },
        quantityStats: {
          total: allOrders.reduce((sum, o) => sum + o.quantity, 0),
          average:
            allOrders.length > 0
              ? Math.round((allOrders.reduce((sum, o) => sum + o.quantity, 0) / allOrders.length) * 100) / 100
              : 0,
          min: allOrders.length > 0 ? Math.min(...allOrders.map((o) => o.quantity)) : 0,
          max: allOrders.length > 0 ? Math.max(...allOrders.map((o) => o.quantity)) : 0,
        },
        itemTypeDistribution: {
          loose_slides: allOrders.filter((o) => o.itemType === 'loose_slides').length,
          carousel: allOrders.filter((o) => o.itemType === 'carousel').length,
        },
      };

      // Format orders for display
      const orders = filteredOrders.map((order) => ({
        id: order.id,
        customerId: order.customerId,
        status: order.status,
        itemType: order.itemType,
        quantity: order.quantity,
        estimatedPrice: order.estimatedPrice,
        submittedAt: order.submittedAt,
        dueDate: order.dueDate,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        notes: order.notes,
      }));

      return {
        orders,
        summaryStats,
        metadata: {
          filtered: !!options?.status,
          filterStatus: options?.status || null,
          limit: limit,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get dashboard data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
