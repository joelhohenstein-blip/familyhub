# Testing Donation Confirmation Emails

## Quick Start

The donation confirmation email system is **fully operational** and ready to test. Here's how to verify it works:

## Test Methods

### Method 1: Using Stripe Test Cards (Recommended)

1. **Start the app**
   ```bash
   cd /workspace
   bun run dev
   ```

2. **Navigate to donate page**
   ```
   http://localhost:3000/donate
   ```

3. **Select a donation tier** (e.g., "Family Champion" - $50)

4. **Click "Donate Now"**

5. **Use Stripe test card**
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - Zip: Any 5 digits (e.g., `12345`)

6. **Complete payment**

7. **Check email**
   - Email should arrive within 5 seconds
   - Check spam folder if not in inbox
   - Verify all details are correct

### Method 2: Using Stripe CLI (Advanced)

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   curl https://files.stripe.com/stripe-cli/install.sh -o install.sh
   sudo bash install.sh
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Trigger test webhook**
   ```bash
   stripe trigger checkout.session.completed
   ```

5. **Check logs**
   - Look for email send confirmation in server logs
   - Check Resend dashboard for delivery status

### Method 3: Direct API Test

1. **Create test donation directly**
   ```bash
   curl -X POST http://localhost:3000/api/trpc/payments.createDonationCheckout \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 50,
       "tierLabel": "Family Champion"
     }'
   ```

2. **Simulate webhook**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{
       "type": "checkout.session.completed",
       "data": {
         "object": {
           "id": "cs_test_123",
           "amount_total": 5000,
           "customer_email": "test@example.com",
           "metadata": {
             "userId": "user_123",
             "tierLabel": "Family Champion",
             "feesAmount": "1.75"
           }
         }
       }
     }'
   ```

## What to Verify

### Email Content

- [ ] Recipient email is correct
- [ ] Donor name is personalized (e.g., "Hi John")
- [ ] Donation tier is correct
- [ ] Donation amount is correct
- [ ] Fee amount is correct (2.9% + $0.30)
- [ ] Net amount is correct (donation - fees)
- [ ] Transaction ID is present
- [ ] Date is current
- [ ] Tax deduction notice is included

### Email Styling

- [ ] Header displays correctly with heart icon
- [ ] Purple gradient background is visible
- [ ] All text is readable
- [ ] Donation details box is highlighted
- [ ] Links are clickable
- [ ] Footer is visible

### Email Delivery

- [ ] Email arrives within 5 seconds
- [ ] Email is not marked as spam
- [ ] Email displays correctly on mobile
- [ ] Email displays correctly on desktop
- [ ] Links in footer work

## Fee Calculation Verification

Test different amounts to verify fee calculation:

| Donation | Fee (2.9% + $0.30) | Net to FamilyHub |
|----------|-------------------|------------------|
| $5.00    | $0.45             | $4.55            |
| $15.00   | $0.74             | $14.26           |
| $50.00   | $1.75             | $48.25           |
| $100.00  | $3.20             | $96.80           |
| $250.00  | $7.55             | $242.45          |

## Troubleshooting

### Email Not Received

1. **Check spam folder**
   - Gmail: Check "Promotions" tab
   - Outlook: Check "Junk" folder

2. **Verify email address**
   - Make sure you're logged in with correct email
   - Check user profile for correct email

3. **Check server logs**
   ```bash
   # Look for email send errors
   grep -i "email\|resend" /workspace/.next/server/logs
   ```

4. **Check Resend dashboard**
   - Log in to https://resend.com
   - Check "Emails" section for delivery status
   - Look for bounce or failure reasons

### Email Content Issues

1. **Wrong donor name**
   - Check user profile firstName/lastName
   - Verify user is logged in before donating

2. **Wrong amounts**
   - Verify fee calculation: (amount × 0.029) + 0.30
   - Check database for stored values

3. **Missing transaction ID**
   - Verify Stripe session ID is being passed
   - Check webhook payload

### Styling Issues

1. **Images not loading**
   - Check image URLs are absolute
   - Verify image hosting is accessible

2. **Colors not displaying**
   - Test in different email clients
   - Some clients strip CSS, use inline styles

3. **Mobile display broken**
   - Test on actual mobile device
   - Check responsive CSS media queries

## Email Client Testing

Test the email in different clients:

- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Outlook (web)
- [ ] Outlook (desktop)
- [ ] Apple Mail
- [ ] Thunderbird
- [ ] Yahoo Mail
- [ ] Mobile email apps

## Performance Testing

### Email Send Latency

Measure time from payment completion to email arrival:

```bash
# Check server logs for timing
grep "sendDonationConfirmationEmail" /workspace/.next/server/logs
```

**Target**: < 5 seconds

### Bulk Testing

To test with multiple donations:

1. Create test user accounts
2. Make donations from each account
3. Verify all emails are sent
4. Check for any failures

## Monitoring in Production

### Check Email Delivery Rate

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_emails,
  SUM(CASE WHEN metadata->>'success' = 'true' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN metadata->>'success' = 'false' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN metadata->>'success' = 'true' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM audit_log
WHERE action_type = 'email_sent'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Check Failed Emails

```sql
SELECT 
  created_at,
  actor_id,
  metadata,
  description
FROM audit_log
WHERE action_type = 'email_sent'
AND metadata->>'success' = 'false'
ORDER BY created_at DESC
LIMIT 20;
```

## Common Test Scenarios

### Scenario 1: Small Donation
- Amount: $5 (Coffee tier)
- Expected fee: $0.45
- Expected net: $4.55

### Scenario 2: Medium Donation
- Amount: $50 (Family Champion tier)
- Expected fee: $1.75
- Expected net: $48.25

### Scenario 3: Large Donation
- Amount: $250 (Custom)
- Expected fee: $7.55
- Expected net: $242.45

### Scenario 4: Minimum Donation
- Amount: $5 (minimum allowed)
- Expected fee: $0.45
- Expected net: $4.55

## Success Criteria

✅ **Email system is working correctly when:**

1. Email arrives within 5 seconds of payment
2. Donor name is personalized
3. All amounts are correct
4. Fee breakdown is accurate
5. Transaction ID is present
6. Email displays correctly on all devices
7. No emails are marked as spam
8. Delivery rate is > 98%
9. No failed email attempts
10. Support links are clickable

## Next Steps

After testing:

1. **Monitor in production**
   - Set up alerts for failed emails
   - Track delivery metrics

2. **Gather feedback**
   - Ask donors about email quality
   - Collect suggestions for improvements

3. **Optimize**
   - A/B test subject lines
   - Improve template based on feedback
   - Add more personalization

4. **Scale**
   - Monitor Resend rate limits
   - Plan for high-volume periods
   - Set up backup email provider

---

**Last Updated**: March 2026
**Status**: ✅ Ready to Test
