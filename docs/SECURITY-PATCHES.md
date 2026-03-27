# Security Patching Guide

Procedures for identifying, testing, and deploying security patches.

## Table of Contents

1. [Vulnerability Scanning](#vulnerability-scanning)
2. [Patch Assessment](#patch-assessment)
3. [Testing Procedures](#testing-procedures)
4. [Zero-Downtime Deployment](#zero-downtime-deployment)
5. [Rollback Plan](#rollback-plan)
6. [Communication](#communication)
7. [SLA Targets](#sla-targets)

## Vulnerability Scanning

### Automated Scanning

**npm audit**
```bash
# Run weekly
npm audit

# Fix vulnerabilities automatically (use cautiously)
npm audit fix

# Generate detailed report
npm audit --json > audit-report.json

# Check specific package
npm audit | grep -i "package-name"
```

**Dependabot** (GitHub)
- Automatically creates PRs for security updates
- Configure in `.github/dependabot.yml`
- Review and test before merging
- Auto-merge for patch-level updates (v1.2.3 -> v1.2.4)

**Snyk** (Optional third-party service)
```bash
# Install Snyk CLI
npm install -g snyk

# Test project
snyk test

# Monitor in CI/CD
snyk monitor
```

### Manual Scanning

```bash
# Check for known vulnerabilities in dependencies
npm ls --depth=0 | grep -i vulnerable

# Review direct dependencies for security issues
cat package.json | jq '.dependencies | keys'

# Check license compliance
npm license ls

# Outdated packages
npm outdated

# Check for unmaintained packages
npm audit --audit-level=moderate
```

### Scanning Schedule

| Frequency | Task | Action |
|-----------|------|--------|
| Daily | Automated scan via CI/CD | Auto-fix patch updates |
| Weekly | Manual audit review | Assess critical updates |
| Monthly | Full dependency audit | Plan major updates |
| Quarterly | License audit | Ensure compliance |

## Patch Assessment

### Severity Classification

**Critical (CVSS 9-10)**
- Exploitable without authentication
- Affects core functionality
- Affects authentication/authorization
- **Response: 6-24 hours**

**High (CVSS 7-8.9)**
- May require specific conditions to exploit
- Affects sensitive data handling
- **Response: 48 hours**

**Medium (CVSS 4-6.9)**
- Limited impact
- Requires specific user interaction
- **Response: 1 week**

**Low (CVSS 0-3.9)**
- Minimal impact
- Difficult to exploit
- **Response: Next scheduled update**

### Assessment Checklist

Before applying any security patch:

```bash
# 1. Check patch details
npm view package-name@version description
npm view package-name@version repository

# 2. Review changelog
# Visit GitHub/npm page for detailed changelog

# 3. Check if package is in use
grep -r "package-name" src/ --include="*.ts" --include="*.tsx"

# 4. Assess impact on codebase
# Look for breaking changes
# Check if it affects critical paths

# 5. Review CVE details
# Visit https://nvd.nist.gov/vuln/search for CVSS score
# Check https://cve.mitre.org for details

# 6. Check for existing workarounds
# Review issues/discussions in package repo
```

### Update Priority Matrix

| Impact | Likelihood | Priority | Action |
|--------|-----------|----------|--------|
| High | High | Critical | Patch immediately |
| High | Low | High | Patch within 48h |
| Medium | High | High | Patch within 1 week |
| Medium | Low | Medium | Patch within 1 month |
| Low | Any | Low | Patch at next update cycle |

## Testing Procedures

### Unit Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test -- --coverage

# Focus on affected components
npm run test -- --testPathPattern="affected-module"

# Update snapshots if intentional
npm run test -- -u
```

### Integration Testing

```bash
# Test package integrations
npm run test:integration

# Test database migrations
npm run db:migrate:test

# Test API endpoints with new dependency
npm run test:api

# Smoke tests
npm run test:smoke
```

### Regression Testing

```bash
# Test against known problematic scenarios
npm run test:regression

# Check performance didn't degrade
npm run test:performance

# Check security features still work
npm run test:security
```

### Manual Testing

**Critical Updates:** Always perform manual testing

1. **Functional Testing**
   - Test primary user flows
   - Test authentication
   - Test video calls
   - Test file uploads
   - Test real-time updates

2. **Security Testing**
   - Test that patch fixed the vulnerability
   - Verify no new vulnerabilities introduced
   - Check rate limiting still works
   - Verify auth tokens still valid

3. **Performance Testing**
   - Load test critical paths
   - Check memory usage
   - Monitor response times
   - Check database query performance

### Testing Environment

```bash
# Deploy to staging first
git checkout -b security-patch/package-version
npm install package-name@latest
npm run build
npm run test
# Deploy to staging environment

# Verify in staging
# Run manual tests
# Monitor for 2-4 hours

# Promote to production
git merge main
git tag security-patch-approved-$(date +%s)
```

## Zero-Downtime Deployment

### Prerequisites

```bash
# Ensure health checks are in place
curl http://localhost:3000/health

# Verify load balancer is configured
# - Health check endpoint configured
# - Graceful shutdown timeout set to 30s
# - Connection draining enabled

# Backup database
npm run db:backup
```

### Deployment Steps

```bash
# Step 1: Create release branch
git checkout -b release/security-patch-v$(date +%Y.%m.%d)

# Step 2: Apply patches
npm install package-name@latest
npm audit fix --audit-level=critical

# Step 3: Test locally
npm run test
npm run typecheck
npm run build

# Step 4: Deploy to staging
git push origin release/...
# Staging CI/CD runs tests automatically
# Wait for green check

# Step 5: Drain traffic from first instance
# Tell load balancer to remove instance-1
curl -X POST http://load-balancer/drain/instance-1
sleep 10  # Wait for existing connections to drain

# Step 6: Deploy instance-1
ssh instance-1
cd /app
git pull origin release/...
npm install --production
npm run build
systemctl restart familyhub

# Step 7: Verify instance-1
curl http://instance-1:3000/health
# Wait 30 seconds for connections

# Step 8: Resume traffic to instance-1
curl -X POST http://load-balancer/restore/instance-1

# Step 9: Repeat for remaining instances
# Drain -> Deploy -> Verify -> Restore
# For instance-2, instance-3, etc.

# Step 10: Verify all instances
npm run health-check --all-instances

# Step 11: Monitor for issues
watch -n 2 'curl http://load-balancer/metrics'
```

### Quick Deployment (Emergency)

For critical security fixes that must be deployed quickly:

```bash
# 1. Coordinate with team
# 2. Ensure database backups complete
# 3. All-at-once deployment (brief downtime)

git pull origin main
npm install package-name@latest
npm run build

# Tell load balancer to go offline (brief)
curl -X POST http://load-balancer/standby

# Deploy to all instances simultaneously
ansible-playbook deploy.yml

# Bring load balancer back online
curl -X POST http://load-balancer/online

# Monitor
npm run health-check --all-instances
```

## Rollback Plan

### Pre-Deployment Rollback Point

```bash
# Tag current version before deployment
git tag -a pre-security-patch-$(date +%s) -m "Rollback point"
git push origin pre-security-patch-$(date +%s)

# Save database state
mysqldump -u root -p database > backup-pre-patch.sql
# or for PostgreSQL
pg_dump -U user database > backup-pre-patch.sql
```

### Rollback Execution

**Immediate Rollback (first 10 minutes):**
```bash
# On all instances:
git reset --hard pre-security-patch-{tag}
npm install --production
npm run build
systemctl restart familyhub

# Verify
curl http://localhost:3000/health
```

**Database Rollback (if migrations were run):**
```bash
# Only if new migrations were applied
npm run db:migrate:down
# or restore from backup
mysql < backup-pre-patch.sql
```

**Verify Rollback:**
```bash
# Check service is up
systemctl status familyhub

# Run health checks
npm run health-check

# Check error logs
tail -f /var/log/familyhub/app.log

# Verify data integrity
npm run db:verify
```

### Post-Rollback Investigation

1. Gather logs from all instances
2. Review what caused the issue
3. Check if patch was applied correctly
4. Document findings
5. Plan remediation
6. Schedule retry with additional testing

## Communication

### Pre-Patch Communication (Critical Updates)

**Internal Team** (24 hours before)
- Email: Describe vulnerability and impact
- Include: Fix details and expected downtime
- Team standup: Walk through deployment plan

**Users** (if downtime required)
- Email: Scheduled maintenance notice
- In-app banner: Time and expected duration
- Slack: Status updates during deployment

### Patch Deployment Communication

**During Deployment**
- Slack #deployments channel: Running updates
- Update status page: Deployment in progress
- Team on standby for issues

**Post-Deployment**
- Slack #deployments: Deployment complete
- Status page: All systems operational
- User notification: Maintenance complete

### Vulnerability Disclosure (if public)

- Review disclosure policy
- Contact security team for sensitive vulnerabilities
- Avoid disclosing before patch is deployed
- Credit vulnerability reporter if applicable

## SLA Targets

### Patch Application SLA

| Severity | Discovery | Testing | Deployment | Total |
|----------|-----------|---------|------------|-------|
| Critical | 2 hours | 4 hours | 2 hours | 6 hours |
| High | 8 hours | 16 hours | 4 hours | 24 hours |
| Medium | 1 week | 1 week | 1 week | 3 weeks |
| Low | 1 month | 1 month | 1 month | Quarterly |

### Uptime SLA During Patching

- Zero-downtime deployments: 99.9% uptime
- Quick deployments: No more than 5 minutes downtime
- Maintenance windows: 30 minutes maximum

### Rollback SLA

- Critical issues: Rollback within 5 minutes of detection
- High issues: Rollback within 15 minutes
- Medium issues: Rollback within 1 hour

## Tools & Resources

### Vulnerability Databases
- [National Vulnerability Database (NVD)](https://nvd.nist.gov/)
- [CVE Details](https://www.cvedetails.com/)
- [Security Advisory Database](https://www.npmjs.com/advisories/)

### Patch Management Tools
- [Dependabot](https://dependabot.com/) - Automated PRs
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [npm audit](https://docs.npmjs.com/cli/audit) - Built-in auditing

### Monitoring & Alerting
- Sentry for error tracking
- CloudWatch for application metrics
- PagerDuty for on-call escalation

## Related Documents

- [MAINTENANCE.md](./MAINTENANCE.md)
- [RUNBOOKS.md](./RUNBOOKS.md)

## Approval & Review

**Last Updated:** $(date)
**Reviewed By:** [Engineering Lead Name]
**Approved By:** [Security Team Lead Name]

Next review scheduled for: [Quarterly]

---

## Appendix: Quick Reference

### Emergency Patch Commands

```bash
# Identify critical vulnerability
npm audit | grep CRITICAL

# Apply only critical fixes
npm install $(npm audit --json | jq -r '.metadata.advisory[].module_name' | sort -u)

# Test
npm run test:smoke

# Deploy with monitoring
systemctl restart familyhub && systemctl status familyhub
```

### Monitoring During Patch

```bash
# Watch error rate
watch -n 1 'curl -s http://localhost:3000/trpc/maintenance.metrics.summary | jq .errorRate'

# Monitor memory
watch -n 1 'free -h'

# Check application logs
tail -f /var/log/familyhub/app.log | grep -i error
```
