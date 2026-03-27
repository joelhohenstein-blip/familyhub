# Donation Confirmation Emails - Setup & Configuration Guide

## Overview

FamilyHub has a complete donation confirmation email system that automatically sends professional, branded emails to donors after successful payments. The system is fully integrated with Stripe webhooks and uses Resend for email delivery.

## ✅ Current Setup Status

### What's Already Configured

1. **Email Service** (`app/server/services/email.service.ts`)
   - `sendDonationConfirmationEmail()` method with retry logic
   - Professional HTML email template with donation details
   - Automatic fee breakdown display
   - Tax deduction notice

2. **Stripe Integration** (`app/server/trpc/routers/payments.router.ts`)
   - Webhook handler that listens for successful payments
   - Automatic email sending on payment completion
   - Fee calculation and storage
   - Transaction ID tracking

3. **Email Provider** (Resend)
   - API key configured in `.env`
   - Sender email: `noreply@familyhub.com`
   - Retry logic with exponential backoff (3 attempts)

## Email Template Details

### What Donors Receive

The confirmation email includes:

```
Header: "Thank You for Your Donation!" with heart icon
├── Greeting with donor's name
├── Donation Details Box:
│   ├── Donation Tier (e.g., "Family Champion")
│   ├── Your Donation Amount (e.g., "$50.00")
│   ├── Processing Fee (e.g., "-$1.75")
│   └── FamilyHub Receives (e.g., "$48.25") [highlighted]
├── Transaction Details:
│   ├── Transaction ID (Stripe session ID)
│   └── Date & Time
├── Tax Deduction Notice
├── Support Contact Info
└── Footer with Privacy & Terms links
```

### Email Styling

- **Color Scheme**: Purple gradient (matching FamilyHub branding)
- **Layout**: Responsive, mobile-friendly
- **Typography**: System fonts for maximum compatibility
- **Accessibility**: Proper contrast ratios, semantic HTML

## How It Works

### 1. Donation Flow

```
User clicks "Donate" 
  ↓
Stripe Checkout Session Created
  ↓
User completes payment
  ↓
Stripe sends webhook event (checkout.session.completed)
  ↓
Webhook handler processes event
  ↓
Donation recorded in database
  ↓
EmailService.sendDonationConfirmationEmail() called
  ↓
Email sent via Resend
  ↓
Donor receives confirmation email
```

### 2. Email Sending Process

```typescript
// In webhook handler (payments.router.ts)
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, session.metadata.userId),
});

if (user?.email) {
  await EmailService.sendDonationConfirmationEmail(
    {
      email: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      amount: 50,           // in dollars
      feesAmount: 1.75,     // in dollars
      netAmount: 48.25,     // in dollars
      tierLabel: 'Family Champion',
      donationDate: new Date(),
      transactionId: session.id,
    },
    userId
  );
}
```

### 3. Retry Logic

If email sending fails:
- **Attempt 1**: Immediate retry
- **Attempt 2**: After 1 second
- **Attempt 3**: After 2 seconds
- **Failure**: Logged to audit log, error returned

## Configuration

### Environment Variables

```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Email Sender

- **From Address**: `noreply@familyhub.com`
- **Display Name**: FamilyHub (implicit from Resend)

### Donation Tiers

Configured in `payments.router.ts`:

```typescript
const donationOptions = [
  { id: 'coffee', label: 'Coffee', amount: 5 },
  { id: 'lunch', label: 'Weekly Supporter', amount: 15 },
  { id: 'dinner', label: 'Family Champion', amount: 50 },
  { id: 'custom', label: 'Founding Member', amount: 100 },
];
```

## Testing

### Test Email Sending

1. **Using Resend Test Mode**
   ```bash
   # Resend provides test API keys for development
   # Use re_test_xxxx for testing without sending real emails
   ```

2. **Manual Testing**
   ```typescript
   // In a test file or console
   import { EmailService } from '~/server/services/email.service';
   
   await EmailService.sendDonationConfirmationEmail(
     {
       email: 'test@example.com',
       userName: 'John Doe',
       amount: 50,
       feesAmount: 1.75,
       netAmount: 48.25,
       tierLabel: 'Family Champion',
       donationDate: new Date(),
       transactionId: 'test_session_123',
     },
     'user_id_123'
   );
   ```

3. **Stripe Webhook Testing**
   ```bash
   # Use Stripe CLI to test webhooks locally
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   stripe trigger payment_intent.succeeded
   ```

### Verify Email Delivery

1. Check Resend dashboard for delivery status
2. Check audit logs for email send events
3. Monitor error logs for failed attempts

## Customization

### Changing Email Template

Edit `app/server/services/email.service.ts`, method `sendDonationConfirmationEmail()`:

```typescript
const htmlContent = `
  <!-- Modify HTML here -->
`;
```

### Changing Sender Email

Update in `sendDonationConfirmationEmail()`:

```typescript
const result = await getResendOrThrow().emails.send({
  from: 'your-email@familyhub.com',  // Change here
  to: data.email,
  subject: `Thank You for Your ${data.tierLabel} Donation to FamilyHub`,
  html: htmlContent,
});
```

### Changing Email Subject

```typescript
subject: `Your custom subject here`,
```

### Adding Dynamic Content

The template supports any data from `DonationConfirmationEmailData`:

```typescript
export interface DonationConfirmationEmailData {
  email: string;
  userName: string;
  amount: number;           // in dollars
  feesAmount: number;       // in dollars
  netAmount: number;        // in dollars
  tierLabel: string;
  donationDate: Date;
  transactionId: string;
}
```

## Troubleshooting

### Email Not Sending

1. **Check Resend API Key**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Check Logs**
   ```bash
   # Look for email send errors in server logs
   grep -i "sendDonationConfirmationEmail" logs/*
   ```

3. **Check Audit Log**
   ```sql
   SELECT * FROM audit_log 
   WHERE action_type = 'email_sent' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Verify Webhook**
   - Check Stripe dashboard → Webhooks
   - Verify endpoint is receiving events
   - Check webhook logs for errors

### Email Template Issues

1. **Images Not Loading**: Use absolute URLs
2. **Styling Not Applied**: Use inline styles (CSS in `<style>` tag)
3. **Mobile Display**: Template is responsive, test on mobile

### Resend Issues

1. **Rate Limiting**: Resend allows 100 emails/second
2. **Invalid Email**: Validate email format before sending
3. **Bounced Emails**: Check Resend dashboard for bounce reasons

## Monitoring

### Key Metrics to Track

1. **Email Delivery Rate**
   ```sql
   SELECT 
     COUNT(*) as total_emails,
     SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
     SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
   FROM audit_log
   WHERE action_type = 'email_sent'
   AND created_at > NOW() - INTERVAL '7 days';
   ```

2. **Failed Emails**
   ```sql
   SELECT * FROM audit_log
   WHERE action_type = 'email_sent'
   AND metadata->>'success' = 'false'
   ORDER BY created_at DESC;
   ```

3. **Email Send Latency**
   - Monitor time between payment completion and email send
   - Target: < 5 seconds

## Best Practices

1. **Always Include Transaction ID**: Helps donors track their donation
2. **Show Fee Breakdown**: Transparency builds trust
3. **Include Tax Notice**: Donors appreciate tax deduction info
4. **Provide Support Contact**: Make it easy for donors to ask questions
5. **Test Regularly**: Verify emails are being sent and received
6. **Monitor Bounce Rate**: Keep bounce rate < 2%
7. **Update Template Seasonally**: Keep messaging fresh and relevant

## Related Files

- `app/server/services/email.service.ts` - Email service implementation
- `app/server/trpc/routers/payments.router.ts` - Webhook handler
- `app/routes/donate.tsx` - Donation page
- `app/routes/admin/donations.tsx` - Admin dashboard
- `app/db/schema/donations.ts` - Database schema

## Support

For issues or questions about donation emails:
1. Check this guide first
2. Review server logs
3. Check Resend dashboard
4. Contact support team

---

**Last Updated**: March 2026
**Status**: ✅ Production Ready
