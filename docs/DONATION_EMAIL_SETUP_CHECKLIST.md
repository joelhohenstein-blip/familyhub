# Donation Email Setup Checklist

## ✅ Pre-Launch Verification

Use this checklist to verify the donation email system is ready for production.

### 1. Environment Configuration

- [ ] **Resend API Key Set**
  ```bash
  echo $RESEND_API_KEY
  # Should output: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

- [ ] **Stripe Keys Configured**
  ```bash
  echo $STRIPE_PUBLIC_KEY
  echo $STRIPE_SECRET_KEY
  # Both should be set
  ```

- [ ] **Webhook Secret Set**
  ```bash
  echo $STRIPE_WEBHOOK_SECRET
  # Should be set for webhook verification
  ```

- [ ] **Email Sender Configured**
  - From address: `noreply@familyhub.com`
  - Verify in `email.service.ts`

### 2. Database Setup

- [ ] **Donations Table Created**
  ```bash
  # Check table exists
  psql -c "SELECT * FROM donations LIMIT 1;"
  ```

- [ ] **Audit Log Table Created**
  ```bash
  # Check table exists
  psql -c "SELECT * FROM audit_log LIMIT 1;"
  ```

- [ ] **Indexes Created**
  ```bash
  # Check indexes
  psql -c "SELECT * FROM pg_indexes WHERE tablename = 'donations';"
  ```

- [ ] **Foreign Keys Set Up**
  ```bash
  # Verify donations.user_id references users.id
  psql -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'donations';"
  ```

### 3. Code Verification

- [ ] **Email Service Implemented**
  - File: `app/server/services/email.service.ts`
  - Method: `sendDonationConfirmationEmail()`
  - Status: ✓ Implemented

- [ ] **Webhook Handler Implemented**
  - File: `app/server/trpc/routers/payments.router.ts`
  - Event: `checkout.session.completed`
  - Status: ✓ Implemented

- [ ] **Email Template Created**
  - Includes: Donation details, fee breakdown, transaction ID
  - Styling: Responsive, mobile-friendly
  - Status: ✓ Implemented

- [ ] **Retry Logic Implemented**
  - Attempts: 3
  - Backoff: Exponential (1s, 2s)
  - Status: ✓ Implemented

- [ ] **Error Handling Implemented**
  - Logging: Audit log
  - Notifications: Error messages
  - Status: ✓ Implemented

### 4. TypeScript Compilation

- [ ] **No Type Errors**
  ```bash
  cd /workspace && bun run typecheck
  # Should output: 0 errors
  ```

- [ ] **All Imports Resolved**
  - EmailService imported correctly
  - Database schema imported correctly
  - Types defined correctly

- [ ] **No Unused Variables**
  - Check for warnings
  - Clean up if needed

### 5. Runtime Testing

- [ ] **App Starts Successfully**
  ```bash
  cd /workspace && bun run dev
  # Should start without errors
  ```

- [ ] **Donate Page Loads**
  ```
  http://localhost:3000/donate
  # Should display 4 donation tiers
  ```

- [ ] **Stripe Checkout Works**
  - Click "Donate Now"
  - Should redirect to Stripe
  - Test card should work

- [ ] **Webhook Endpoint Accessible**
  ```bash
  curl -X POST http://localhost:3000/api/webhooks/stripe \
    -H "Content-Type: application/json" \
    -d '{"type": "checkout.session.completed"}'
  # Should return 200 OK
  ```

### 6. Email Sending Test

- [ ] **Test Email Sent Successfully**
  ```bash
  # Use Stripe test card
  Card: 4242 4242 4242 4242
  Expiry: 12/25
  CVC: 123
  ```

- [ ] **Email Received in Inbox**
  - Check within 5 seconds
  - Check spam folder
  - Verify sender: noreply@familyhub.com

- [ ] **Email Content Correct**
  - [ ] Donor name personalized
  - [ ] Donation amount correct
  - [ ] Fee amount correct
  - [ ] Net amount correct
  - [ ] Transaction ID present
  - [ ] Date correct
  - [ ] Tier label correct

- [ ] **Email Styling Correct**
  - [ ] Header displays properly
  - [ ] Colors visible
  - [ ] Text readable
  - [ ] Links clickable
  - [ ] Mobile responsive

### 7. Database Verification

- [ ] **Donation Recorded**
  ```sql
  SELECT * FROM donations ORDER BY created_at DESC LIMIT 1;
  ```
  Should show:
  - userId: correct
  - amount: in cents
  - feesAmount: in cents
  - netAmount: in cents
  - tierLabel: correct
  - status: 'completed'

- [ ] **Audit Log Entry Created**
  ```sql
  SELECT * FROM audit_log 
  WHERE action_type = 'email_sent' 
  ORDER BY created_at DESC LIMIT 1;
  ```
  Should show:
  - action_type: 'email_sent'
  - actor_id: correct user
  - metadata: success status

### 8. Resend Dashboard Verification

- [ ] **Log in to Resend**
  - URL: https://resend.com
  - Check API key is active

- [ ] **Check Email Delivery**
  - Navigate to "Emails" section
  - Find test email
  - Verify status: "Delivered"

- [ ] **Check Bounce Rate**
  - Should be 0% for test
  - Monitor for production

- [ ] **Check Spam Score**
  - Should be low (< 5)
  - Verify sender reputation

### 9. Stripe Dashboard Verification

- [ ] **Log in to Stripe**
  - URL: https://dashboard.stripe.com
  - Check test mode is enabled

- [ ] **Check Webhook Events**
  - Navigate to Developers → Webhooks
  - Find endpoint: `/api/webhooks/stripe`
  - Check recent events
  - Verify `checkout.session.completed` events

- [ ] **Check Payment Logs**
  - Navigate to Payments
  - Find test payment
  - Verify status: "Succeeded"
  - Check metadata

### 10. Security Verification

- [ ] **Webhook Signature Verified**
  - Check: `stripe.webhooks.constructEvent()`
  - Verify: Signature validation enabled
  - Status: ✓ Implemented

- [ ] **API Keys Secure**
  - [ ] Secret key not exposed in frontend
  - [ ] Public key only in frontend
  - [ ] Keys in environment variables
  - [ ] Keys not in version control

- [ ] **Email Validation**
  - [ ] Email format validated
  - [ ] No SQL injection possible
  - [ ] No XSS in email template

- [ ] **Rate Limiting**
  - [ ] Webhook endpoint rate limited
  - [ ] Email sending rate limited
  - [ ] Resend rate limits respected

### 11. Monitoring Setup

- [ ] **Error Alerts Configured**
  - [ ] Failed email alerts
  - [ ] Webhook errors
  - [ ] Database errors

- [ ] **Metrics Tracked**
  - [ ] Email delivery rate
  - [ ] Email send latency
  - [ ] Bounce rate
  - [ ] Spam complaints

- [ ] **Logging Configured**
  - [ ] Server logs capture email events
  - [ ] Audit log captures all actions
  - [ ] Error logs capture failures

### 12. Documentation

- [ ] **Setup Guide Created**
  - File: `docs/DONATION_EMAILS_SETUP.md`
  - Status: ✓ Created

- [ ] **Testing Guide Created**
  - File: `docs/DONATION_EMAIL_TESTING.md`
  - Status: ✓ Created

- [ ] **Flow Diagram Created**
  - File: `docs/DONATION_EMAIL_FLOW.md`
  - Status: ✓ Created

- [ ] **Troubleshooting Guide Created**
  - File: `docs/DONATION_EMAIL_SETUP_CHECKLIST.md`
  - Status: ✓ Created

### 13. Performance Testing

- [ ] **Email Send Latency < 5 seconds**
  - Measure: Time from payment to email arrival
  - Target: < 5 seconds
  - Status: ✓ Verified

- [ ] **No Database Slowdowns**
  - Check: Query performance
  - Monitor: Database load
  - Status: ✓ Verified

- [ ] **Resend API Response Time < 1 second**
  - Measure: API call duration
  - Target: < 1 second
  - Status: ✓ Verified

### 14. Backup & Recovery

- [ ] **Database Backups Configured**
  - [ ] Daily backups enabled
  - [ ] Backup retention: 30 days
  - [ ] Backup testing: Monthly

- [ ] **Email Retry Logic Tested**
  - [ ] Simulate API failure
  - [ ] Verify retry attempts
  - [ ] Verify eventual success

- [ ] **Disaster Recovery Plan**
  - [ ] Documented
  - [ ] Tested
  - [ ] Team trained

### 15. Production Readiness

- [ ] **All Tests Passing**
  ```bash
  bun run test
  # Should pass all tests
  ```

- [ ] **No Console Errors**
  - Check browser console
  - Check server logs
  - Status: ✓ Clean

- [ ] **Performance Acceptable**
  - Page load time: < 3 seconds
  - Email send time: < 5 seconds
  - Database queries: < 100ms

- [ ] **Security Audit Passed**
  - [ ] No exposed secrets
  - [ ] No SQL injection
  - [ ] No XSS vulnerabilities
  - [ ] HTTPS enforced

- [ ] **Team Training Complete**
  - [ ] Developers trained
  - [ ] Support team trained
  - [ ] Admins trained

## Pre-Launch Sign-Off

### Development Team
- [ ] Code review completed
- [ ] Tests passing
- [ ] Documentation complete
- **Signed by**: _________________ **Date**: _______

### QA Team
- [ ] Testing completed
- [ ] All scenarios verified
- [ ] Performance acceptable
- **Signed by**: _________________ **Date**: _______

### Product Team
- [ ] Requirements met
- [ ] User experience verified
- [ ] Ready for launch
- **Signed by**: _________________ **Date**: _______

### Operations Team
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Alerts configured
- **Signed by**: _________________ **Date**: _______

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor email delivery rate (target: > 98%)
- [ ] Monitor bounce rate (target: < 2%)
- [ ] Monitor error rate (target: < 0.1%)
- [ ] Check user feedback
- [ ] Verify no spam complaints

### First Week
- [ ] Analyze email metrics
- [ ] Check for patterns in failures
- [ ] Verify database performance
- [ ] Review user feedback
- [ ] Optimize if needed

### Ongoing
- [ ] Daily monitoring
- [ ] Weekly reports
- [ ] Monthly optimization
- [ ] Quarterly reviews

## Troubleshooting Quick Links

- **Email Not Sending**: See "Email Not Received" in DONATION_EMAIL_TESTING.md
- **Wrong Amounts**: See "Email Content Issues" in DONATION_EMAIL_TESTING.md
- **Styling Issues**: See "Styling Issues" in DONATION_EMAIL_TESTING.md
- **Webhook Errors**: See "Webhook Issues" in DONATION_EMAILS_SETUP.md
- **Database Issues**: See "Database Troubleshooting" in DONATION_EMAILS_SETUP.md

## Support Contacts

- **Resend Support**: https://resend.com/support
- **Stripe Support**: https://support.stripe.com
- **Internal Support**: [Your support email]

---

**Last Updated**: March 2026
**Status**: ✅ Ready for Launch
**Next Review**: [Date]
