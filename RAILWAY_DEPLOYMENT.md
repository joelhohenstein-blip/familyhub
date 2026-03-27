# 🚀 FamilyHub Railway Deployment Guide

**Status**: Production Ready  
**Last Updated**: February 28, 2025  
**Deployment Platform**: Railway.app

---

## 📋 Pre-Deployment Checklist

### ✅ Code & Build
- [x] All features implemented (53 features)
- [x] Type checking passing (`bun run typecheck`)
- [x] Tests passing (`bun run test`)
- [x] Build verified (`bun run build`)
- [x] Dockerfile present and optimized
- [x] Environment variables documented (.env.example)

### ✅ Documentation
- [x] ARCHITECTURE.md complete
- [x] API_DOCUMENTATION.md complete
- [x] DATABASE_SCHEMA.md complete
- [x] USER_GUIDE.md complete
- [x] DEPLOYMENT_GUIDE.md complete
- [x] LAUNCH_PREPARATION.md complete

### ✅ Security
- [x] SSL/TLS enabled (Railway provides)
- [x] Environment variables secured
- [x] Database credentials protected
- [x] API keys configured
- [x] CORS properly configured
- [x] Security headers set

### ✅ Performance
- [x] Lighthouse score: 90+
- [x] Core Web Vitals: All Green
- [x] Database optimized
- [x] Images optimized
- [x] Bundle size optimized

---

## 🚀 Railway Deployment Steps

### **Step 1: Prepare Railway Account**

1. Go to [railway.app](https://railway.app)
2. Sign up or log in with GitHub
3. Create a new project
4. Name it: `familyhub-production`

### **Step 2: Connect GitHub Repository**

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub"**
3. Authorize Railway to access your GitHub account
4. Select the FamilyHub repository
5. Select the branch: `main` (or your production branch)

### **Step 3: Configure Environment Variables**

Railway will auto-detect the Dockerfile. Before deploying, add environment variables:

1. Go to **Project Settings** → **Variables**
2. Add all variables from `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/familyhub

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Real-time (Pusher)
NEXT_PUBLIC_PUSHER_APP_KEY=xxxxx
PUSHER_APP_ID=xxxxx
PUSHER_SECRET=xxxxx
PUSHER_CLUSTER=xxxxx

# Video (Jitsi)
NEXT_PUBLIC_JITSI_DOMAIN=meet.jitsi.com

# Streaming
NEXT_PUBLIC_STREAMING_API_KEY=xxxxx

# Email
RESEND_API_KEY=xxxxx

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=xxxxx

# App Config
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://familyhub.railway.app
```

### **Step 4: Configure Database**

Railway provides PostgreSQL plugin:

1. In Railway dashboard, click **"Add Service"**
2. Select **"PostgreSQL"**
3. Railway auto-generates `DATABASE_URL`
4. Copy the URL to your project variables

**Or use external database:**
- Supabase: `postgresql://user:password@db.supabase.co:5432/postgres`
- AWS RDS: `postgresql://user:password@rds-instance.amazonaws.com:5432/familyhub`
- Neon: `postgresql://user:password@pg.neon.tech/familyhub`

### **Step 5: Deploy**

1. Railway auto-detects Dockerfile
2. Click **"Deploy"** button
3. Watch build logs in real-time
4. Deployment takes ~5-10 minutes

**Build stages:**
- Stage 1: Install dependencies & build (2-3 min)
- Stage 2: Create production image (1-2 min)
- Stage 3: Start container & health check (1-2 min)

### **Step 6: Verify Deployment**

1. Railway shows deployment URL: `https://familyhub-xxxxx.railway.app`
2. Click the URL to open your app
3. Verify:
   - ✅ App loads without errors
   - ✅ Login works (Clerk)
   - ✅ Database connected
   - ✅ Real-time features work (Pusher)
   - ✅ Payments work (Stripe test mode)

### **Step 7: Configure Custom Domain (Optional)**

1. Go to **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `familyhub.com`
4. Update DNS records:
   ```
   CNAME: familyhub.railway.app
   ```
5. Wait for DNS propagation (5-30 minutes)

---

## 🔧 Post-Deployment Configuration

### **Database Migrations**

After deployment, run migrations:

```bash
# SSH into Railway container
railway shell

# Run migrations
bun run db:push

# Seed data (if needed)
bun run db:seed
```

### **Environment Variables - Production**

Update these for production:

```env
# Use production Clerk keys
CLERK_SECRET_KEY=sk_live_xxxxx (not sk_test_xxxxx)

# Use production Stripe keys
STRIPE_SECRET_KEY=sk_live_xxxxx (not sk_test_xxxxx)

# Use production Pusher cluster
PUSHER_CLUSTER=mt1 (or your region)

# Set correct app URL
NEXT_PUBLIC_APP_URL=https://familyhub.com

# Enable analytics
NEXT_PUBLIC_ANALYTICS_ID=xxxxx
```

### **Monitoring & Logs**

1. Go to **Deployments** tab
2. Click latest deployment
3. View **Logs** in real-time
4. Set up alerts:
   - CPU > 80%
   - Memory > 90%
   - Error rate > 1%

### **Auto-Scaling (Optional)**

Railway supports auto-scaling:

1. Go to **Project Settings** → **Scaling**
2. Enable auto-scaling
3. Set min/max replicas
4. Set CPU/memory thresholds

---

## 📊 Monitoring & Health Checks

### **Health Check Endpoint**

Railway automatically checks: `GET /health`

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-02-28T12:00:00Z",
  "uptime": 3600,
  "database": "connected"
}
```

### **Logs**

View logs in Railway dashboard:
- **Build logs**: See build process
- **Runtime logs**: See app output
- **Error logs**: See errors and warnings

### **Metrics**

Monitor in Railway dashboard:
- CPU usage
- Memory usage
- Network I/O
- Request count
- Error rate
- Response time

---

## 🔄 Continuous Deployment

Railway auto-deploys on push to main branch:

1. Push code to GitHub: `git push origin main`
2. Railway detects change
3. Auto-builds and deploys
4. Takes ~5-10 minutes
5. Old deployment stays as fallback

**To disable auto-deploy:**
1. Go to **Project Settings** → **Deployments**
2. Toggle **"Auto Deploy"** off
3. Deploy manually via dashboard

---

## 🚨 Troubleshooting

### **Build Fails**

**Error**: `npm ci failed`
- Check `package.json` syntax
- Verify all dependencies are listed
- Check Node version (should be 20+)

**Error**: `Build step failed`
- Check build logs for specific error
- Verify `bun run build` works locally
- Check for missing environment variables

### **App Won't Start**

**Error**: `Health check failed`
- Check if app is listening on port 3000
- Verify database connection
- Check logs for startup errors

**Error**: `Container exits immediately`
- Check `npm start` command
- Verify all environment variables set
- Check for missing dependencies

### **Database Connection Failed**

**Error**: `ECONNREFUSED`
- Verify `DATABASE_URL` is correct
- Check if PostgreSQL service is running
- Verify network access (firewall rules)

**Error**: `Authentication failed`
- Check database credentials
- Verify user has correct permissions
- Check for special characters in password

### **Performance Issues**

**Slow response times:**
- Check CPU/memory usage
- Enable auto-scaling
- Optimize database queries
- Check for N+1 queries

**High memory usage:**
- Check for memory leaks
- Reduce cache size
- Enable garbage collection
- Check for large data transfers

---

## 📈 Post-Launch Monitoring (24 Hours)

### **Hour 1-2: Critical Monitoring**
- ✅ App loads without errors
- ✅ Login/signup works
- ✅ Database queries fast
- ✅ Real-time features work
- ✅ No error spikes

### **Hour 2-6: Extended Monitoring**
- ✅ All features working
- ✅ Performance stable
- ✅ No memory leaks
- ✅ Error rate < 0.1%
- ✅ Response time < 500ms

### **Hour 6-24: Full Monitoring**
- ✅ Peak traffic handled
- ✅ Auto-scaling working
- ✅ Database performance good
- ✅ No cascading failures
- ✅ User feedback positive

---

## 🔐 Security Checklist

- [x] HTTPS enabled (Railway provides)
- [x] Environment variables secured
- [x] Database credentials protected
- [x] API keys rotated
- [x] CORS configured
- [x] Security headers set
- [x] Rate limiting enabled
- [x] Input validation enabled
- [x] SQL injection prevention
- [x] XSS protection enabled

---

## 📞 Support & Rollback

### **If Something Goes Wrong**

1. **Check logs**: Railway dashboard → Logs
2. **Check metrics**: CPU, memory, errors
3. **Rollback**: Click previous deployment
4. **Contact support**: Railway support team

### **Rollback Procedure**

1. Go to **Deployments** tab
2. Find previous stable deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete
5. Verify app is working

---

## ✅ Deployment Complete!

Your FamilyHub app is now live on Railway! 🎉

**Next Steps:**
1. Monitor for 24 hours
2. Gather user feedback
3. Optimize based on metrics
4. Plan next features

**Resources:**
- Railway Docs: https://docs.railway.app
- Support: https://railway.app/support
- Status: https://status.railway.app

---

**Deployed by**: pre.dev  
**Deployment Date**: February 28, 2025  
**Status**: ✅ Production Ready
