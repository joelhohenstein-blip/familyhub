# Family Hub - CI/CD & Deployment Documentation

Welcome to the Family Hub CI/CD documentation. This guide covers automated testing, building, and deployment.

## Quick Links

- **[CI/CD Pipeline Guide](./.github/CI_CD_GUIDE.md)** - Detailed CI/CD workflow documentation
- **[Deployment Guide](./.github/DEPLOYMENT.md)** - Deploy to staging/production
- **[Secrets Management](./.github/SECRETS_MANAGEMENT.md)** - Manage credentials securely
- **[Container Setup](./CONTAINER_SETUP.md)** - Docker and registry setup

## Overview

The Family Hub application uses a modern CI/CD pipeline:

```
Code Push → Automated Tests → Build → Deploy
```

### Key Features

✅ **Automated Testing** - Run tests on every push  
✅ **Code Quality** - Lint and type checking  
✅ **Security Scanning** - Vulnerability detection  
✅ **Docker Builds** - Containerized application  
✅ **Staging Deployment** - Automatic (develop branch)  
✅ **Production Deployment** - Manual with approvals  
✅ **Rollback Support** - 24-hour rollback window  
✅ **Health Monitoring** - Automated health checks  

---

## Getting Started

### For Developers

#### 1. Local Development Setup

```bash
# Clone repository
git clone https://github.com/family-hub/app.git
cd app

# Copy environment template
cp .env.example .env

# Start local services
docker-compose up -d

# Install dependencies
npm ci

# Run application
npm run dev
```

#### 2. Making Changes

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test locally
npm run typecheck
npm test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create Pull Request on GitHub
# → Tests run automatically
# → Code review required
# → Merge when approved
```

#### 3. CI/CD Automation

Once you push to GitHub:

1. ✅ **CI Workflow** (automatic)
   - Linting and type checking
   - Unit and integration tests
   - Docker image build
   - Security scanning
   - ~5-10 minutes

2. 🚀 **Staging Deployment** (automatic for `develop`)
   - Deploy to staging environment
   - Run smoke tests
   - Available at: https://staging.familyhub.local
   - ~5-10 minutes

3. 🎯 **Production Deployment** (manual for `main`)
   - Requires manual approval
   - Deploy with blue-green strategy
   - Available at: https://familyhub.local
   - ~20-30 minutes

### For DevOps

#### 1. Configure Environments

```bash
# Go to GitHub repository
Settings → Environments

# Create staging environment
Name: staging
Add secrets:
  - STAGING_DATABASE_URL
  - Required API keys

# Create production environment
Name: production
Add secrets:
  - PRODUCTION_DATABASE_URL
  - Required API keys
  - Add approvers for manual deployment
```

#### 2. Monitor Deployments

```bash
# View all workflows
GitHub → Actions tab

# View specific deployment
Actions → deploy-production → latest run

# Check logs
Click on workflow run → Expand step → View logs
```

#### 3. Handle Issues

```bash
# If tests fail
1. Click on failing workflow
2. Expand failed step
3. Read error message
4. Fix locally: npm test
5. Commit and push fix

# If deployment fails
1. Click on deployment workflow
2. Check health status
3. Automatic rollback happens in 5 minutes
4. Or manually trigger rollback
```

---

## Workflow Diagrams

### Staging Deployment Flow

```
develop branch push
       ↓
   CI Workflow
   ├─ Lint ✓
   ├─ Test ✓
   └─ Build Docker image ✓
       ↓
Auto Deploy to Staging
   ├─ Deploy green environment
   ├─ Run smoke tests ✓
   └─ Switch traffic
       ↓
Staging Live
https://staging.familyhub.local ✓
```

### Production Deployment Flow

```
Manual Trigger
       ↓
  Pre-Checks
   ├─ All tests passing ✓
   ├─ Staging verified ✓
   └─ Approvers notified
       ↓
  Await Approval
       ↓
Deploy to Production
   ├─ Build Docker image
   ├─ Deploy to green
   ├─ Run smoke tests
   └─ Switch traffic
       ↓
Production Live
https://familyhub.local ✓
       ↓
Monitor (5 minutes)
   ├─ Error rates < 0.1%
   ├─ Response times normal
   └─ All systems healthy
```

---

## Common Tasks

### View CI/CD Status

```bash
# Via GitHub UI
GitHub → Actions tab → Select workflow

# Via GitHub CLI
gh workflow list
gh run list --workflow=ci.yml

# Quick check
gh run view <run-id> --log
```

### Trigger Manual Deployment

```bash
# Staging (manual)
gh workflow run deploy-staging.yml

# Production (manual)
gh workflow run deploy-production.yml \
  -f deployment_strategy=blue-green
```

### Add a New Secret

```bash
# Via GitHub UI
Settings → Secrets and variables → Actions → New repository secret

# Via CLI
gh secret set SECRET_NAME --body "secret_value"
```

### View Deployment History

```bash
# All deployments
gh deployment list

# Staging deployments
gh deployment list --environment=staging

# Production deployments
gh deployment list --environment=production
```

### Rollback Deployment

```bash
# Automatic: Happens if health checks fail

# Manual rollback (within 24 hours)
# See .github/DEPLOYMENT.md → Rollback Procedures
```

---

## Environment Configuration

### Required Secrets by Environment

#### Development (Local)
```bash
.env file with:
- DATABASE_URL (local)
- REDIS_URL (local)
- CLERK keys (test)
- Other service credentials
```

#### Staging (GitHub)
```
STAGING_DATABASE_URL
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
OPENWEATHER_API_KEY
```

#### Production (GitHub)
```
PRODUCTION_DATABASE_URL
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
OPENWEATHER_API_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL (for notifications)
```

### Updating Environment Variables

```bash
# Edit local .env
nano .env

# For GitHub environments
Settings → Secrets and variables → Actions
→ [Environment] → New environment secret
```

---

## Monitoring & Troubleshooting

### Health Checks

The application exposes health checks:

```bash
# Development
curl http://localhost:3000/health

# Staging
curl https://staging.familyhub.local/health

# Production
curl https://familyhub.local/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-07T12:00:00Z",
  "uptime": 86400000,
  "checks": {
    "database": { "status": "ok", "latency": 2.5 },
    "memory": { "status": "ok", "percentage": 50 }
  }
}
```

### Common Issues

**Issue**: Tests failing locally but passing in CI
```bash
# Likely: Different environment
npm test  # Run locally
docker-compose exec app npm test  # Run in container
```

**Issue**: Docker build fails
```bash
docker build -t family-hub:dev .
# Check error output
```

**Issue**: Deployment stuck
```bash
# Check workflow status
gh run list --workflow=deploy-staging.yml

# Cancel if hung
gh run cancel <run-id>
```

**Issue**: Health check failing
```bash
# SSH into container and check logs
docker logs family-hub-app

# Verify database connectivity
docker exec family-hub-app npm run db:verify
```

---

## Security

### Secret Management

- ✅ All secrets stored in GitHub Secrets (encrypted)
- ✅ Secrets are masked in logs
- ✅ Environment-specific secrets
- ✅ Automatic rotation schedule
- ✅ Access auditing

**Never**:
- ❌ Commit secrets to repository
- ❌ Log secrets
- ❌ Share secrets via Slack/email
- ❌ Use hardcoded credentials

See [SECRETS_MANAGEMENT.md](./.github/SECRETS_MANAGEMENT.md) for details.

### Code Quality

All code is scanned for:
- TypeScript type safety
- Linting errors
- Security vulnerabilities
- Dependency vulnerabilities

### Container Security

- Non-root user in Docker image
- Minimal base image (Alpine)
- Security scanning on builds
- Image signed with digest

---

## Performance

### Build Times

| Stage | Time |
|-------|------|
| Checkout | 5s |
| Setup | 10s |
| Dependencies (cached) | 30s |
| Lint | 60s |
| Tests | 300s |
| Build | 120s |
| Docker build | 180s |
| **Total** | **~10 min** |

### Optimization Tips

- Dependencies are cached (npm ci with cache: npm)
- Docker layers are cached
- Tests run in parallel
- Use `[skip ci]` in commit message for doc-only changes

---

## Documentation Files

| File | Purpose |
|------|---------|
| `.github/CI_CD_GUIDE.md` | Complete CI/CD workflow guide |
| `.github/DEPLOYMENT.md` | Staging/production deployment procedures |
| `.github/SECRETS_MANAGEMENT.md` | Secrets and credential management |
| `CONTAINER_SETUP.md` | Docker and container registry setup |
| `CI_CD_README.md` | This file - quick reference |

---

## Getting Help

### Issues or Questions?

1. **Check Documentation** - Start with guides above
2. **Search GitHub Issues** - Existing solutions
3. **Ask in Slack** - #devops or #development channel
4. **Contact DevOps** - devops@familyhub.local
5. **On-call Support** - Check PagerDuty

### Reporting Issues

When reporting CI/CD issues, include:
- Screenshot of error
- Link to failing workflow run
- Steps to reproduce
- What you've already tried

---

## Useful Links

- [GitHub Repository](https://github.com/family-hub/app)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [React Router Documentation](https://reactrouter.com/)
- [tRPC Documentation](https://trpc.io/)

---

## Quick Reference Commands

```bash
# Local development
npm install           # Install dependencies
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Build production

# Docker
docker-compose up    # Start services
docker-compose logs  # View logs
docker build .       # Build image

# Git/GitHub
git push origin feat/new   # Push changes
gh pr create                # Create PR
gh workflow run ci.yml      # Trigger workflow

# Deployment
gh deployment list          # View deployments
gh run view <id> --log      # View logs
```

---

**Last Updated**: February 7, 2024  
**Maintained By**: DevOps Team  
**Next Review**: February 21, 2024
