import { Resend } from 'resend';
import { db } from '~/db/index.server';
import { auditLog } from '~/db/schema';

// Lazy initialize Resend to avoid errors if API key is missing
let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function getResendOrThrow(): Resend {
  const client = getResend();
  if (!client) {
    throw new Error('Email service not configured. Set RESEND_API_KEY environment variable.');
  }
  return client;
}

export interface SubscriptionEmailData {
  email: string;
  userName: string;
  tierName: string;
  amount?: number; // in cents
  nextBillingDate?: Date;
  features?: string[];
  billingInterval?: 'monthly' | 'yearly';
}

export interface InvoiceEmailData {
  email: string;
  userName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  issuedDate: Date;
  dueDate?: Date;
  paidDate?: Date;
  items: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  pdfUrl?: string;
}

export interface FamilyInvitationEmailData {
  email: string;
  invitedByName: string;
  familySurname: string;
  role: 'admin' | 'member' | 'guest';
  inviteLink: string;
  expiresAt: Date;
}

export interface DonationConfirmationEmailData {
  email: string;
  userName: string;
  amount: number; // in dollars
  feesAmount: number; // in dollars
  netAmount: number; // in dollars
  tierLabel: string;
  donationDate: Date;
  transactionId: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * EmailService handles all email operations with retry logic
 */
export class EmailService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000; // 1 second base delay

  /**
   * Format cents to currency string
   */
  private static formatCurrency(cents: number, currencyCode = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  /**
   * Format date to readable string
   */
  private static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  /**
   * Send subscription created email with retry logic
   */
  static async sendSubscriptionCreatedEmail(
    data: SubscriptionEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const formattedAmount = data.amount
          ? this.formatCurrency(data.amount)
          : 'Free';
        const nextBillingStr = data.nextBillingDate
          ? this.formatDate(data.nextBillingDate)
          : 'N/A';
        const billingCycle = data.billingInterval === 'yearly' ? 'yearly' : 'monthly';

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmation</title>
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
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .plan-card {
      background-color: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .plan-name {
      font-size: 24px;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 10px;
    }
    .plan-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 15px 0;
    }
    .detail-item {
      font-size: 14px;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
      margin-top: 4px;
    }
    .features-section {
      margin-top: 30px;
    }
    .features-section h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
    }
    .features-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .features-list li {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #555;
    }
    .features-list li:last-child {
      border-bottom: none;
    }
    .features-list li:before {
      content: "✓ ";
      color: #667eea;
      font-weight: 600;
      margin-right: 8px;
    }
    .next-steps {
      background-color: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
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
    .unsubscribe {
      margin-top: 10px;
      font-size: 11px;
    }
    .unsubscribe a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Family Hub!</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${data.userName},
      </div>
      
      <p>Thank you for subscribing to Family Hub! Your subscription is now active and ready to use.</p>
      
      <div class="plan-card">
        <div class="plan-name">${data.tierName}</div>
        <div class="plan-details">
          <div class="detail-item">
            <div class="detail-label">Amount</div>
            <div class="detail-value">${formattedAmount}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Billing Cycle</div>
            <div class="detail-value">${billingCycle}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Next Billing Date</div>
            <div class="detail-value">${nextBillingStr}</div>
          </div>
        </div>
      </div>
      
      ${
        data.features && data.features.length > 0
          ? `
      <div class="features-section">
        <h3>What's Included in Your Plan</h3>
        <ul class="features-list">
          ${data.features.map((feature) => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }
      
      <div class="next-steps">
        <strong>Next Steps:</strong><br>
        Head to your dashboard to start enjoying all the features of Family Hub. You can invite family members, create shared content, and more!
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions or need support, please don't hesitate to contact our support team.
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
      <div class="unsubscribe">
        <a href="https://familyhub.com/manage-subscription">Manage Subscription</a> | 
        <a href="https://familyhub.com/support">Support</a>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `Welcome to ${data.tierName} - Subscription Confirmed`,
          html: htmlContent,
        });

        return result;
      },
      'sendSubscriptionCreatedEmail',
      userId
    );
  }

  /**
   * Send subscription renewal email with retry logic
   */
  static async sendSubscriptionRenewalEmail(
    data: SubscriptionEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const formattedAmount = data.amount
          ? this.formatCurrency(data.amount)
          : 'Free';
        const nextBillingStr = data.nextBillingDate
          ? this.formatDate(data.nextBillingDate)
          : 'N/A';

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewed</title>
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
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .invoice-card {
      background-color: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .invoice-item {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 14px;
    }
    .invoice-label {
      color: #666;
    }
    .invoice-value {
      color: #333;
      font-weight: 600;
    }
    .total-amount {
      background-color: white;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: 600;
    }
    .info-box {
      background-color: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
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
    .unsubscribe {
      margin-top: 10px;
      font-size: 11px;
    }
    .unsubscribe a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Renewed</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${data.userName},
      </div>
      
      <p>Your Family Hub subscription has been successfully renewed!</p>
      
      <div class="invoice-card">
        <div class="invoice-item">
          <span class="invoice-label">Plan:</span>
          <span class="invoice-value">${data.tierName}</span>
        </div>
        <div class="invoice-item">
          <span class="invoice-label">Amount Charged:</span>
          <span class="invoice-value">${formattedAmount}</span>
        </div>
        <div class="invoice-item">
          <span class="invoice-label">Renewal Date:</span>
          <span class="invoice-value">${this.formatDate(new Date())}</span>
        </div>
        <div class="invoice-item">
          <span class="invoice-label">Next Billing Date:</span>
          <span class="invoice-value">${nextBillingStr}</span>
        </div>
        <div class="total-amount">
          <span>Total:</span>
          <span>${formattedAmount}</span>
        </div>
      </div>
      
      <div class="info-box">
        <strong>Thank you for your continued subscription!</strong><br>
        Your ${data.tierName} plan is now active until ${nextBillingStr}. Continue enjoying all the features and benefits of Family Hub.
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions about your bill or need to manage your subscription, please contact our support team.
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
      <div class="unsubscribe">
        <a href="https://familyhub.com/manage-subscription">Manage Subscription</a> | 
        <a href="https://familyhub.com/support">Support</a>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `Your Subscription Renewal Receipt - ${data.tierName}`,
          html: htmlContent,
        });

        return result;
      },
      'sendSubscriptionRenewalEmail',
      userId
    );
  }

  /**
   * Send subscription cancellation email with retry logic
   */
  static async sendSubscriptionCancelledEmail(
    data: SubscriptionEmailData,
    userId: string,
    cancellationReason?: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
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
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .notice-card {
      background-color: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notice-title {
      font-size: 18px;
      font-weight: 600;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .info-item {
      margin: 10px 0;
      font-size: 14px;
      color: #666;
    }
    .info-label {
      font-weight: 600;
      color: #333;
    }
    .reactivate-section {
      background-color: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
      font-size: 14px;
      color: #333;
    }
    .reactivate-section h3 {
      margin-top: 0;
      color: #0369a1;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
    }
    .unsubscribe {
      margin-top: 10px;
      font-size: 11px;
    }
    .unsubscribe a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Cancelled</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${data.userName},
      </div>
      
      <p>We're sorry to see you go. Your Family Hub subscription has been cancelled.</p>
      
      <div class="notice-card">
        <div class="notice-title">Cancellation Details</div>
        <div class="info-item">
          <span class="info-label">Plan Cancelled:</span> ${data.tierName}
        </div>
        <div class="info-item">
          <span class="info-label">Cancellation Date:</span> ${this.formatDate(new Date())}
        </div>
        ${
          cancellationReason
            ? `<div class="info-item"><span class="info-label">Reason:</span> ${cancellationReason}</div>`
            : ''
        }
      </div>
      
      <div class="reactivate-section">
        <h3>Want to Come Back?</h3>
        <p>You can reactivate your subscription at any time. Your account data will be preserved, and you can resume enjoying all the features of Family Hub.</p>
        <p>You'll be moved to the Free plan until you choose to reactivate a paid subscription.</p>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have feedback about your experience or would like to discuss why you're leaving, we'd love to hear from you. Please reach out to our support team.
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
      <div class="unsubscribe">
        <a href="https://familyhub.com/reactivate-subscription">Reactivate Subscription</a> | 
        <a href="https://familyhub.com/support">Support</a>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: 'Your Family Hub Subscription has been Cancelled',
          html: htmlContent,
        });

        return result;
      },
      'sendSubscriptionCancelledEmail',
      userId
    );
  }

  /**
   * Send invoice email with retry logic
   */
  static async sendInvoiceEmail(
    data: InvoiceEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const formattedAmount = this.formatCurrency(data.amount, data.currency);
        const issuedDateStr = this.formatDate(data.issuedDate);
        const dueDateStr = data.dueDate ? this.formatDate(data.dueDate) : 'On receipt';

        const itemsHtml = data.items
          .map(
            (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${
              item.quantity || 1
            }x</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${this.formatCurrency(item.amount, data.currency)}</td>
        </tr>
      `
          )
          .join('');

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
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
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #333;
    }
    .invoice-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .invoice-item {
      font-size: 14px;
    }
    .invoice-label {
      color: #666;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .invoice-value {
      color: #333;
      font-weight: 600;
      font-size: 16px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .invoice-table th {
      background-color: #f3f4f6;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e5e7eb;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      padding: 20px 0;
      border-top: 2px solid #e5e7eb;
      font-size: 18px;
      font-weight: 600;
    }
    .pdf-button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 20px;
      font-weight: 600;
    }
    .pdf-button:hover {
      background-color: #764ba2;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice ${data.invoiceNumber}</h1>
    </div>

    <div class="content">
      <div class="greeting">
        Hi ${data.userName},
      </div>

      <p>Thank you for your subscription to Family Hub. Here is your invoice:</p>

      <div class="invoice-header">
        <div class="invoice-item">
          <div class="invoice-label">Invoice Number:</div>
          <div class="invoice-value">${data.invoiceNumber}</div>
        </div>
        <div class="invoice-item">
          <div class="invoice-label">Invoice Date:</div>
          <div class="invoice-value">${issuedDateStr}</div>
        </div>
        <div class="invoice-item">
          <div class="invoice-label">Due Date:</div>
          <div class="invoice-value">${dueDateStr}</div>
        </div>
        <div class="invoice-item">
          <div class="invoice-label">Status:</div>
          <div class="invoice-value" style="color: #10b981;">Paid</div>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-row">
        <div style="margin-right: 20px;">Total:</div>
        <div>${formattedAmount}</div>
      </div>

      ${
        data.pdfUrl
          ? `<a href="${data.pdfUrl}" class="pdf-button">Download PDF</a>`
          : ''
      }

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions about your invoice, please contact our support team.
      </p>
    </div>

    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `Invoice ${data.invoiceNumber} - Family Hub`,
          html: htmlContent,
        });

        return result;
      },
      'sendInvoiceEmail',
      userId
    );
  }

  /**
   * Send invoice payment confirmation email with retry logic
   */
  static async sendInvoicePaymentConfirmation(
    data: InvoiceEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const formattedAmount = this.formatCurrency(data.amount, data.currency);
        const paidDateStr = data.paidDate ? this.formatDate(data.paidDate) : this.formatDate(new Date());

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .success-icon {
      font-size: 48px;
      margin: 0;
    }
    .content {
      padding: 40px 20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .confirmation-card {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      font-size: 14px;
    }
    .info-label {
      color: #666;
    }
    .info-value {
      color: #333;
      font-weight: 600;
    }
    .total {
      border-top: 2px solid #d1fae5;
      margin-top: 16px;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: 600;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Payment Confirmed</h1>
    </div>

    <div class="content">
      <div class="greeting">
        Hi ${data.userName},
      </div>

      <p>Your payment has been successfully processed. Thank you for your subscription to Family Hub!</p>

      <div class="confirmation-card">
        <div class="info-item">
          <span class="info-label">Invoice Number:</span>
          <span class="info-value">${data.invoiceNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Amount Paid:</span>
          <span class="info-value">${formattedAmount}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Payment Date:</span>
          <span class="info-value">${paidDateStr}</span>
        </div>
        <div class="total">
          <span>Total Amount:</span>
          <span>${formattedAmount}</span>
        </div>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        Your Family Hub account is now active and ready to use. You can access all features immediately.
      </p>

      ${
        data.pdfUrl
          ? `<p style="text-align: center; margin-top: 20px;"><a href="${data.pdfUrl}" style="color: #667eea; text-decoration: none; font-weight: 600;">View Invoice PDF</a></p>`
          : ''
      }
    </div>

    <div class="footer">
      <p>&copy; 2024 Family Hub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `Payment Confirmed - Invoice ${data.invoiceNumber}`,
          html: htmlContent,
        });

        return result;
      },
      'sendInvoicePaymentConfirmation',
      userId
    );
  }

  /**
   * Send family member invitation email with retry logic
   */
  static async sendFamilyInvitationEmail(
    data: FamilyInvitationEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const expiresAtStr = this.formatDate(data.expiresAt);
        const roleDescriptions = {
          admin: 'Can manage family, members, and all settings',
          member: 'Can access all family features and content',
          guest: 'Can view content but cannot create or modify',
        };

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join a Family Hub</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 50px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 10px;
      color: #333;
      font-weight: 600;
    }
    .intro-text {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .family-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
      border-left: 5px solid #667eea;
      padding: 25px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .family-name {
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 15px;
    }
    .role-section {
      background-color: #f0f4ff;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .role-badge {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
      margin-bottom: 10px;
    }
    .role-description {
      color: #555;
      font-size: 14px;
      margin-top: 10px;
    }
    .invited-by {
      color: #999;
      font-size: 13px;
      margin-top: 15px;
    }
    .cta-section {
      margin: 35px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .link-section {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
    .link-label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .link-text {
      word-break: break-all;
      background-color: white;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 11px;
    }
    .expiry-notice {
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 13px;
      color: #92400e;
    }
    .expiry-notice strong {
      color: #78350f;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #999;
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
      <div class="header-icon">👨‍👩‍👧‍👦</div>
      <h1>Family Hub Invitation</h1>
    </div>

    <div class="content">
      <div class="greeting">
        You're invited!
      </div>

      <p class="intro-text">
        ${data.invitedByName} has invited you to join the <strong>${data.familySurname}</strong> family on Family Hub.
        Family Hub makes it easy to stay connected with your loved ones through shared messaging, photos, videos, and more.
      </p>

      <div class="family-card">
        <div class="family-name">${data.familySurname} Family</div>
        
        <div class="role-section">
          <div class="role-badge">${data.role}</div>
          <div class="role-description">
            ${roleDescriptions[data.role]}
          </div>
        </div>

        <div class="invited-by">
          Invited by <strong>${data.invitedByName}</strong>
        </div>
      </div>

      <div class="expiry-notice">
        <strong>This invitation expires on ${expiresAtStr}.</strong> Accept it before then to join the family.
      </div>

      <div class="cta-section">
        <a href="${data.inviteLink}" class="cta-button">
          Accept Invitation
        </a>
      </div>

      <div class="link-section">
        <div class="link-label">Or copy this link:</div>
        <div class="link-text">${data.inviteLink}</div>
      </div>

      <p style="margin-top: 30px; font-size: 13px; color: #666; line-height: 1.8;">
        If you have any questions about Family Hub or need help, please don't hesitate to contact our support team.
        You can also visit our help center for more information about getting started.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 10px 0;">&copy; 2024 Family Hub. All rights reserved.</p>
      <p style="margin: 10px 0;">
        <a href="https://familyhub.com/support" class="footer-link">Support</a> | 
        <a href="https://familyhub.com/privacy" class="footer-link">Privacy</a> | 
        <a href="https://familyhub.com/terms" class="footer-link">Terms</a>
      </p>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `You're invited to join the ${data.familySurname} family on Family Hub!`,
          html: htmlContent,
        });

        return result;
      },
      'sendFamilyInvitationEmail',
      userId
    );
  }

  /**
   * Send donation confirmation email with retry logic
   */
  static async sendDonationConfirmationEmail(
    data: DonationConfirmationEmailData,
    userId: string
  ): Promise<EmailSendResult> {
    return this.sendEmailWithRetry(
      async () => {
        const donationDateStr = this.formatDate(data.donationDate);
        const amountStr = this.formatCurrency(Math.round(data.amount * 100));
        const feesStr = this.formatCurrency(Math.round(data.feesAmount * 100));
        const netStr = this.formatCurrency(Math.round(data.netAmount * 100));

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 20px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #333;
    }
    .donation-details {
      background-color: #f9fafb;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
    }
    .detail-row.total {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 16px;
    }
    .detail-row.total .detail-value {
      color: #667eea;
      font-size: 18px;
    }
    .message {
      background-color: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #1e40af;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #999;
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
      <div class="header-icon">❤️</div>
      <h1>Thank You for Your Donation!</h1>
    </div>

    <div class="content">
      <div class="greeting">
        <p>Hi ${data.userName},</p>
        <p>We're incredibly grateful for your generous donation to FamilyHub. Your support helps us continue building the best family communication platform.</p>
      </div>

      <div class="donation-details">
        <div class="detail-row">
          <span class="detail-label">Donation Tier:</span>
          <span class="detail-value">${data.tierLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Your Donation:</span>
          <span class="detail-value">${amountStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Processing Fee (Stripe):</span>
          <span class="detail-value">-${feesStr}</span>
        </div>
        <div class="detail-row total">
          <span class="detail-label">FamilyHub Receives:</span>
          <span class="detail-value">${netStr}</span>
        </div>
      </div>

      <div class="message">
        <strong>Transaction ID:</strong> ${data.transactionId}<br>
        <strong>Date:</strong> ${donationDateStr}
      </div>

      <p>Your donation is 100% tax-deductible. We'll send you a tax receipt shortly.</p>

      <p>If you have any questions about your donation or need assistance, please don't hesitate to reach out to our support team.</p>

      <p>Thank you again for believing in FamilyHub!</p>

      <p>
        Warm regards,<br>
        <strong>The FamilyHub Team</strong>
      </p>
    </div>

    <div class="footer">
      <p>© 2026 FamilyHub. All rights reserved.</p>
      <p>
        <a href="https://familyhub.com/privacy" class="footer-link">Privacy Policy</a> | 
        <a href="https://familyhub.com/terms" class="footer-link">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
        `;

        const result = await getResendOrThrow().emails.send({
          from: 'noreply@familyhub.com',
          to: data.email,
          subject: `Thank You for Your ${data.tierLabel} Donation to FamilyHub`,
          html: htmlContent,
        });

        return result;
      },
      'sendDonationConfirmationEmail',
      userId
    );
  }

  /**
   * Internal method to send email with retry logic
   */
  private static async sendEmailWithRetry(
    emailFn: () => Promise<any>,
    methodName: string,
    userId: string
  ): Promise<EmailSendResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await emailFn();

        // Log successful email send
        await db.insert(auditLog).values({
          actionType: 'email_sent',
          actorId: userId,
          targetId: result.id || 'unknown',
          targetType: 'email',
          description: `${methodName}: Successfully sent email (attempt ${attempt})`,
        });

        return {
          success: true,
          messageId: result.id,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log failed attempt
        await db
          .insert(auditLog)
          .values({
            actionType: 'email_send_failed',
            actorId: userId,
            targetId: 'unknown',
            targetType: 'email',
            description: `${methodName}: Failed attempt ${attempt}/${this.MAX_RETRIES}: ${lastError.message}`,
          })
          .catch(() => {
            // Silently fail audit logging to avoid blocking email retries
          });

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Log final failure
    await db
      .insert(auditLog)
      .values({
        actionType: 'email_send_failed_final',
        actorId: userId,
        targetId: 'unknown',
        targetType: 'email',
        description: `${methodName}: Final failure after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
      })
      .catch(() => {
        // Silently fail
      });

    return {
      success: false,
      error: lastError?.message || 'Failed to send email after retries',
    };
  }
}
