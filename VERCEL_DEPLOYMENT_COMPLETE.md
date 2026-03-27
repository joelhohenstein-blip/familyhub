# FamilyHub Vercel Deployment Guide
## Personal-First, Open to Public Growth

**Status:** Ready for Production Deployment ✅  
**Repository:** joelhohenstein-blip/familyhub-app  
**Platform:** Vercel (FREE tier)  
**Database:** Vercel Postgres (FREE tier)  
**Monitoring:** Sentry (FREE tier)  
**Analytics:** Google Analytics 4 (FREE)  

---

## 🎯 Your Deployment Strategy

| Phase | Timeline | Goal | Cost |
|-------|----------|------|------|
| **Phase 1: Launch** | Now | Deploy to Vercel, test with friends/family | $0 |
| **Phase 2: Growth** | 3-6 months | Gather feedback, optimize features | $0 |
| **Phase 3: Monetization** | 6-12 months | Add Stripe, custom domain if traction justifies | Pay-as-you-go |

---

## 🚀 STEP-BY-STEP DEPLOYMENT (15 minutes)

### STEP 1: Prepare Your GitHub Repository

First, ensure your code is pushed to GitHub:

```bash
cd /workspace

# Check if git is initialized
git status

# If not initialized, initialize and add remote
git init
git add .
git commit -m "Initial commit: FamilyHub ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/familyhub-app.git
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

### STEP 2: Create Vercel Account & Import Project

1. **Go to https://vercel.com**
2. **Click "Sign Up"** (or log in if you have an account)
3. **Authorize with GitHub** (click "Continue with GitHub")
4. **Select your GitHub account** and authorize Vercel
5. **Click "Import Project"**
6. **Search for `familyhub-app`** in your repositories
7. **Click "Import"**

Vercel will automatically detect:
- ✅ Node.js project
- ✅ React Router framework
- ✅ Build command: `bun run build`
- ✅ Start command: `react-router-serve ./build/server/index.js`

### STEP 3: Configure Environment Variables

In the Vercel import dialog, you'll see an **"Environment Variables"** section.

**Add these variables** (copy from your `.env` file):

```
# Core
NODE_ENV=production
PORT=3000

# Database (Vercel will auto-provide this after you add Postgres)
DATABASE_URL=postgresql://...

# Clerk Authentication (REQUIRED for signup/login)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Sentry Error Tracking (FREE tier)
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACE_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0

# Google Analytics 4 (FREE)
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# App Config
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://familyhub-app.vercel.app/api
```

**Don't have these values yet?** See **STEP 5-7** below to get them.

### STEP 4: Add Vercel Postgres Database

1. **In Vercel dashboard, go to "Storage"** tab
2. **Click "Create"** → **"Postgres"**
3. **Name it:** `familyhub-db`
4. **Select region:** Choose closest to you
5. **Click "Create"**

Vercel will automatically:
- ✅ Create PostgreSQL database
- ✅ Set `DATABASE_URL` environment variable
- ✅ Make it available to your app

### STEP 5: Deploy

1. **Click "Deploy"** button
2. **Watch the build logs** (should take 2-5 minutes)
3. **Once green ✅**, your app is live!
4. **Vercel gives you a URL:** `https://familyhub-app.vercel.app`

### STEP 6: Test the Deployment

```bash
# Test health endpoint
curl https://familyhub-app.vercel.app/health

# Test API
curl https://familyhub-app.vercel.app/api/trpc/health.check
```

---

## 📧 STEP 7: Set Up Clerk Authentication (REQUIRED)

Your app needs Clerk for signup/login. If you don't have it configured:

1. **Go to https://dashboard.clerk.com**
2. **Create a new application** (or use existing)
3. **Get your keys:**
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
4. **Add to Vercel:**
   - Go to **Settings** → **Environment Variables**
   - Add both keys
   - **Redeploy:** Click **Deployments** → **Redeploy**

---

## 🔍 STEP 8: Set Up Sentry Error Tracking (FREE)

Sentry monitors errors in production. Free tier: 5,000 errors/month.

### 8a. Create Sentry Account
1. **Go to https://sentry.io**
2. **Sign up** (free tier available)
3. **Create new project**
4. **Select "Node.js" + "React"**

### 8b. Get DSN
1. **Copy the DSN** (looks like: `https://key@sentry.io/project-id`)
2. **Add to Vercel:**
   - `VITE_SENTRY_DSN=https://...`
   - `VITE_SENTRY_ENVIRONMENT=production`
3. **Redeploy**

### 8c. Test Error Tracking
1. **Trigger an error** in your app (e.g., click a button that throws)
2. **Check Sentry dashboard**
3. **Verify error appears** in real-time

---

## 📊 STEP 9: Set Up Google Analytics 4 (FREE)

Google Analytics tracks user behavior. Free tier: unlimited.

### 9a. Create Google Analytics Account
1. **Go to https://analytics.google.com**
2. **Sign in with Google account**
3. **Create new property** for FamilyHub
4. **Select "Web"** as platform
5. **Enter your app URL:** `https://familyhub-app.vercel.app`

### 9b. Get Measurement ID
1. **Go to Admin** → **Data Streams**
2. **Click your web stream**
3. **Copy "Measurement ID"** (looks like: `G-XXXXXXXXXX`)
4. **Add to Vercel:**
   - `VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX`
5. **Redeploy**

### 9c. Verify Analytics
1. **Visit your app** at `https://familyhub-app.vercel.app`
2. **Go to Google Analytics** → **Realtime**
3. **You should see yourself as an active user**

---

## ✅ POST-DEPLOYMENT CHECKLIST

### Verify App Works
- [ ] Navigate to `https://familyhub-app.vercel.app`
- [ ] Page loads without errors
- [ ] Sign up with test account
- [ ] Verify email confirmation works
- [ ] Test login/logout
- [ ] Create a family
- [ ] Send a message
- [ ] Upload a photo
- [ ] Create calendar event

### Check Database
1. **In Vercel, go to Storage** → **Postgres**
2. **Click "Connect"** → **"Vercel CLI"**
3. **Run migrations:**
   ```bash
   vercel env pull
   bun run db:push
   ```
4. **Verify tables exist:**
   ```bash
   psql $DATABASE_URL
   \dt  # List tables
   SELECT COUNT(*) FROM users;
   ```

### Monitor Errors
1. **Go to Sentry dashboard**
2. **Check for any errors**
3. **If errors, click to see details**

### Check Analytics
1. **Go to Google Analytics**
2. **Click "Realtime"**
3. **You should see yourself as active user**

---

## 🌐 LATER: Add Custom Domain (When Traction Grows)

When you're ready to add a custom domain (e.g., `familyhub.com`):

### Register Domain
1. **Go to https://domains.google.com**
2. **Search for `familyhub.com`**
3. **Click "Register"** (~$12/year)

### Point to Vercel
1. **In Vercel, go to Settings** → **Domains**
2. **Click "Add Domain"**
3. **Enter `familyhub.com`**
4. **Vercel shows DNS records**
5. **Go to Google Domains** → **DNS settings**
6. **Add CNAME record** Vercel provides
7. **Wait 5-30 minutes** for DNS propagation

---

## 💳 LATER: Add Stripe Payments (When Ready)

When you want to enable donations/payments:

### Get Stripe Keys
1. **Go to https://dashboard.stripe.com**
2. **Get your keys:**
   - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
   - `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `STRIPE_WEBHOOK_SECRET` (from Webhooks)

### Add to Vercel
1. **Settings** → **Environment Variables**
2. **Add all three keys**
3. **Redeploy**

### Test Payments
1. **Go to Donate page**
2. **Select donation amount**
3. **Use Stripe test card:** `4242 4242 4242 4242`
4. **Verify payment succeeds**

---

## 📧 LATER: Add SendGrid Email (When Ready)

When you want to send confirmation emails:

### Create SendGrid Account
1. **Go to https://sendgrid.com**
2. **Sign up** (free tier: 100 emails/day)
3. **Verify your email**

### Get API Key
1. **Settings** → **API Keys**
2. **Create API Key**
3. **Copy the key**

### Add to Vercel
1. **Settings** → **Environment Variables**
2. **Add `SENDGRID_API_KEY=SG.xxx...`**
3. **Add `SENDGRID_FROM_EMAIL=noreply@familyhub.com`**
4. **Redeploy**

### Verify Sender Email
1. **Settings** → **Sender Authentication**
2. **Verify `noreply@familyhub.com`**
3. **Check email for verification link**

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

### Database Connection Failed
1. **Verify `DATABASE_URL` is set** in Vercel
2. **Check Postgres is running** in Vercel Storage
3. **Run migrations:** `bun run db:push`
4. **Check logs:** `vercel logs`

### Sentry Not Tracking Errors
1. **Verify `VITE_SENTRY_DSN` is set**
2. **Trigger an error** in your app
3. **Wait 30 seconds** for Sentry to receive it
4. **Check Sentry dashboard**

### Analytics Not Showing Data
1. **Verify `VITE_GA4_MEASUREMENT_ID` is set**
2. **Visit your app** in a new browser
3. **Go to Google Analytics** → **Realtime**
4. **You should see yourself**

---

## 💰 PRICING (FREE TIER)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel Hosting** | 100GB bandwidth/month, unlimited deployments | Free |
| **Vercel Postgres** | 256MB storage, 60 connections | Free |
| **Sentry Error Tracking** | 5,000 errors/month | Free |
| **Google Analytics 4** | Unlimited | Free |
| **Clerk Authentication** | 10,000 monthly active users | Free |
| **Stripe Payments** | 2.9% + $0.30 per transaction | Pay-as-you-go |
| **SendGrid Email** | 100 emails/day | Free |

**Total monthly cost: $0 (until you exceed free tiers)**

---

## 📞 SUPPORT & RESOURCES

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.app/support
- **Sentry Docs:** https://docs.sentry.io
- **Google Analytics Docs:** https://support.google.com/analytics
- **Clerk Docs:** https://clerk.com/docs
- **Stripe Docs:** https://stripe.com/docs

---

## ✨ NEXT STEPS

### Immediate (This Week)
1. ✅ Deploy to Vercel
2. ✅ Set up Sentry error tracking
3. ✅ Set up Google Analytics
4. ✅ Test with friends/family

### Short-term (1-3 months)
1. Gather feedback from users
2. Monitor error logs in Sentry
3. Track user behavior in Google Analytics
4. Fix bugs and optimize features

### Medium-term (3-6 months)
1. If traction is strong, add custom domain
2. Enable Stripe for donations
3. Set up SendGrid for email
4. Plan premium features

### Long-term (6-12 months)
1. If adoption justifies, consider monetization
2. Scale infrastructure as needed
3. Add advanced features based on feedback
4. Plan for commercial launch

---

## 🎉 You're Ready!

Your FamilyHub is production-ready. Follow the steps above to deploy to Vercel, and you'll be live in 15 minutes.

**Questions?** Check the troubleshooting section or reach out to Vercel support.

**Good luck! 🚀**

---

**Last Updated:** March 26, 2025  
**Version:** 1.0.0  
**Status:** Ready for Production Deployment ✅
