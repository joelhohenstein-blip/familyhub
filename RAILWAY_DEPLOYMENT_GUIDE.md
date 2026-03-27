# FamilyHub Production Deployment to Railway.app

## 🚀 Quick Start (5 minutes)

### Step 1: Connect GitHub to Railway
1. Go to **railway.app**
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Authorize Railway to access your GitHub account
5. Select your FamilyHub repository

### Step 2: Configure Environment Variables
Railway will automatically detect your `package.json` and create a Node.js service.

Add these environment variables in Railway dashboard:

```
# Core
NODE_ENV=production
PORT=3000

# Database (Railway will provide PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/familyhub

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@familyhub.com

# Pusher (Real-time)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster

# Analytics
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_MIXPANEL_TOKEN=your_mixpanel_token
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACE_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0

# App
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://familyhub.com/api
```

### Step 3: Add PostgreSQL Database
1. In Railway dashboard, click **"+ Add Service"**
2. Select **"PostgreSQL"**
3. Railway will automatically set `DATABASE_URL` environment variable
4. Click **"Deploy"**

### Step 4: Configure Build & Start Commands
Railway should auto-detect from `package.json`:
- **Build:** `bun run build`
- **Start:** `bun run start`

If not, set manually:
1. Go to **Settings** → **Build**
2. Set Build Command: `bun run build`
3. Set Start Command: `bun run start`

### Step 5: Deploy
1. Click **"Deploy"** button
2. Watch the build logs
3. Once deployed, Railway gives you a URL like `https://familyhub-production.up.railway.app`

---

## 📋 Post-Deployment Checklist

### ✅ Verify Deployment
```bash
# Test health endpoint
curl https://familyhub-production.up.railway.app/health

# Test API
curl https://familyhub-production.up.railway.app/api/trpc/health.check
```

### ✅ Database Migrations
1. In Railway dashboard, go to **Deployments**
2. Click **"View Logs"**
3. Verify migrations ran successfully
4. Check database has tables: `users`, `families`, `messages`, etc.

### ✅ Test Authentication
1. Navigate to `https://familyhub-production.up.railway.app`
2. Click **"Sign Up"**
3. Create test account
4. Verify email confirmation works
5. Test login/logout

### ✅ Test Core Features
- [ ] Create family
- [ ] Invite members
- [ ] Send messages
- [ ] Upload photos
- [ ] Create calendar events
- [ ] Create shopping lists
- [ ] Make donation

### ✅ Configure Custom Domain
1. Register domain (e.g., `familyhub.com`)
2. In Railway dashboard, go to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter `familyhub.com`
5. Railway provides DNS records to add to your domain registrar
6. Add CNAME record pointing to Railway
7. Wait for DNS propagation (5-30 minutes)

### ✅ Set Up Email
1. Create SendGrid account
2. Verify sender email: `noreply@familyhub.com`
3. Get API key
4. Add to Railway environment variables
5. Test email sending (sign up flow)

### ✅ Enable Error Tracking
1. Create Sentry account
2. Create new project for FamilyHub
3. Get DSN
4. Add to Railway environment variables
5. Verify errors are tracked

### ✅ Set Up Monitoring
1. In Railway dashboard, go to **Monitoring**
2. Enable **Health Checks**
3. Set health check endpoint: `/health`
4. Set interval: 30 seconds
5. Enable **Alerts** for failures

---

## 🔧 Troubleshooting

### Build Fails
**Check logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Common issues:**
- Missing environment variables → Add to Railway dashboard
- TypeScript errors → Run `bun run typecheck` locally
- Missing dependencies → Run `bun install` locally

### App Crashes After Deploy
**Check logs:**
```
Railway Dashboard → Deployments → View Logs
```

**Common issues:**
- Database connection failed → Verify `DATABASE_URL`
- Missing API keys → Add all environment variables
- Port binding → Ensure app listens on `PORT` env var

### Database Issues
**Connect to database:**
```bash
# Get DATABASE_URL from Railway dashboard
psql "your_database_url"

# Check tables
\dt

# Check migrations
SELECT * FROM __drizzle_migrations__;
```

### Domain Not Working
1. Verify DNS records are added correctly
2. Wait for DNS propagation (up to 48 hours)
3. Test with: `nslookup familyhub.com`
4. Check Railway domain settings

---

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Check error logs in Sentry
- [ ] Monitor database size
- [ ] Check API response times
- [ ] Verify email delivery

### Weekly Checks
- [ ] Review user feedback
- [ ] Check feature usage analytics
- [ ] Monitor server costs
- [ ] Backup database

### Monthly Checks
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Optimize database queries
- [ ] Plan feature releases

---

## 🚨 Rollback Plan

If deployment fails:

1. **Immediate:** Revert to previous deployment
   - Railway Dashboard → Deployments → Select previous → Click "Redeploy"

2. **Database:** Restore from backup
   - Railway Dashboard → PostgreSQL → Backups → Restore

3. **Domain:** Point to backup server
   - Update DNS CNAME record

---

## 📞 Support

**Railway Support:** https://railway.app/support
**FamilyHub Docs:** See `/workspace/DEPLOYMENT_GUIDE.md`
**API Docs:** See `/workspace/API_DOCUMENTATION.md`

---

## ✨ Next Steps After Deployment

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

**Deployment Status:** Ready for Production ✅
**Last Updated:** March 26, 2025
**Version:** 1.0.0
