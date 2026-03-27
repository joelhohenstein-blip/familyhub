# GCP Deployment Quick Start Guide

This guide provides a fast path to deploy Family Hub to Google Cloud Platform in under 45 minutes.

## Prerequisites (5 minutes)

```bash
# 1. Install gcloud CLI
brew install --cask google-cloud-sdk  # macOS
# or download from https://cloud.google.com/sdk/docs/install-sdk

# 2. Initialize gcloud
gcloud init

# 3. Create GCP project
gcloud projects create family-hub-prod --name="Family Hub Production"

# 4. Set default project
gcloud config set project family-hub-prod

# 5. Enable billing
# Go to https://console.cloud.google.com/billing and enable billing for the project

# 6. Verify configuration
gcloud config list
```

## Step 1: Enable Required APIs (2 minutes)

```bash
# Enable all necessary APIs
gcloud services enable \
  cloudsql.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicenetworking.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  dns.googleapis.com

echo "✓ APIs enabled!"
```

## Step 2: Set Up Cloud SQL PostgreSQL (10 minutes)

```bash
# Set variables
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export INSTANCE_NAME=family-hub-db
export DB_NAME=family_hub
export DB_USER=admin

# Create Cloud SQL instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --availability-type=REGIONAL \
  --enable-point-in-time-recovery

# Wait for creation
echo "Waiting for Cloud SQL instance to be ready..."
sleep 30

# Get connection name
export CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)')

echo "Connection Name: $CONNECTION_NAME"

# Create database
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME

# Generate secure password
export DB_PASSWORD=$(openssl rand -base64 32)

# Create database user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password=$DB_PASSWORD

echo "✓ Cloud SQL instance created!"
echo "Database Password: $DB_PASSWORD (save this securely)"
```

## Step 3: Create Service Account (3 minutes)

```bash
# Create service account
export SA_NAME=family-hub-run
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
  --display-name="Family Hub Cloud Run Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

echo "✓ Service account created!"
```

## Step 4: Create Artifact Registry (2 minutes)

```bash
# Create Docker repository
export REPO_NAME=family-hub
export REPO_REGION=us-central1

gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REPO_REGION

# Configure Docker authentication
gcloud auth configure-docker ${REPO_REGION}-docker.pkg.dev

# Get repository URL
export REPO_URL="${REPO_REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "✓ Artifact Registry created!"
echo "Repository URL: $REPO_URL"
```

## Step 5: Configure Secrets (5 minutes)

```bash
# Store database URL
echo -n "postgresql://${DB_USER}:${DB_PASSWORD}@/family_hub?host=/cloudsql/${CONNECTION_NAME}" | \
  gcloud secrets create family-hub-database-url --data-file=-

# Store other secrets (replace with your actual values)
echo -n "pk_live_YOUR_CLERK_KEY" | \
  gcloud secrets create family-hub-clerk-publishable-key --data-file=-

echo -n "sk_live_YOUR_CLERK_KEY" | \
  gcloud secrets create family-hub-clerk-secret-key --data-file=-

echo -n "sk_live_YOUR_STRIPE_KEY" | \
  gcloud secrets create family-hub-stripe-secret-key --data-file=-

echo -n "pk_live_YOUR_STRIPE_KEY" | \
  gcloud secrets create family-hub-stripe-publishable-key --data-file=-

echo -n "whsec_YOUR_STRIPE_WEBHOOK" | \
  gcloud secrets create family-hub-stripe-webhook-secret --data-file=-

echo -n "YOUR_PUSHER_APP_ID" | \
  gcloud secrets create family-hub-pusher-app-id --data-file=-

echo -n "YOUR_PUSHER_KEY" | \
  gcloud secrets create family-hub-pusher-key --data-file=-

echo -n "YOUR_PUSHER_SECRET" | \
  gcloud secrets create family-hub-pusher-secret --data-file=-

echo -n "mt1" | \
  gcloud secrets create family-hub-pusher-cluster --data-file=-

echo -n "YOUR_OPENWEATHER_KEY" | \
  gcloud secrets create family-hub-openweather-api-key --data-file=-

echo -n "https://familyhub.example.com" | \
  gcloud secrets create family-hub-deployment-url --data-file=-

# Grant service account access to all secrets
for secret in family-hub-database-url family-hub-clerk-publishable-key \
              family-hub-clerk-secret-key family-hub-stripe-secret-key \
              family-hub-stripe-publishable-key family-hub-stripe-webhook-secret \
              family-hub-pusher-app-id family-hub-pusher-key family-hub-pusher-secret \
              family-hub-pusher-cluster family-hub-openweather-api-key \
              family-hub-deployment-url; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done

echo "✓ Secrets configured!"
```

## Step 6: Build and Push Docker Image (5 minutes)

```bash
# Build Docker image
docker build -t family-hub:latest .

# Tag for Artifact Registry
docker tag family-hub:latest ${REPO_URL}/family-hub:latest
docker tag family-hub:latest ${REPO_URL}/family-hub:$(git rev-parse --short HEAD)

# Push to Artifact Registry
docker push ${REPO_URL}/family-hub:latest
docker push ${REPO_URL}/family-hub:$(git rev-parse --short HEAD)

echo "✓ Docker image pushed!"
```

## Step 7: Deploy to Cloud Run (5 minutes)

```bash
# Deploy to Cloud Run
export SERVICE_NAME=family-hub

gcloud run deploy $SERVICE_NAME \
  --image=${REPO_URL}/family-hub:latest \
  --region=$REGION \
  --platform=managed \
  --service-account=${SA_EMAIL} \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --max-instances=100 \
  --min-instances=1 \
  --port=3000 \
  --allow-unauthenticated \
  --set-cloudsql-instances=${CONNECTION_NAME} \
  --update-secrets DATABASE_URL=family-hub-database-url:latest \
  --update-secrets CLERK_PUBLISHABLE_KEY=family-hub-clerk-publishable-key:latest \
  --update-secrets CLERK_SECRET_KEY=family-hub-clerk-secret-key:latest \
  --update-secrets STRIPE_SECRET_KEY=family-hub-stripe-secret-key:latest \
  --update-secrets STRIPE_PUBLISHABLE_KEY=family-hub-stripe-publishable-key:latest \
  --update-secrets STRIPE_WEBHOOK_SECRET=family-hub-stripe-webhook-secret:latest \
  --update-secrets PUSHER_APP_ID=family-hub-pusher-app-id:latest \
  --update-secrets PUSHER_KEY=family-hub-pusher-key:latest \
  --update-secrets PUSHER_SECRET=family-hub-pusher-secret:latest \
  --update-secrets PUSHER_CLUSTER=family-hub-pusher-cluster:latest \
  --update-secrets OPENWEATHER_API_KEY=family-hub-openweather-api-key:latest \
  --update-secrets DEPLOYMENT_URL=family-hub-deployment-url:latest

# Get service URL
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)')

echo "✓ Cloud Run service deployed!"
echo "Service URL: $SERVICE_URL"

# Test service
curl -I $SERVICE_URL/health
```

## Step 8: Set Up Cloud DNS (5 minutes)

```bash
# Set domain variable
export DOMAIN=familyhub.example.com
export ZONE_NAME=family-hub-zone

# Create DNS zone
gcloud dns managed-zones create $ZONE_NAME \
  --dns-name=$DOMAIN \
  --description="Family Hub DNS Zone"

# Get nameservers
export NAMESERVERS=$(gcloud dns managed-zones describe $ZONE_NAME \
  --format='value(nameServers)')

echo "✓ DNS zone created!"
echo "Update your domain registrar with these nameservers:"
echo "$NAMESERVERS"

# Wait for DNS propagation (24-48 hours)
echo "Note: DNS propagation may take 24-48 hours"
```

## Step 9: Set Up Cloud CDN and Load Balancer (8 minutes)

```bash
# Create health check
gcloud compute health-checks create http family-hub-health-check \
  --port=3000 \
  --request-path=/health

# Create serverless NEG for Cloud Run
gcloud compute network-endpoint-groups create family-hub-neg \
  --region=$REGION \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=$SERVICE_NAME

# Create backend service with CDN
gcloud compute backend-services create family-hub-backend \
  --protocol=HTTP \
  --health-checks=family-hub-health-check \
  --global \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC

# Add Cloud Run as backend
gcloud compute backend-services add-backends family-hub-backend \
  --network-endpoint-group=family-hub-neg \
  --network-endpoint-group-region=$REGION \
  --global

# Create URL map
gcloud compute url-maps create family-hub-lb \
  --default-service=family-hub-backend

# Create SSL certificate
gcloud compute ssl-certificates create family-hub-cert \
  --domains=$DOMAIN

# Create HTTPS proxy
gcloud compute target-https-proxies create family-hub-https-proxy \
  --url-map=family-hub-lb \
  --ssl-certificates=family-hub-cert

# Create forwarding rule
gcloud compute forwarding-rules create family-hub-https-rule \
  --global \
  --target-https-proxy=family-hub-https-proxy \
  --address=family-hub-ip \
  --ports=443

# Get static IP
export STATIC_IP=$(gcloud compute addresses describe family-hub-ip \
  --global \
  --format='value(address)')

echo "✓ Cloud CDN and Load Balancer configured!"
echo "Static IP: $STATIC_IP"
echo "Update your DNS A record to point to: $STATIC_IP"
```

## Step 10: Verify Deployment (5 minutes)

```bash
# Check Cloud Run service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit=20 \
  --format=json

# Check backend service health
gcloud compute backend-services get-health family-hub-backend --global

# Test application
echo "Testing application..."
sleep 10
curl -I https://$DOMAIN/health || echo "DNS not yet propagated, use: $SERVICE_URL"

echo "✓ Deployment verified!"
```

## Automated Deployment Script

For faster deployments, save this as `scripts/deploy-gcp.sh`:

```bash
#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
SERVICE_NAME=family-hub
REPO_REGION=us-central1
REPO_NAME=family-hub

# Build and push
echo "Building Docker image..."
docker build -t family-hub:latest .

REPO_URL="${REPO_REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
docker tag family-hub:latest ${REPO_URL}/family-hub:latest
docker push ${REPO_URL}/family-hub:latest

# Deploy
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=${REPO_URL}/family-hub:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --force-new-deployment

echo "✓ Deployment complete!"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
```

Make it executable:
```bash
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh
```

## Troubleshooting

### Cloud Run Service Not Starting

```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit=50 \
  --format=json

# Check service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION \
  --format='value(name)' \
  --limit=2 | tail -1)

gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions $PREVIOUS_REVISION=100
```

### Database Connection Errors

```bash
# Test Cloud SQL connection
gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME

# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

### DNS Not Resolving

```bash
# Check DNS records
gcloud dns record-sets list --zone=$ZONE_NAME

# Verify nameservers
gcloud dns managed-zones describe $ZONE_NAME --format='value(nameServers)'

# Test DNS
dig $DOMAIN
nslookup $DOMAIN
```

## Post-Deployment Checklist

- [ ] Cloud SQL instance is running
- [ ] Cloud Run service is deployed and healthy
- [ ] Secrets are configured in Secret Manager
- [ ] Docker image is pushed to Artifact Registry
- [ ] Cloud CDN is enabled
- [ ] Cloud DNS is configured
- [ ] SSL certificate is provisioning
- [ ] Application is accessible at service URL
- [ ] Health check endpoint returns 200
- [ ] Database migrations have run
- [ ] All environment variables are working

## Next Steps

1. **Configure monitoring**: See [DEPLOY_GCP.md](DEPLOY_GCP.md#step-9-monitoring-and-logging)
2. **Set up backups**: See [DEPLOY_GCP.md](DEPLOY_GCP.md#step-10-backup-and-disaster-recovery)
3. **Enable Cloud Armor**: See [DEPLOY_GCP.md](DEPLOY_GCP.md#step-8-ssltls-with-cloud-armor)
4. **Set up CI/CD**: Create GitHub Actions workflow for automated deployments
5. **Optimize costs**: Review [DEPLOY_GCP.md](DEPLOY_GCP.md#cost-optimization)

## Cost Estimation

Typical monthly costs for production deployment:

| Service | Size | Cost |
|---------|------|------|
| Cloud Run | 1 vCPU, 1GB RAM, 1M requests | $30-50 |
| Cloud SQL | db-f1-micro, 100GB storage | $28 |
| Cloud CDN | 100GB/month | $12 |
| Cloud DNS | 1 zone | $0.20 |
| **Total** | | **$70-90** |

*Costs vary by region and usage. Use [GCP Pricing Calculator](https://cloud.google.com/products/calculator) for accurate estimates.*

## Support

- **GCP Documentation**: https://cloud.google.com/docs
- **GCP Support**: https://cloud.google.com/support
- **Community**: https://stackoverflow.com/questions/tagged/google-cloud-platform

---

**Estimated Total Time**: 45-60 minutes (excluding DNS propagation)

**Last Updated**: January 2024
