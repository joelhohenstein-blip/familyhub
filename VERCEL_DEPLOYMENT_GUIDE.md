# FamilyHub Deployment to Vercel (FREE)
## Repository: joelhohenstein-blip/familyhub-app

---

## 🚀 QUICK START (10 minutes, NO CREDIT CARD REQUIRED)

### STEP 1: Go to Vercel Dashboard
1. Open **https://vercel.com**
2. Click **"Sign Up"** (or log in with GitHub)
3. Authorize Vercel to access your GitHub account

### STEP 2: Import Your Repository
1. Click **"Add New..."** → **"Project"**
2. Search for **`familyhub-app`**
3. Select **`joelhohenstein-blip/familyhub-app`**
4. Click **"Import"**

Vercel will automatically:
- Detect Node.js project
- Read `package.json`
- Configure build settings
- Start building

### STEP 3: Configure Environment Variables
1. In the import dialog, click **"Environment Variables"**
2. Add each variable from your `.env` file:

```
NODE_ENV=production
PORT=3000

# Database (use Vercel Postgres - FREE)
DATABASE_URL=postgresql://...

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid Email
SENDGRID_API_KEY=SG.xxx...
SENDGRID_FROM_EMAIL=noreply@familyhub.com

# Pusher Real-time
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=mt1

# Analytics
VITE_GA4_MEASUREMENT_ID=G-...
VITE_MIXPANEL_TOKEN=...
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACE_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0

# App Config
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://familyhub.com/api
```

3. Click **"Deploy"**

### STEP 4: Wait for Deployment
- Vercel builds and deploys automatically
- You'll see a live URL like: `https://familyhub-app.vercel.app`
- Takes 2-5 minutes

### STEP 5: Test the Deployment
```bash
# Test health endpoint
curl https://familyhub-app.vercel.app/health

# Test API
curl https://familyhub-app.vercel.app/api/trpc/health.check
```

---

## 🗄️ STEP 6: Set Up Vercel Postgres (FREE)

### 6a. Create Database
1. In Vercel dashboard, go to **"Storage"** tab
2. Click **"Create"** → **"Postgres"**
3. Name it `familyhub-db`
4. Select region closest to you
5. Click **"Create"**

### 6b. Get Connection String
1. Click the database
2. Copy the **"POSTGRES_URL"** (full connection string)
3. Add to Vercel environment variables: `DATABASE_URL=<paste_here>`
4. Redeploy: Click **"Deployments"** → **"Redeploy"**

### 6c. Run Migrations
1. In Vercel dashboard, go to **"Deployments"**
2. Click the latest deployment
3. Go to **"Logs"** tab
4. Verify migrations ran (look for "✅ Migrations completed")

---

## 🌐 STEP 7: Set Up Custom Domain (familyhub.com)

### 7a. Register Domain
1. Go to **Google Domains** (domains.google.com)
2. Search for `familyhub.com`
3. Click **"Register"** (if available)
4. Complete purchase (~$12/year)

### 7b. Point Domain to Vercel
1. In Vercel dashboard, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter `familyhub.com`
4. Vercel shows DNS records to add
5. Go to Google Domains → **DNS settings**
6. Add the CNAME record Vercel provides
7. Wait 5-30 minutes for DNS propagation

### 7c. Verify Domain Works
```bash
# Test domain
curl https://familyhub.com/health

# Check DNS
nslookup familyhub.com
```

---

## 📧 STEP 8: Configure SendGrid Email

### 8a. Create SendGrid Account
1. Go to **sendgrid.com**
2. Sign up (free tier: 100 emails/day)
3. Verify your email

### 8b. Get API Key
1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it `FamilyHub Production`
4. Copy the key
5. Add to Vercel: `SENDGRID_API_KEY=SG.xxx...`

### 8c. Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Enter `noreply@familyhub.com`
4. Verify the email (check inbox)
5. Update Vercel: `SENDGRID_FROM_EMAIL=noreply@familyhub.com`

### 8d. Test Email
1. Sign up for a new account on familyhub.com
2. Check email for confirmation link
3. Verify it arrives from `noreply@familyhub.com`

---

## 🔍 STEP 9: Enable Error Tracking (Sentry)

### 9a. Create Sentry Account
1. Go to **sentry.io**
2. Sign up (free tier: 5,000 errors/month)
3. Create new project for FamilyHub
4. Select **Node.js** + **React**

### 9b. Get DSN
1. Copy the DSN (looks like: `https://key@sentry.io/project-id`)
2. Add to Vercel: `VITE_SENTRY_DSN=https://...`
3. Redeploy

### 9c. Test Error Tracking
1. Trigger an error in the app
2. Check Sentry dashboard
3. Verify error appears

---

## 📊 STEP 10: Monitor Performance

### 10a. Enable Analytics
1. In Vercel dashboard, go to **"Analytics"** tab
2. View real-time metrics:
   - Page views
   - Response times
   - Error rates
   - Bandwidth usage

### 10b. Set Up Alerts
1. Go to **"Settings"** → **"Alerts"**
2. Enable alerts for:
   - High error rate (>5%)
   - Slow response times (>3s)
   - High bandwidth usage

---

## 🚨 TROUBLESHOOTING

### Build Fails
**Check logs:**
```
Vercel Dashboard → Deployments → Click deployment → Logs
```

**Common issues:**
- Missing environment variables → Add to Vercel Variables
- TypeScript errors → Run `bun run typecheck` locally
- Missing dependencies → Run `bun install` locally

### App Crashes
**Check logs:**
```
Vercel Dashboard → Deployments → Click deployment → Logs
```

**Common issues:**
- Database connection failed → Verify `DATABASE_URL` is set
- Missing API keys → Add all environment variables
- Port binding → Ensure app listens on `PORT` env var

### Domain Not Working
1. Verify DNS records are added correctly
2. Wait for DNS propagation (up to 48 hours)
3. Test with: `nslookup familyhub.com`
4. Check Vercel domain settings

### Email Not Sending
1. Verify `SENDGRID_API_KEY` is set
2. Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid
3. Check SendGrid activity log for bounces
4. Test with: `curl -X POST https://api.sendgrid.com/v3/mail/send ...`

---

## 💰 PRICING (FREE TIER)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel Hosting** | Unlimited deployments, 100GB bandwidth/month | Free |
| **Vercel Postgres** | 256MB storage, 60 connections | Free |
| **SendGrid Email** | 100 emails/day | Free |
| **Sentry Error Tracking** | 5,000 errors/month | Free |
| **Google Domains** | - | ~$12/year |
| **Stripe Payments** | 2.9% + $0.30 per transaction | Pay-as-you-go |

**Total monthly cost: $0 (until you exceed free tiers)**

---

## 📞 SUPPORT

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **SendGrid Docs:** https://docs.sendgrid.com
- **Sentry Docs:** https://docs.sentry.io

---

## ✨ NEXT STEPS

1. **Marketing Launch**
   - Update website with live link
   - Send launch announcement
   - Post on social media

2. **User Onboarding**
   - Create welcome email sequence
   - Set up help documentation
   - Monitor support tickets

3. **Performance Optimization**
   - Monitor Core Web Vitals
   - Optimize images
   - Cache optimization

4. **Feature Rollout**
   - Enable feature flags gradually
   - Monitor adoption
   - Gather user feedback

---

**Status:** Ready for Production Deployment ✅
**Repository:** joelhohenstein-blip/familyhub-app
**Platform:** Vercel (FREE)
**Last Updated:** March 26, 2025
**Version:** 1.0.0
