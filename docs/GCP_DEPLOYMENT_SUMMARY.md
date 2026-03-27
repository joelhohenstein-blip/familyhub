# GCP Deployment Summary

Quick reference guide for Family Hub deployment on Google Cloud Platform.

## Deployment Overview

**Platform**: Google Cloud Platform (GCP)
**Primary Services**: Cloud Run, Cloud SQL, Cloud CDN, Cloud DNS
**Region**: us-central1 (primary), us-east1 (optional failover)
**Status**: Production Ready

---

## Quick Start (45 minutes)

See [GCP_QUICK_START.md](GCP_QUICK_START.md) for detailed instructions.

```bash
# 1. Initialize GCP
gcloud init
gcloud config set project family-hub-prod

# 2. Enable APIs
gcloud services enable cloudsql.googleapis.com run.googleapis.com \
  compute.googleapis.com artifactregistry.googleapis.com

# 3. Create Cloud SQL
gcloud sql instances create family-hub-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --availability-type=REGIONAL

# 4. Create service account
gcloud iam service-accounts create family-hub-run

# 5. Create Artifact Registry
gcloud artifacts repositories create family-hub \
  --repository-format=docker \
  --location=us-central1

# 6. Build and push Docker image
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest .
docker push us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest

# 7. Deploy to Cloud Run
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest \
  --region=us-central1 \
  --platform=managed \
  --set-cloudsql-instances=PROJECT_ID:us-central1:family-hub-db

# 8. Set up DNS
gcloud dns managed-zones create family-hub-zone \
  --dns-name=familyhub.example.com

# 9. Verify deployment
curl -I https://familyhub.example.com/health
```

---

## Architecture

```
Internet
   ↓
Cloud DNS (familyhub.example.com)
   ↓
Cloud Load Balancer (HTTPS)
   ↓
Cloud CDN (Static assets)
   ↓
Cloud Run (Auto-scaling containers)
   ↓
Cloud SQL (PostgreSQL database)
```

---

## Key Services

| Service | Purpose | Cost |
|---------|---------|------|
| **Cloud Run** | Application hosting | $30-50/month |
| **Cloud SQL** | Database | $28/month |
| **Cloud CDN** | Content delivery | $12/month |
| **Cloud DNS** | Domain management | $0.20/month |
| **Artifact Registry** | Container images | ~$0.10/month |
| **Secret Manager** | Secrets storage | Free |
| **Cloud Logging** | Application logs | Free (within limits) |
| **Cloud Monitoring** | Metrics & alerts | Free (within limits) |

**Total**: ~$70-90/month

---

## Configuration Files

### Environment Variables
See [GCP_ENV_VARIABLES.md](GCP_ENV_VARIABLES.md)

**Secrets in Secret Manager**:
- `family-hub-database-url`
- `family-hub-redis-url`
- `family-hub-clerk-publishable-key`
- `family-hub-clerk-secret-key`
- `family-hub-stripe-secret-key`
- `family-hub-stripe-publishable-key`
- `family-hub-stripe-webhook-secret`
- `family-hub-pusher-app-id`
- `family-hub-pusher-key`
- `family-hub-pusher-secret`
- `family-hub-pusher-cluster`
- `family-hub-openweather-api-key`
- `family-hub-deployment-url`

---

## Deployment Checklist

### Pre-Deployment
- [ ] GCP account created with billing enabled
- [ ] gcloud CLI installed and configured
- [ ] Docker installed locally
- [ ] Domain name registered
- [ ] All secrets obtained (Clerk, Stripe, Pusher, etc.)

### Infrastructure Setup
- [ ] APIs enabled
- [ ] Cloud SQL instance created
- [ ] Service account created
- [ ] Artifact Registry repository created
- [ ] Secrets created in Secret Manager

### Application Deployment
- [ ] Docker image built and pushed
- [ ] Cloud Run service deployed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health check verified

### Networking
- [ ] Cloud DNS zone created
- [ ] DNS records configured
- [ ] Cloud CDN enabled
- [ ] SSL certificate provisioned
- [ ] Domain resolves correctly

### Monitoring
- [ ] Cloud Logging configured
- [ ] Cloud Monitoring dashboards created
- [ ] Alert policies configured
- [ ] Notification channels set up

### Post-Deployment
- [ ] Application accessible at https://familyhub.example.com
- [ ] Health check returns 200: /health
- [ ] Database connectivity verified
- [ ] All environment variables working
- [ ] Backups enabled and tested

---

## Common Commands

### Service Management
```bash
# Deploy service
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest \
  --region=us-central1

# View service status
gcloud run services describe family-hub --region=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50

# Rollback to previous revision
gcloud run services update-traffic family-hub \
  --region=us-central1 \
  --to-revisions PREVIOUS_REVISION=100
```

### Database Management
```bash
# Connect to database
gcloud sql connect family-hub-db --user=admin --database=family_hub

# Create backup
gcloud sql backups create --instance=family-hub-db

# List backups
gcloud sql backups list --instance=family-hub-db

# Restore from backup
gcloud sql instances clone family-hub-db family-hub-db-restored \
  --backup-id=BACKUP_ID
```

### DNS Management
```bash
# Create DNS zone
gcloud dns managed-zones create family-hub-zone \
  --dns-name=familyhub.example.com

# Create DNS record
gcloud dns record-sets create familyhub.example.com \
  --rrdatas=STATIC_IP \
  --ttl=300 \
  --type=A \
  --zone=family-hub-zone

# List DNS records
gcloud dns record-sets list --zone=family-hub-zone
```

### Secrets Management
```bash
# Create secret
echo -n "secret-value" | gcloud secrets create secret-name --data-file=-

# Update secret
echo -n "new-value" | gcloud secrets versions add secret-name --data-file=-

# List secrets
gcloud secrets list

# Access secret
gcloud secrets versions access latest --secret=secret-name
```

---

## Monitoring & Alerts

### Key Metrics to Monitor
- **Request Count**: Should be stable or growing
- **Request Latency**: Should be < 1000ms (p95)
- **Error Rate**: Should be < 1%
- **CPU Utilization**: Should be < 80%
- **Memory Utilization**: Should be < 80%
- **Database Connections**: Should be < 80% of max
- **Disk Usage**: Should be < 80% of allocated

### Alert Thresholds
- CPU > 80% for 5 minutes
- Memory > 80% for 5 minutes
- Error rate > 5% for 5 minutes
- Latency > 1000ms for 5 minutes
- Service unavailable for 1 minute

See [GCP_MONITORING.md](GCP_MONITORING.md) for detailed setup.

---

## Scaling

### Horizontal Scaling
- Cloud Run auto-scales based on traffic
- Min instances: 1
- Max instances: 100
- Concurrency: 80 requests per instance

### Vertical Scaling
- Cloud Run: Increase memory/CPU allocation
- Cloud SQL: Upgrade instance tier
- Cloud CDN: Automatic global scaling

### Database Scaling
- Cloud SQL HA replica for high availability
- Read replicas for read-heavy workloads
- Connection pooling for efficiency

---

## Backup & Recovery

### Backup Strategy
- **Cloud SQL**: Automated daily backups, 30-day retention
- **Point-in-Time Recovery**: 7 days
- **Application**: Docker images tagged with date
- **Configuration**: Exported to Cloud Storage

### Recovery Time Estimates
- Service rollback: 5 minutes
- Database failover: 10 minutes
- Database restore: 30 minutes
- Regional failover: 1 hour

See [GCP_DISASTER_RECOVERY.md](GCP_DISASTER_RECOVERY.md) for detailed procedures.

---

## Cost Optimization

### Current Costs
- Cloud Run: $30-50/month
- Cloud SQL: $28/month
- Cloud CDN: $12/month
- Other: $0.30/month
- **Total: $70-90/month**

### Optimization Opportunities
- Reduce Cloud Run memory: Save $10/month
- Optimize Cloud CDN caching: Save $5/month
- Use committed discounts: Save $12/month
- Archive old data: Save $5/month
- **Potential savings: $32/month**

See [GCP_COST_OPTIMIZATION.md](GCP_COST_OPTIMIZATION.md) for detailed strategies.

---

## Security

### Best Practices
1. **Secrets Management**: Use Secret Manager for all sensitive data
2. **Access Control**: Use service accounts with least privilege
3. **Network Security**: Use Cloud Armor for DDoS protection
4. **Data Protection**: Enable encryption at rest and in transit
5. **Monitoring**: Enable Cloud Audit Logs for all actions
6. **Backups**: Enable automated backups with encryption

### Security Checklist
- [ ] All secrets in Secret Manager
- [ ] Service account has minimal permissions
- [ ] Cloud Armor policy enabled
- [ ] SSL/TLS certificates valid
- [ ] Cloud SQL backups enabled
- [ ] Cloud Audit Logs enabled
- [ ] VPC Service Controls configured (optional)

---

## Troubleshooting

### Service Not Starting
1. Check logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" --limit=50`
2. Check environment variables: `gcloud run services describe family-hub --region=us-central1`
3. Rollback to previous revision: `gcloud run services update-traffic family-hub --region=us-central1 --to-revisions PREVIOUS_REVISION=100`

### Database Connection Errors
1. Check instance status: `gcloud sql instances describe family-hub-db`
2. Test connectivity: `gcloud sql connect family-hub-db --user=admin --database=family_hub`
3. Check service account permissions: `gcloud projects get-iam-policy PROJECT_ID`

### DNS Not Resolving
1. Check DNS records: `gcloud dns record-sets list --zone=family-hub-zone`
2. Verify nameservers: `gcloud dns managed-zones describe family-hub-zone`
3. Test DNS: `dig familyhub.example.com`

See [DEPLOY_GCP.md](DEPLOY_GCP.md#troubleshooting) for more troubleshooting steps.

---

## Maintenance Schedule

### Daily
- Monitor Cloud Logging for errors
- Check Cloud Monitoring dashboards
- Review alert notifications

### Weekly
- Review Cloud Run metrics
- Check database performance
- Verify backups are running

### Monthly
- Review costs in Cloud Billing
- Update dependencies
- Test disaster recovery procedures
- Rotate secrets

### Quarterly
- Security audit
- Performance optimization review
- Capacity planning
- Update documentation

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| [DEPLOY_GCP.md](DEPLOY_GCP.md) | Comprehensive deployment guide |
| [GCP_QUICK_START.md](GCP_QUICK_START.md) | 45-minute quick start |
| [GCP_ENV_VARIABLES.md](GCP_ENV_VARIABLES.md) | Environment configuration |
| [GCP_MONITORING.md](GCP_MONITORING.md) | Logging and monitoring setup |
| [GCP_DISASTER_RECOVERY.md](GCP_DISASTER_RECOVERY.md) | Backup and recovery procedures |
| [GCP_COST_OPTIMIZATION.md](GCP_COST_OPTIMIZATION.md) | Cost reduction strategies |
| [GCP_DEPLOYMENT_INDEX.md](GCP_DEPLOYMENT_INDEX.md) | Documentation index |

---

## Support & Resources

### GCP Documentation
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud SQL Docs](https://cloud.google.com/sql/docs)
- [Cloud CDN Docs](https://cloud.google.com/cdn/docs)
- [Cloud DNS Docs](https://cloud.google.com/dns/docs)

### Tools
- [GCP Console](https://console.cloud.google.com)
- [gcloud CLI](https://cloud.google.com/sdk/gcloud)
- [Cloud Shell](https://cloud.google.com/shell)

### Support
- [GCP Support](https://cloud.google.com/support)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-platform)

---

## Contact Information

| Role | Name | Email |
|------|------|-------|
| DevOps Lead | TBD | TBD |
| Backend Lead | TBD | TBD |
| Database Admin | TBD | TBD |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2024 | Initial release |

---

**Status**: Production Ready
**Last Updated**: January 2024
**Maintained By**: DevOps Team
