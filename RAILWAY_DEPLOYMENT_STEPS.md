# FamilyHub Deployment to Railway.app
## Repository: joelhohenstein-blip/familyhub-app

---

## 🚀 STEP-BY-STEP DEPLOYMENT (15 minutes)

### STEP 1: Go to Railway Dashboard
1. Open **https://railway.app/dashboard**
2. Log in with GitHub (or create account)
3. Click **"+ New Project"**

### STEP 2: Connect Your GitHub Repository
1. Select **"Deploy from GitHub"**
2. Authorize Railway to access your GitHub account
3. Search for **`familyhub-app`**
4. Select **`joelhohenstein-blip/familyhub-app`**
5. Click **"Deploy"**

Railway will automatically:
- Detect Node.js project
- Read `package.json`
- Create a service
- Start building

### STEP 3: Add PostgreSQL Database
1. In Railway dashboard, click **"+ Add Service"**
2. Select **"PostgreSQL"**
3. Railway automatically sets `DATABASE_URL` environment variable
4. Click **"Deploy"**

### STEP 4: Configure Environment Variables
Copy these from your `.env` file and add to Railway:

**Go to:** Settings → Variables

Add each variable:

```
NODE_ENV=production
PORT=3000

# Database (Railway auto-provides this)
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

### STEP 5: Verify Build & Deployment
1. Go to **Deployments** tab
2. Watch the build logs
3. Once green ✅, your app is live!
4. Railway gives you a URL like: `https://familyhub-production.up.railway.app`

### STEP 6: Test the Deployment
```bash
# Test health endpoint
curl https://familyhub-production.up.railway.app/health

# Test API
curl https://familyhub-production.up.railway.app/api/trpc/health.check
```

---

## 📋 POST-DEPLOYMENT CHECKLIST

### ✅ Verify App Works
- [ ] Navigate to Railway URL
- [ ] Sign up with test account
- [ ] Verify email confirmation works
- [ ] Test login/logout
- [ ] Create a family
- [ ] Send a message
- [ ] Upload a photo
- [ ] Create calendar event

### ✅ Check Database
1. In Railway, go to **PostgreSQL service**
2. Click **"Connect"**
3. Use connection string to verify tables exist:
```bash
psql "your_database_url"
\dt  # List all tables
SELECT COUNT(*) FROM users;  # Check data
```

### ✅ Monitor Errors
1. Go to **Monitoring** tab
2. Check for any errors in logs
3. If errors, click **"View Logs"** to debug

---

## 🌐 STEP 7: Set Up Custom Domain (familyhub.com)

### 7a. Register Domain
1. Go to **Google Domains** (domains.google.com)
2. Search for `familyhub.com`
3. Click **"Register"** (if available)
4. Complete purchase

### 7b. Point Domain to Railway
1. In Railway dashboard, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter `familyhub.com`
4. Railway shows DNS records to add
5. Go to Google Domains → DNS settings
6. Add the CNAME record Railway provides
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
2. Sign up (free tier available)
3. Verify your email

### 8b. Get API Key
1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it `FamilyHub Production`
4. Copy the key
5. Add to Railway variables: `SENDGRID_API_KEY=SG.xxx...`

### 8c. Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Enter `noreply@familyhub.com`
4. Verify the email (check inbox)
5. Update Railway: `SENDGRID_FROM_EMAIL=noreply@familyhub.com`

### 8d. Test Email
1. Sign up for a new account on familyhub.com
2. Check email for confirmation link
3. Verify it arrives from `noreply@familyhub.com`

---

## 🔍 STEP 9: Enable Error Tracking (Sentry)

### 9a. Create Sentry Account
1. Go to **sentry.io**
2. Sign up
3. Create new project for FamilyHub
4. Select **Node.js** + **React**

### 9b. Get DSN
1. Copy the DSN (looks like: `https://key@sentry.io/project-id`)
2. Add to Railway: `VITE_SENTRY_DSN=https://...`

### 9c. Test Error Tracking
1. Trigger an error in the app
2. Check Sentry dashboard
3. Verify error appears

---

## 📊 STEP 10: Set Up Monitoring

### 10a. Enable Health Checks
1. In Railway, go to **Monitoring**
2. Click **"Health Checks"**
3. Set endpoint: `/health`
4. Set interval: 30 seconds
5. Enable **Alerts** for failures

### 10b. Monitor Performance
1. Go to **Metrics** tab
2. Watch CPU, Memory, Network
3. Set alerts if usage spikes

---

## 🚨 TROUBLESHOOTING

### Build Fails
**Check logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Common issues:**
- Missing environment variables → Add to Railway Variables
- TypeScript errors → Run `bun run typecheck` locally
- Missing dependencies → Run `bun install` locally

### App Crashes
**Check logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Common issues:**
- Database connection failed → Verify `DATABASE_URL` is set
- Missing API keys → Add all environment variables
- Port binding → Ensure app listens on `PORT` env var

### Domain Not Working
1. Verify DNS records are added correctly
2. Wait for DNS propagation (up to 48 hours)
3. Test with: `nslookup familyhub.com`
4. Check Railway domain settings

### Email Not Sending
1. Verify `SENDGRID_API_KEY` is set
2. Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid
3. Check SendGrid activity log for bounces
4. Test with: `curl -X POST https://api.sendgrid.com/v3/mail/send ...`

---

## 📞 SUPPORT

- **Railway Docs:** https://docs.railway.app
- **Railway Support:** https://railway.app/support
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
**Last Updated:** March 26, 2025
**Version:** 1.0.0
