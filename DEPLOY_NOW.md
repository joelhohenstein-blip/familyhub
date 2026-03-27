# 🚀 DEPLOY NOW - LIVE DEPLOYMENT COMMANDS

**Status**: ✅ READY TO DEPLOY  
**Time**: ~30 minutes to live  
**Platform**: Railway.app  

---

## 🎯 STEP 1: Create Railway Account & Project (5 min)

```bash
# 1. Go to https://railway.app
# 2. Sign up with GitHub (fastest)
# 3. Create new project
# 4. Select "Deploy from GitHub"
# 5. Connect your GitHub repo
```

**Railway Dashboard**: https://railway.app/dashboard

---

## 🔑 STEP 2: Set Environment Variables (5 min)

In Railway dashboard, go to **Variables** and add these:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/familyhub

# Clerk Auth
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# API
NEXT_PUBLIC_API_URL=https://your-railway-domain.railway.app
NODE_ENV=production

# Optional
STRIPE_SECRET_KEY=sk_live_xxxxx (if using payments)
SENDGRID_API_KEY=xxxxx (if using email)
```

**Get these from:**
- **Clerk**: https://dashboard.clerk.com → API Keys
- **Database**: Railway will provide after adding PostgreSQL plugin
- **Stripe**: https://dashboard.stripe.com → API Keys (if needed)

---

## 🚀 STEP 3: Deploy (10 min)

### Option A: Auto-Deploy from GitHub (Recommended)
```
1. Connect GitHub repo in Railway
2. Select main branch
3. Click "Deploy"
4. Wait 5-10 minutes for build
5. Railway auto-deploys on every push
```

### Option B: Manual Deploy with Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up

# Get URL
railway open
```

---

## ✅ STEP 4: Verify Deployment (5 min)

Once deployed, test these:

```bash
# 1. Check health
curl https://your-railway-domain.railway.app/api/health

# 2. Test auth
# Visit https://your-railway-domain.railway.app
# Sign up with test account

# 3. Check database
# Should see data loading on dashboard

# 4. Test API
curl https://your-railway-domain.railway.app/api/families
```

---

## 🔍 STEP 5: Monitor & Debug (Ongoing)

### View Logs
```bash
railway logs
# or in Railway dashboard → Logs tab
```

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| **Build fails** | Check `railway logs` for errors, verify env vars |
| **Database connection error** | Verify DATABASE_URL in Railway variables |
| **Clerk auth not working** | Check CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY |
| **Blank page** | Check browser console for errors, verify NEXT_PUBLIC_API_URL |
| **API 500 errors** | Check `railway logs`, verify database migrations ran |

### Enable Auto-Scaling
In Railway dashboard:
- Go to **Settings** → **Scaling**
- Set min instances: 1
- Set max instances: 3
- Enable auto-scaling

---

## 📊 Post-Deployment Checklist

- [ ] App loads without errors
- [ ] Sign up works
- [ ] Login works
- [ ] Dashboard shows data
- [ ] API endpoints respond
- [ ] Database queries work
- [ ] Images load
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Lighthouse score > 80

---

## 🎉 YOU'RE LIVE!

Once deployed:
- Share your URL: `https://your-railway-domain.railway.app`
- Monitor performance in Railway dashboard
- Set up alerts for errors
- Enable auto-scaling for traffic spikes

---

## 📞 Support

**Railway Docs**: https://docs.railway.app  
**Clerk Docs**: https://clerk.com/docs  
**Next.js Docs**: https://nextjs.org/docs  

**Need help?**
- Check `railway logs` for errors
- Verify all env vars are set
- Ensure database migrations ran
- Check Clerk dashboard for auth issues

---

## 🚀 READY? LET'S GO!

1. Open https://railway.app
2. Create project
3. Add env vars
4. Deploy
5. Share your live URL

**You've got this! 🎯**
