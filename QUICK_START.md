# Family Hub - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Clone & Setup

```bash
# Clone repository
git clone https://github.com/family-hub/app.git
cd app

# Copy environment template
cp .env.example .env

# Start local services
docker-compose up -d

# Verify services
docker-compose ps
```

**Access Local App**: http://localhost:3000

---

## 📚 Documentation Hub

### For Developers

- **[CI/CD Quick Reference](CI_CD_README.md)** - Start here for overview
- **[Local Development](CONTAINER_SETUP.md)** - Docker and local setup
- **[Make Changes Guide](CI_CD_README.md#making-changes)** - How to commit and deploy

### For DevOps

- **[CI/CD Pipeline Guide](.github/CI_CD_GUIDE.md)** - Complete technical details
- **[Deployment Guide](.github/DEPLOYMENT.md)** - Staging and production procedures
- **[Secrets Management](.github/SECRETS_MANAGEMENT.md)** - Security and credentials
- **[Implementation Checklist](.github/IMPLEMENTATION_CHECKLIST.md)** - Setup tracking

### For Operations

- **[Health Checks](CONTAINER_SETUP.md#health-checks)** - Monitoring endpoints
- **[Troubleshooting](.github/DEPLOYMENT.md#troubleshooting)** - Common issues
- **[Emergency Procedures](.github/DEPLOYMENT.md#emergency-procedures)** - Critical incidents

---

## 🎯 Common Tasks

### Make & Deploy Changes

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test locally
npm test

# 3. Commit and push
git add .
git commit -m "feat: add feature"
git push origin feature/my-feature

# 4. Create PR
# GitHub → Create PR → Wait for CI → Merge when passing

# 5. Auto-deploy to staging
# Changes to develop → Auto-deploy to staging
# Check: https://staging.familyhub.local
```

### Deploy to Production

```bash
# Merge develop → main
git checkout main
git pull
git merge develop
git push origin main

# OR manually trigger
gh workflow run deploy-production.yml -f deployment_strategy=blue-green

# Approve when prompted
# Monitor: GitHub Actions → deploy-production
```

### Check Pipeline Status

```bash
# View all workflows
gh run list --workflow=ci.yml

# Check specific run
gh run view <run-id> --log

# View deployments
gh deployment list
```

---

## 📁 Important Files & Locations

### Configuration
- `.env.example` - Environment variables template
- `docker-compose.yml` - Local services setup
- `Dockerfile` - Production container image
- `.dockerignore` - Build optimization

### CI/CD Workflows
- `.github/workflows/ci.yml` - Automated testing
- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/deploy-production.yml` - Production deployment

### Documentation
- `.github/` - All CI/CD and deployment docs
- `CI_CD_README.md` - Quick reference
- `CONTAINER_SETUP.md` - Docker guide

### Application
- `app/routes/health.tsx` - Health check endpoint
- `app/db/` - Database configuration
- `app/server/` - Backend code

---

## 🔗 Quick Links

**Local Development**
- App: http://localhost:3000
- Database Admin: http://localhost:8080 (Adminer)
- Redis Admin: http://localhost:8081 (Redis Commander)

**Staging**
- App: https://staging.familyhub.local
- Health: https://staging.familyhub.local/health

**Production**
- App: https://familyhub.local
- Health: https://familyhub.local/health

**GitHub**
- [Repository](https://github.com/family-hub/app)
- [Actions](https://github.com/family-hub/app/actions)
- [Environments](https://github.com/family-hub/app/settings/environments)
- [Secrets](https://github.com/family-hub/app/settings/secrets)

---

## ✅ System Check

```bash
# Verify Docker
docker --version  # >= 24.0
docker-compose --version  # >= 2.20

# Verify Node
node --version  # >= 20
npm --version

# Verify environment
npm run typecheck  # Should have no errors
npm run build      # Should complete successfully

# Verify services
docker-compose ps  # All containers should be "Up"
curl http://localhost:3000/health  # Should return 200
```

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| Services won't start | Check Docker is running: `docker ps` |
| Port already in use | Kill process: `lsof -i :3000` |
| Build fails locally | Clear cache: `npm ci && npm run build` |
| Tests failing | Run locally: `npm test` |
| CI pipeline failing | Check workflow logs: GitHub Actions tab |
| Deployment fails | See [Troubleshooting](.github/DEPLOYMENT.md#troubleshooting) |
| Database error | Check: `docker-compose logs postgres` |

---

## 📚 Learn More

- **GitHub Actions**: https://docs.github.com/en/actions
- **Docker**: https://docs.docker.com/
- **React Router**: https://reactrouter.com/
- **tRPC**: https://trpc.io/
- **Drizzle ORM**: https://orm.drizzle.team/

---

## 🎯 Next Steps

1. ✅ **Local Setup** - Run `docker-compose up -d`
2. ✅ **Make Changes** - Create feature branch and commit
3. ✅ **Test Locally** - Run `npm test`
4. ✅ **Push & Deploy** - CI/CD handles the rest
5. ✅ **Monitor** - Check GitHub Actions for status

---

**Updated**: February 7, 2024  
**Status**: ✅ Ready to use  
**Support**: See `.github/README.md` for more details
