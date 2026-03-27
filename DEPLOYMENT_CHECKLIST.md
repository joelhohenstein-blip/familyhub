# FamilyHub Deployment Checklist
## Quick Reference Guide

---

## 📋 PRE-DEPLOYMENT (Do This First)

- [ ] **GitHub Repository Ready**
  - [ ] Code is pushed to `joelhohenstein-blip/familyhub-app`
  - [ ] All changes committed
  - [ ] Main branch is up-to-date

- [ ] **Environment Variables Prepared**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Fill in Clerk keys (REQUIRED)
  - [ ] Have Sentry DSN ready (optional, can add later)
  - [ ] Have GA4 Measurement ID ready (optional, can add later)

---

## 🚀 DEPLOYMENT (15 minutes)

### Step 1: Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Click "Sign Up"
- [ ] Authorize with GitHub
- [ ] Select your GitHub account

### Step 2: Import Project
- [ ] Click "Import Project"
- [ ] Search for `familyhub-app`
- [ ] Click "Import"

### Step 3: Add Environment Variables
- [ ] Add `NODE_ENV=production`
- [ ] Add `PORT=3000`
- [ ] Add `CLERK_SECRET_KEY=sk_live_...`
- [ ] Add `CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] Add `VITE_SENTRY_DSN=...` (optional)
- [ ] Add `VITE_GA4_MEASUREMENT_ID=G-...` (optional)
- [ ] Add `VITE_API_URL=https://familyhub-app.vercel.app/api`

### Step 4: Add Postgres Database
- [ ] Go to "Storage" tab
- [ ] Click "Create" → "Postgres"
- [ ] Name it `familyhub-db`
- [ ] Select your region
- [ ] Click "Create"
- [ ] Vercel auto-sets `DATABASE_URL`

### Step 5: Deploy
- [ ] Click "Deploy" button
- [ ] Watch build logs (2-5 minutes)
- [ ] Wait for green ✅ checkmark
- [ ] Copy your live URL: `https://familyhub-app.vercel.app`

---

## ✅ POST-DEPLOYMENT (Verify Everything Works)

### Test App
- [ ] Navigate to `https://familyhub-app.vercel.app`
- [ ] Page loads without errors
- [ ] Sign up with test account
- [ ] Verify email confirmation works
- [ ] Test login/logout
- [ ] Create a family
- [ ] Send a message
- [ ] Upload a photo
- [ ] Create calendar event

### Test API
- [ ] `curl https://familyhub-app.vercel.app/health` returns 200
- [ ] `curl https://familyhub-app.vercel.app/api/trpc/health.check` returns data

### Check Database
- [ ] Vercel Storage shows Postgres is running
- [ ] Tables exist (users, families, messages, etc.)
- [ ] Can query data

### Check Monitoring
- [ ] Sentry dashboard shows your app (if configured)
- [ ] Google Analytics shows you as active user (if configured)

---

## 📧 OPTIONAL: Set Up Clerk (If Not Done)

- [ ] Go to https://dashboard.clerk.com
- [ ] Create new application
- [ ] Get `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
- [ ] Add to Vercel environment variables
- [ ] Redeploy

---

## 🔍 OPTIONAL: Set Up Sentry (If Not Done)

- [ ] Go to https://sentry.io
- [ ] Sign up (free tier)
- [ ] Create new project
- [ ] Select "Node.js" + "React"
- [ ] Copy DSN
- [ ] Add `VITE_SENTRY_DSN=...` to Vercel
- [ ] Redeploy
- [ ] Trigger an error to test

---

## 📊 OPTIONAL: Set Up Google Analytics (If Not Done)

- [ ] Go to https://analytics.google.com
- [ ] Create new property
- [ ] Select "Web"
- [ ] Enter app URL: `https://familyhub-app.vercel.app`
- [ ] Copy Measurement ID
- [ ] Add `VITE_GA4_MEASUREMENT_ID=G-...` to Vercel
- [ ] Redeploy
- [ ] Visit app and check Realtime in GA4

---

## 🎉 LAUNCH (Tell Your Friends!)

- [ ] Share `https://familyhub-app.vercel.app` with friends/family
- [ ] Gather feedback
- [ ] Monitor Sentry for errors
- [ ] Check Google Analytics for usage
- [ ] Fix bugs and optimize features

---

## 🌐 LATER: Custom Domain (When Traction Grows)

- [ ] Register domain (e.g., `familyhub.com`)
- [ ] Add to Vercel Settings → Domains
- [ ] Point DNS to Vercel
- [ ] Wait for DNS propagation
- [ ] Verify domain works

---

## 💳 LATER: Enable Stripe (When Ready)

- [ ] Get Stripe keys from https://dashboard.stripe.com
- [ ] Add to Vercel environment variables
- [ ] Redeploy
- [ ] Test with Stripe test card: `4242 4242 4242 4242`

---

## 📧 LATER: Enable SendGrid (When Ready)

- [ ] Create SendGrid account
- [ ] Get API key
- [ ] Verify sender email
- [ ] Add to Vercel environment variables
- [ ] Redeploy
- [ ] Test email sending

---

## 🆘 TROUBLESHOOTING

### Build Failed
- [ ] Check Vercel build logs
- [ ] Verify all environment variables are set
- [ ] Run `bun run typecheck` locally
- [ ] Run `bun install` locally

### App Crashes
- [ ] Check Vercel deployment logs
- [ ] Verify `DATABASE_URL` is set
- [ ] Verify Clerk keys are correct
- [ ] Check Sentry for error details

### Database Connection Failed
- [ ] Verify Postgres is running in Vercel Storage
- [ ] Check `DATABASE_URL` is set
- [ ] Run migrations: `bun run db:push`

### Sentry Not Working
- [ ] Verify `VITE_SENTRY_DSN` is set
- [ ] Trigger an error in your app
- [ ] Wait 30 seconds
- [ ] Check Sentry dashboard

### Analytics Not Working
- [ ] Verify `VITE_GA4_MEASUREMENT_ID` is set
- [ ] Visit app in new browser
- [ ] Check Google Analytics Realtime

---

## 📞 SUPPORT

- **Vercel:** https://vercel.app/support
- **Sentry:** https://docs.sentry.io
- **Google Analytics:** https://support.google.com/analytics
- **Clerk:** https://clerk.com/docs

---

**Status:** Ready to Deploy ✅  
**Estimated Time:** 15 minutes  
**Cost:** $0 (free tier)  
**Last Updated:** March 26, 2025
