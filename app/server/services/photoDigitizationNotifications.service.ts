import { db } from '~/db/index.server';
import { notificationSettings, notifications } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { NotificationService } from './notifications.service';
import { Resend } from 'resend';

export type OrderStatus =
  | 'inquiry_submitted'
  | 'quantity_verified'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'in_processing'
  | 'completed'
  | 'cancelled';

interface OrderData {
  id: string;
  customerId: string;
  status: OrderStatus;
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
 * Status messages and next milestones
 */
const statusMessages: Record<
  OrderStatus,
  { title: string; message: string; nextMilestone: string }
> = {
  inquiry_submitted: {
    title: 'Order Submitted',
    message: 'Thank you for submitting your photo digitization inquiry!',
    nextMilestone: 'Quantity verification (expected within 24 hours)',
  },
  quantity_verified: {
    title: 'Quantity Verified',
    message: 'Your order quantity has been verified and confirmed.',
    nextMilestone: 'Payment confirmation (expected within 24 hours)',
  },
  payment_pending: {
    title: 'Payment Pending',
    message: 'Your order is awaiting payment confirmation.',
    nextMilestone: 'Processing will begin once payment is confirmed',
  },
  payment_confirmed: {
    title: 'Payment Confirmed',
    message: 'Your payment has been successfully received and processed.',
    nextMilestone: 'Processing will begin soon',
  },
  in_processing: {
    title: 'In Processing',
    message: 'Your photos are currently being digitized.',
    nextMilestone: 'Completion expected based on order size',
  },
  completed: {
    title: 'Order Completed',
    message: 'Your photo digitization is complete! Your files are ready for download.',
    nextMilestone: 'Files will be available for 30 days',
  },
  cancelled: {
    title: 'Order Cancelled',
    message: 'Your photo digitization order has been cancelled.',
    nextMilestone: 'Please contact support if you have any questions',
  },
};

/**
 * PhotoDigitizationNotificationsService handles sending notifications for photo digitization orders
 */
export class PhotoDigitizationNotificationsService {
  /**
   * Send status notification to customer
   * Respects user notification preferences and SLA (within 2 hours)
   */
  static async sendStatusNotification(
    order: OrderData,
    status: OrderStatus,
    userId: string
  ): Promise<void> {
    try {
      const statusInfo = statusMessages[status];

      // Get user's notification preferences
      const [userSettings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId))
        .limit(1);

      // Default to email if no preferences set
      const preferredChannel = userSettings?.photoDigitizationPreferredChannel || 'email';
      const notificationsEnabled = userSettings?.photoDigitizationNotifications !== false;
      const emailNotificationsEnabled = userSettings?.photoDigitizationEmailNotifications !== false;

      if (!notificationsEnabled) {
        return;
      }

      // Validate contact methods before sending
      const hasValidEmail = this.validateEmail(order.customerEmail);
      const hasValidPhone = order.customerPhone ? this.validatePhone(order.customerPhone) : false;

      // Send notifications based on preferred channel, falling back to default
      if (preferredChannel === 'email' && hasValidEmail && emailNotificationsEnabled) {
        await this.sendEmailNotification(order, statusInfo);
      } else if (preferredChannel === 'phone' && hasValidPhone) {
        // SMS notifications would be sent here (requires SMS service)
        // For now, fall back to email if phone is not available
        if (hasValidEmail && emailNotificationsEnabled) {
          await this.sendEmailNotification(order, statusInfo);
        }
      } else if (preferredChannel === 'in_app') {
        // Send in-app notification
        await this.sendInAppNotification(order, statusInfo, userId);
      } else {
        // Default to email if preferred channel is unavailable
        if (hasValidEmail && emailNotificationsEnabled) {
          await this.sendEmailNotification(order, statusInfo);
        }
      }
    } catch (error) {
      console.error(
        'Error sending status notification:',
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - notifications should not break the main flow
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    order: OrderData,
    statusInfo: { title: string; message: string; nextMilestone: string }
  ): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 20px;
    }
    .status-message {
      font-size: 16px;
      margin-bottom: 30px;
      color: #333;
    }
    .order-card {
      background-color: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .order-item {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      font-size: 14px;
    }
    .order-label {
      color: #666;
      font-weight: 500;
    }
    .order-value {
      color: #333;
      font-weight: 600;
    }
    .milestone-section {
      background-color: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
    }
    .milestone-title {
      font-weight: 600;
      color: #0369a1;
      margin-bottom: 8px;
    }
    .milestone-text {
      font-size: 14px;
      color: #333;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
    }
    .footer-link {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusInfo.title}</h1>
    </div>
    
    <div class="content">
      <p class="status-message">${statusInfo.message}</p>
      
      <div class="order-card">
        <div class="order-item">
          <span class="order-label">Order ID:</span>
          <span class="order-value">${order.id}</span>
        </div>
        <div class="order-item">
          <span class="order-label">Item Type:</span>
          <span class="order-value">${order.itemType === 'loose_slides' ? 'Loose Slides' : 'Carousel'}</span>
        </div>
        <div class="order-item">
          <span class="order-label">Quantity:</span>
          <span class="order-value">${order.quantity} items</span>
        </div>
        <div class="order-item">
          <span class="order-label">Estimated Price:</span>
          <span class="order-value">${order.estimatedPrice ? '$' + order.estimatedPrice : 'TBD'}</span>
        </div>
        <div class="order-item">
          <span class="order-label">Status:</span>
          <span class="order-value">${this.formatStatus(order.status)}</span>
        </div>
      </div>
      
      <div class="milestone-section">
        <div class="milestone-title">Next Step:</div>
        <div class="milestone-text">${statusInfo.nextMilestone}</div>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions about your order or need further assistance, please don't hesitate to contact our support team.
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
      <p style="margin-top: 10px;">
        <a href="https://familyhub.com/orders" class="footer-link">View My Orders</a> | 
        <a href="https://familyhub.com/support" class="footer-link">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY || '');
      await resend.emails.send({
        from: 'noreply@familyhub.com',
        to: order.customerEmail,
        subject: `Photo Digitization Order Update: ${statusInfo.title}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    order: OrderData,
    statusInfo: { title: string; message: string; nextMilestone: string },
    userId: string
  ): Promise<void> {
    try {
      // Get the family ID from the user (would need to be passed or retrieved)
      // For now, we'll use a placeholder - this would need to be updated based on your user/family relationship
      const familyId = 'default-family'; // This should be the actual family ID

      await NotificationService.createNotification({
        userId,
        familyId,
        message: `${statusInfo.title}: ${statusInfo.message} (Order #${order.id})`,
        type: 'info',
      });
    } catch (error) {
      console.error('Failed to send in-app notification:', error);
    }
  }

  /**
   * Validate email address format
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (basic validation)
   */
  private static validatePhone(phone: string): boolean {
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^\d{10,}$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(digitsOnly);
  }

  /**
   * Format status for display
   */
  private static formatStatus(status: OrderStatus): string {
    const formatter: Record<OrderStatus, string> = {
      inquiry_submitted: 'Inquiry Submitted',
      quantity_verified: 'Quantity Verified',
      payment_pending: 'Payment Pending',
      payment_confirmed: 'Payment Confirmed',
      in_processing: 'In Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return formatter[status] || status;
  }
}
