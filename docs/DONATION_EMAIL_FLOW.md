# Donation Email Flow Diagram

## Complete Email Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DONATION EMAIL SYSTEM FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. DONATION INITIATION
   ┌──────────────────────────────────────────────────────────────────────┐
   │ User visits /donate page                                             │
   │ ├─ Selects donation tier (Coffee, Weekly, Champion, Founding)       │
   │ ├─ Clicks "Donate Now"                                              │
   │ └─ Redirected to Stripe Checkout                                    │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

2. STRIPE CHECKOUT
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Stripe Checkout Session Created                                      │
   │ ├─ Session ID: cs_test_xxxxx                                        │
   │ ├─ Amount: $50.00 (in cents: 5000)                                  │
   │ ├─ Metadata:                                                         │
   │ │  ├─ userId: user_123                                              │
   │ │  ├─ tierLabel: "Family Champion"                                  │
   │ │  └─ feesAmount: 1.75                                              │
   │ └─ Success URL: /donate?success=true&session_id=cs_test_xxxxx       │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

3. PAYMENT PROCESSING
   ┌──────────────────────────────────────────────────────────────────────┐
   │ User enters payment details                                          │
   │ ├─ Card: 4242 4242 4242 4242                                        │
   │ ├─ Expiry: 12/25                                                    │
   │ ├─ CVC: 123                                                         │
   │ └─ Clicks "Pay"                                                     │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

4. STRIPE WEBHOOK EVENT
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Stripe sends webhook: checkout.session.completed                    │
   │ ├─ Event Type: checkout.session.completed                           │
   │ ├─ Session ID: cs_test_xxxxx                                        │
   │ ├─ Amount Total: 5000 (cents)                                       │
   │ ├─ Customer Email: john@example.com                                 │
   │ └─ Metadata: {userId, tierLabel, feesAmount}                        │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

5. WEBHOOK HANDLER (payments.router.ts)
   ┌──────────────────────────────────────────────────────────────────────┐
   │ POST /api/webhooks/stripe                                           │
   │ ├─ Verify webhook signature                                         │
   │ ├─ Extract session data                                             │
   │ ├─ Check if donation already recorded                               │
   │ └─ If new donation:                                                 │
   │    ├─ Calculate amounts:                                            │
   │    │  ├─ Amount: $50.00                                             │
   │    │  ├─ Fees: $1.75 (2.9% + $0.30)                                │
   │    │  └─ Net: $48.25                                                │
   │    ├─ Record in database:                                           │
   │    │  └─ INSERT INTO donations (...)                                │
   │    └─ Fetch user details:                                           │
   │       └─ SELECT * FROM users WHERE id = 'user_123'                  │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

6. EMAIL SERVICE CALL
   ┌──────────────────────────────────────────────────────────────────────┐
   │ EmailService.sendDonationConfirmationEmail()                        │
   │ ├─ Input Data:                                                      │
   │ │  ├─ email: "john@example.com"                                     │
   │ │  ├─ userName: "John Doe"                                          │
   │ │  ├─ amount: 50 (dollars)                                          │
   │ │  ├─ feesAmount: 1.75 (dollars)                                    │
   │ │  ├─ netAmount: 48.25 (dollars)                                    │
   │ │  ├─ tierLabel: "Family Champion"                                  │
   │ │  ├─ donationDate: 2026-03-22T10:30:00Z                            │
   │ │  └─ transactionId: "cs_test_xxxxx"                                │
   │ └─ Generate HTML email template                                     │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

7. EMAIL TEMPLATE GENERATION
   ┌──────────────────────────────────────────────────────────────────────┐
   │ HTML Email Template                                                 │
   │ ┌────────────────────────────────────────────────────────────────┐  │
   │ │ ❤️ Thank You for Your Donation!                               │  │
   │ │                                                                │  │
   │ │ Hi John Doe,                                                  │  │
   │ │                                                                │  │
   │ │ We're incredibly grateful for your generous donation to       │  │
   │ │ FamilyHub. Your support helps us continue building the best  │  │
   │ │ family communication platform.                                │  │
   │ │                                                                │  │
   │ │ ┌──────────────────────────────────────────────────────────┐ │  │
   │ │ │ Donation Tier:        Family Champion                   │ │  │
   │ │ │ Your Donation:        $50.00                            │ │  │
   │ │ │ Processing Fee:       -$1.75                            │ │  │
   │ │ │ FamilyHub Receives:   $48.25 ✓                          │ │  │
   │ │ └──────────────────────────────────────────────────────────┘ │  │
   │ │                                                                │  │
   │ │ Transaction ID: cs_test_xxxxx                                │  │
   │ │ Date: March 22, 2026                                         │  │
   │ │                                                                │  │
   │ │ Your donation is 100% tax-deductible. We'll send you a tax   │  │
   │ │ receipt shortly.                                              │  │
   │ │                                                                │  │
   │ │ Thank you again for believing in FamilyHub!                  │  │
   │ │                                                                │  │
   │ │ Warm regards,                                                 │  │
   │ │ The FamilyHub Team                                            │  │
   │ └────────────────────────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

8. RESEND API CALL
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Resend.emails.send()                                                │
   │ ├─ From: noreply@familyhub.com                                      │
   │ ├─ To: john@example.com                                             │
   │ ├─ Subject: "Thank You for Your Family Champion Donation to         │
   │ │            FamilyHub"                                             │
   │ ├─ HTML: [generated template above]                                 │
   │ └─ Retry Logic:                                                     │
   │    ├─ Attempt 1: Immediate                                          │
   │    ├─ Attempt 2: After 1 second (if failed)                         │
   │    └─ Attempt 3: After 2 seconds (if failed)                        │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

9. EMAIL DELIVERY
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Resend Email Service                                                │
   │ ├─ Validates email address                                          │
   │ ├─ Processes email through Resend infrastructure                    │
   │ ├─ Sends to recipient's email provider                              │
   │ └─ Returns delivery status                                          │
   └──────────────────────────────────────────────────────────────────────┘
                                    ↓

10. AUDIT LOGGING
    ┌──────────────────────────────────────────────────────────────────────┐
    │ Log to audit_log table                                              │
    │ ├─ action_type: "email_sent"                                        │
    │ ├─ actor_id: "user_123"                                             │
    │ ├─ target_id: "cs_test_xxxxx"                                       │
    │ ├─ target_type: "email"                                             │
    │ ├─ description: "sendDonationConfirmationEmail: Successfully sent   │
    │ │               email (attempt 1)"                                  │
    │ ├─ metadata: {success: true, messageId: "..."}                      │
    │ └─ created_at: 2026-03-22T10:30:05Z                                 │
    └──────────────────────────────────────────────────────────────────────┘
                                    ↓

11. DONOR RECEIVES EMAIL
    ┌──────────────────────────────────────────────────────────────────────┐
    │ Email arrives in donor's inbox                                      │
    │ ├─ Time: ~2-5 seconds after payment                                 │
    │ ├─ Status: Delivered                                                │
    │ ├─ Display: Renders correctly on all devices                        │
    │ └─ Action: Donor can:                                               │
    │    ├─ View donation details                                         │
    │    ├─ See fee breakdown                                             │
    │    ├─ Get transaction ID                                            │
    │    ├─ Click support links                                           │
    │    └─ Print for tax records                                         │
    └──────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING & RETRY LOGIC                           │
└─────────────────────────────────────────────────────────────────────────────┘

Email Send Attempt
        ↓
    ┌───────────────────┐
    │ Try to send email  │
    └───────────────────┘
        ↓
    ┌───────────────────┐
    │ Success?          │
    └───────────────────┘
        ↙           ↘
      YES            NO
       ↓              ↓
    ✅ Log         ⏱️ Wait 1s
    Success        ↓
       ↓        Retry #2
    Return         ↓
    Success     ┌───────────────────┐
                │ Try to send email  │
                └───────────────────┘
                    ↓
                ┌───────────────────┐
                │ Success?          │
                └───────────────────┘
                    ↙           ↘
                  YES            NO
                   ↓              ↓
                ✅ Log         ⏱️ Wait 2s
                Success        ↓
                   ↓        Retry #3
                Return         ↓
                Success     ┌───────────────────┐
                            │ Try to send email  │
                            └───────────────────┘
                                ↓
                            ┌───────────────────┐
                            │ Success?          │
                            └───────────────────┘
                                ↙           ↘
                              YES            NO
                               ↓              ↓
                            ✅ Log         ❌ Log
                            Success        Failure
                               ↓              ↓
                            Return        Return
                            Success       Error
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

Frontend (donate.tsx)
    │
    ├─ User selects tier
    ├─ Calls createDonationCheckout mutation
    └─ Redirects to Stripe Checkout
                    │
                    ↓
            Stripe Checkout
                    │
                    ├─ User enters payment
                    ├─ Processes payment
                    └─ Sends webhook event
                            │
                            ↓
            Webhook Handler (payments.router.ts)
                    │
                    ├─ Verifies signature
                    ├─ Extracts session data
                    ├─ Calculates fees
                    └─ Records donation
                            │
                    ┌───────┴───────┐
                    ↓               ↓
            Database          Email Service
            (donations)       (EmailService)
                    │               │
                    │               ├─ Generates template
                    │               ├─ Formats amounts
                    │               └─ Calls Resend API
                    │                       │
                    │                       ↓
                    │               Resend Email Service
                    │                       │
                    │                       ├─ Validates email
                    │                       ├─ Sends email
                    │                       └─ Returns status
                    │                               │
                    │                               ↓
                    │                       Donor's Email Provider
                    │                               │
                    │                               ↓
                    │                       Donor's Inbox
                    │
                    └─→ Audit Log
                        (email_sent event)
```

## Timeline

```
Time    Event                                          Duration
────────────────────────────────────────────────────────────────
T+0s    User clicks "Donate Now"
        └─ Redirected to Stripe Checkout

T+0-30s User completes payment on Stripe

T+30s   Stripe sends webhook event
        └─ Webhook received by server

T+31s   Webhook handler processes event
        ├─ Verifies signature
        ├─ Records donation in database
        └─ Calls EmailService

T+32s   EmailService generates email template
        └─ Calls Resend API

T+33s   Resend processes email
        └─ Sends to recipient's provider

T+34s   Email arrives in donor's inbox
        └─ Donor receives confirmation

Total time from payment to email: ~4 seconds ✓
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM INTEGRATION POINTS                           │
└─────────────────────────────────────────────────────────────────────────────┘

1. STRIPE INTEGRATION
   ├─ Webhook endpoint: POST /api/webhooks/stripe
   ├─ Event: checkout.session.completed
   ├─ Signature verification: ✓
   └─ Retry handling: ✓

2. DATABASE INTEGRATION
   ├─ Table: donations
   ├─ Schema: id, userId, amount, feesAmount, netAmount, tierLabel, status
   ├─ Relationships: users.id → donations.userId
   └─ Indexes: userId, stripeSessionId

3. EMAIL SERVICE INTEGRATION
   ├─ Provider: Resend
   ├─ API Key: RESEND_API_KEY (env var)
   ├─ Sender: noreply@familyhub.com
   ├─ Retry logic: 3 attempts with exponential backoff
   └─ Logging: audit_log table

4. USER SERVICE INTEGRATION
   ├─ Fetch user: db.query.users.findFirst()
   ├─ Fields: firstName, lastName, email
   └─ Validation: Email format check

5. AUDIT LOGGING INTEGRATION
   ├─ Table: audit_log
   ├─ Event type: email_sent
   ├─ Metadata: success, messageId, error
   └─ Retention: Indefinite
```

---

**Last Updated**: March 2026
**Status**: ✅ Production Ready
