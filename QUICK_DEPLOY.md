# ⚡ FamilyHub Quick Deploy Guide

**Time to Deploy**: ~30 minutes  
**Platform**: Railway.app  
**Status**: ✅ READY

---

## 🚀 5-Step Deployment

### Step 1️⃣: Create Railway Project (2 min)
```
1. Go to railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Authorize Railway
6. Select familyhub repository
7. Select main branch
```

### Step 2️⃣: Add Environment Variables (5 min)
```
Go to Project Settings → Variables
Add these from your .env file:

DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PUSHER_APP_ID=...
PUSHER_SECRET=...
PUSHER_APP_KEY=...
PUSHER_CLUSTER=...
RESEND_API_KEY=...
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://familyhub.railway.app
```

### Step 3️⃣: Add PostgreSQL (2 min)
```
1. Click "Add Service"
2. Select "PostgreSQL"
3. Railway auto-generates DATABASE_URL
4. Copy to project variables
```

### Step 4️⃣: Deploy (10 min)
```
1. Click "Deploy" button
2. Watch build logs
3. Wait for health check ✅
4. Get deployment URL
```

### Step 5️⃣: Verify (5 min)
```
✅ App loads
✅ Login works
✅ Database connected
✅ Real-time works
✅ Payments work (test)
```

---

## 📋 Environment Variables Checklist

### Required
- [ ] DATABASE_URL
- [ ] CLERK_SECRET_KEY
- [ ] CLERK_PUBLISHABLE_KEY
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_PUBLISHABLE_KEY
- [ ] PUSHER_APP_ID
- [ ] PUSHER_SECRET
- [ ] PUSHER_APP_KEY
- [ ] PUSHER_CLUSTER
- [ ] RESEND_API_KEY
- [ ] NODE_ENV=production
- [ ] NEXT_PUBLIC_APP_URL

### Optional
- [ ] NEXT_PUBLIC_ANALYTICS_ID
- [ ] NEXT_PUBLIC_JITSI_DOMAIN
- [ ] NEXT_PUBLIC_STREAMING_API_KEY

---

## ✅ Post-Deploy Verification

### Immediate (5 min)
```
curl https://familyhub-xxxxx.railway.app
# Should return HTML, not error
```

### Features (10 min)
- [ ] Login page loads
- [ ] Signup works
- [ ] Dashboard loads
- [ ] Real-time works
- [ ] Payments work (test)

### Performance (5 min)
- [ ] Page load < 2s
- [ ] API response < 500ms
- [ ] No errors in logs

---

## 🆘 Troubleshooting

### Build Fails
```
Check logs in Railway dashboard
Look for: npm ci, build step errors
Solution: Verify package.json, check Node version
```

### App Won't Start
```
Check logs for startup errors
Verify DATABASE_URL is set
Check if port 3000 is exposed
```

### Database Connection Failed
```
Verify DATABASE_URL is correct
Check PostgreSQL service is running
Verify credentials in URL
```

### Performance Issues
```
Check CPU/memory in Railway dashboard
Enable auto-scaling if needed
Check database query performance
```

---

## 🔄 Continuous Deployment

### Auto-Deploy
```
1. Make changes locally
2. Run: bun run test
3. Commit: git commit -m "feat: ..."
4. Push: git push origin main
5. Railway auto-deploys (5-10 min)
```

### Manual Rollback
```
1. Go to Railway dashboard
2. Click "Deployments"
3. Select previous deployment
4. Click "Redeploy"
5. Wait 5-10 minutes
```

---

## 📊 Monitoring

### Railway Dashboard
- CPU usage
- Memory usage
- Error rate
- Response time
- Request count

### Health Check
```
GET /health
Response: { status: "ok", database: "connected" }
```

### Logs
```
Railway dashboard → Logs
View real-time application output
```

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Support**: support@railway.app
- **Status**: https://status.railway.app

---

## 🎯 Success Metrics

- ✅ Uptime > 99.9%
- ✅ Response time < 500ms
- ✅ Error rate < 0.1%
- ✅ All features working
- ✅ Users happy

---

## 📚 Full Documentation

For detailed information, see:
- **RAILWAY_DEPLOYMENT.md** - Complete Railway guide
- **DEPLOYMENT_CHECKLIST.md** - Full checklist
- **DEPLOYMENT_SUMMARY.md** - Project overview
- **ARCHITECTURE.md** - System design
- **API_DOCUMENTATION.md** - API reference

---

**Status**: ✅ READY TO DEPLOY  
**Time**: ~30 minutes  
**Platform**: Railway.app

🚀 **Let's go live!**
