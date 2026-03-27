# FamilyHub Deployment Guide

## 🚀 Quick Start Deployment

This guide covers deploying FamilyHub to production.

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 13+
- Redis 6+
- Production domain name
- GitHub account (for Git deployments)

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

**Why Railway?**
- Auto-deploys from GitHub
- Managed PostgreSQL & Redis
- Simple environment variable management
- Free tier available

**Steps:**

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   STRIPE_SECRET_KEY=sk_live_...
   PUSHER_APP_ID=...
   PUSHER_KEY=...
   PUSHER_SECRET=...
   RESEND_API_KEY=re_...
   ```
6. Click "Deploy"

**Cost:** ~$5-50/month

---

### Option 2: Vercel (Best for React Router)

**Why Vercel?**
- Built for Next.js/React Router
- Automatic HTTPS
- Global CDN
- Zero-config deployment

**Steps:**

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import from Git
4. Select your repository
5. Add environment variables (same as above)
6. Click "Deploy"

**Note:** External database required (e.g., Railway PostgreSQL + Redis)

**Cost:** ~$20-50/month

---

### Option 3: Docker + Any Cloud Platform

**Build Docker Image:**

```bash
docker build -t familyhub:latest .
docker run -e DATABASE_URL=postgresql://... -e REDIS_URL=redis://... -p 3000:3000 familyhub:latest
```

**Deploy to:**
- AWS ECS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean

---

## Environment Variables (Production)

```bash
# Application
NODE_ENV=production
APP_PORT=3000
PREDEV_DEPLOYMENT_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/familyhub
PRODUCTION_DATABASE_URL=postgresql://user:password@host:5432/familyhub

# Redis
REDIS_URL=redis://user:password@host:6379
PRODUCTION_REDIS_URL=redis://user:password@host:6379

# Authentication
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Payment Processing (Stripe)
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Real-time (Pusher)
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=mt1

# Email (Resend)
RESEND_API_KEY=re_...

# AI Features
OPENAI_API_KEY=sk-...

# Weather
OPENWEATHER_API_KEY=...

# Domain/CORS
ALLOWED_ORIGINS=https://yourdomain.com
CORS_CREDENTIALS=true
```

## Pre-Deployment Checklist

- [ ] Production build passes: `bun run build`
- [ ] Environment variables configured
- [ ] PostgreSQL database created and accessible
- [ ] Redis instance running and accessible
- [ ] Database migrations tested: `bun run db:push`
- [ ] Secrets stored securely (not in git)
- [ ] HTTPS/SSL configured
- [ ] Domain DNS configured
- [ ] Backups configured
- [ ] Monitoring setup (optional: Sentry, DataDog)

## Deployment Steps

### 1. Prepare Environment

```bash
# Clone repository
git clone https://github.com/yourusername/familyhub.git
cd familyhub

# Install dependencies
bun install

# Build production bundle
bun run build
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
psql -c "CREATE DATABASE familyhub;"

# Run migrations
bun run db:push

# Seed data (optional)
bun run db:seed
```

### 3. Set Environment Variables

Create `.env.production` with all production variables listed above.

### 4. Test Production Build Locally

```bash
NODE_ENV=production bun run build
NODE_ENV=production bun start
```

Visit http://localhost:3000 and verify:
- Home page loads
- Login/signup pages accessible
- Dashboard auth guard works
- No console errors

### 5. Deploy to Platform

Follow platform-specific instructions (Railway, Vercel, etc.)

### 6. Post-Deployment Verification

```bash
# Check app is running
curl https://yourdomain.com

# Verify core endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/login
curl https://yourdomain.com/signup

# Test authentication flow
# Go to https://yourdomain.com
# Try signup/login flow
```

## Monitoring & Maintenance

### Logs
- Check application logs for errors
- Monitor error tracking (if configured)

### Performance
- Monitor response times
- Check database query performance
- Monitor Redis memory usage

### Security
- Regularly update dependencies: `bun update`
- Monitor for security vulnerabilities
- Backup database regularly

### Scaling
- Monitor CPU/memory usage
- Scale database as needed
- Add CDN if needed (Cloudflare, etc.)

## Troubleshooting

### App Won'"'"'t Start
```bash
# Check environment variables
echo $DATABASE_URL
echo $REDIS_URL

# Check build
bun run build

# Check logs
tail -f /var/log/app.log
```

### Database Connection Error
```bash
# Test PostgreSQL connection
psql $DATABASE_URL

# Verify DATABASE_URL format:
# postgresql://user:password@host:port/database
```

### Redis Connection Error
```bash
# Test Redis connection
redis-cli -u $REDIS_URL PING

# Should respond: PONG
```

### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next build dist
bun install
bun run build
```

## Rollback Procedure

If deployment fails:

1. **Revert code:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Platform will auto-redeploy** (most platforms)

3. **Or manually redeploy previous version:**
   - Railway: Select previous deployment
   - Vercel: Select previous deployment
   - Docker: Deploy previous image tag

## Support & Resources

- Documentation: [http://localhost:3000/docs](Documentation)
- GitHub Issues: [Report bugs](https://github.com/yourusername/familyhub/issues)
- Email: support@yourdomain.com

---

**Last Updated:** February 2026
**App Version:** 1.0.0
EOF
cat /workspace/DEPLOYMENT.md
