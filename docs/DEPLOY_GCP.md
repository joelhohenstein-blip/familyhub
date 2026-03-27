# GCP Deployment Guide for Family Hub

This guide provides step-by-step instructions for deploying the Family Hub application to Google Cloud Platform using Cloud Run, Cloud SQL, Cloud CDN, and Cloud DNS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Set Up Cloud SQL PostgreSQL](#step-1-set-up-cloud-sql-postgresql)
4. [Step 2: Create Cloud Run Service](#step-2-create-cloud-run-service)
5. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
6. [Step 4: Build and Push Docker Image](#step-4-build-and-push-docker-image)
7. [Step 5: Deploy to Cloud Run](#step-5-deploy-to-cloud-run)
8. [Step 6: Set Up Cloud CDN](#step-6-set-up-cloud-cdn)
9. [Step 7: Configure Cloud DNS](#step-7-configure-cloud-dns)
10. [Step 8: SSL/TLS with Cloud Armor](#step-8-ssltls-with-cloud-armor)
11. [Step 9: Monitoring and Logging](#step-9-monitoring-and-logging)
12. [Step 10: Backup and Disaster Recovery](#step-10-backup-and-disaster-recovery)
13. [Troubleshooting](#troubleshooting)
14. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before starting, ensure you have:

- **GCP Account** with billing enabled
- **GCP Project** created (e.g., `family-hub-prod`)
- **gcloud CLI** installed and configured
- **Docker** installed locally for building images
- **Domain name** registered (can use Cloud DNS or external registrar)
- **Git** for version control
- **Bun** or **Node.js** for local development
- **PostgreSQL client** (`psql`) for database management

### Install gcloud CLI

```bash
# macOS
brew install --cask google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from https://cloud.google.com/sdk/docs/install-sdk

# Verify installation
gcloud --version
```

### Configure gcloud Credentials

```bash
# Initialize gcloud
gcloud init

# Set default project
gcloud config set project family-hub-prod

# Authenticate
gcloud auth login

# Set default region
gcloud config set compute/region us-central1

# Verify configuration
gcloud config list
```

### Enable Required APIs

```bash
# Enable necessary GCP APIs
gcloud services enable \
  cloudsql.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicenetworking.googleapis.com \
  cloudkms.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  dns.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloud DNS                              │
│                   (familyhub.example.com)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Cloud CDN                                │
│              (Global Content Distribution)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Cloud Load Balancer                        │
│              (HTTPS + Cloud Armor Protection)               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Cloud Run                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Container 1  │  │ Container 2  │  │ Container 3  │      │
│  │ (Auto-scale) │  │ (Auto-scale) │  │ (Auto-scale) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────┐
│ Cloud SQL      │ │  Memorystore  │ │  Cloud Storage │
│ PostgreSQL     │ │    (Redis)    │ │   (Static)     │
│ (HA Replica)   │ │               │ │   (Assets)     │
└────────────────┘ └───────────────┘ └────────────────┘
```

---

## Step 1: Set Up Cloud SQL PostgreSQL

### 1.1 Create Cloud SQL Instance via gcloud

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
INSTANCE_NAME=family-hub-db
DB_NAME=family_hub
DB_USER=admin

# Create Cloud SQL instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=default \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --retained-backups-count=30 \
  --transaction-log-retention-days=7 \
  --availability-type=REGIONAL \
  --enable-point-in-time-recovery \
  --database-flags=cloudsql_iam_authentication=on

# Wait for instance creation (5-10 minutes)
gcloud sql operations wait --project=$PROJECT_ID
```

### 1.2 Create Database and User

```bash
# Create database
gcloud sql databases create $DB_NAME \
  --instance=$INSTANCE_NAME

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32)

# Create database user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password=$DB_PASSWORD

# Save password securely
echo "Database Password: $DB_PASSWORD" > /tmp/db-password.txt
chmod 600 /tmp/db-password.txt
```

### 1.3 Get Cloud SQL Connection Details

```bash
# Get instance connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)')

echo "Connection Name: $CONNECTION_NAME"

# Get public IP (if needed)
PUBLIC_IP=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(ipAddresses[0].ipAddress)')

echo "Public IP: $PUBLIC_IP"

# Get private IP (for Cloud Run)
PRIVATE_IP=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(ipAddresses[1].ipAddress)')

echo "Private IP: $PRIVATE_IP"
```

### 1.4 Configure Cloud SQL Proxy

```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud-sql-proxy

# Or use gcloud to run proxy
gcloud sql connect $INSTANCE_NAME \
  --user=$DB_USER \
  --database=$DB_NAME

# Or for automated deployments, use Cloud SQL Auth proxy in Cloud Run
# (configured in Step 5)
```

### 1.5 Run Database Migrations

```bash
# Set database URL
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PRIVATE_IP}:5432/${DB_NAME}"

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Run migrations
bun run db:push

# Seed initial data (optional)
bun run db:seed
```

### 1.6 Configure Cloud SQL Backups

```bash
# Verify backup configuration
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(settings.backupConfiguration)'

# Create on-demand backup
gcloud sql backups create \
  --instance=$INSTANCE_NAME \
  --description="Initial backup"

# List backups
gcloud sql backups list --instance=$INSTANCE_NAME
```

---

## Step 2: Create Cloud Run Service

### 2.1 Create Service Account

```bash
# Create service account for Cloud Run
SA_NAME=family-hub-run
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
  --display-name="Family Hub Cloud Run Service Account"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

# Grant Cloud Logging role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

# Grant Cloud Monitoring role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.metricWriter"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud Storage access (for uploads)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"
```

### 2.2 Create Artifact Registry Repository

```bash
# Create Artifact Registry repository
REPO_NAME=family-hub
REPO_REGION=us-central1

gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REPO_REGION \
  --description="Family Hub Docker images"

# Get repository URL
REPO_URL="${REPO_REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "Repository URL: $REPO_URL"
```

### 2.3 Configure Docker Authentication

```bash
# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker ${REPO_REGION}-docker.pkg.dev

# Verify authentication
docker pull ${REPO_URL}/hello-world:latest 2>/dev/null || echo "Ready to push images"
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Secret Manager Secrets

Store sensitive configuration in Google Cloud Secret Manager:

```bash
# Database URL
echo -n "postgresql://${DB_USER}:${DB_PASSWORD}@${PRIVATE_IP}:5432/${DB_NAME}" | \
  gcloud secrets create family-hub-database-url \
  --data-file=-

# Redis/Memorystore URL (if using)
echo -n "redis://family-hub-redis.xxxxx.cache.googleapis.com:6379" | \
  gcloud secrets create family-hub-redis-url \
  --data-file=-

# Clerk Authentication
echo -n "pk_live_xxxxx" | \
  gcloud secrets create family-hub-clerk-publishable-key \
  --data-file=-

echo -n "sk_live_xxxxx" | \
  gcloud secrets create family-hub-clerk-secret-key \
  --data-file=-

# Stripe
echo -n "sk_live_xxxxx" | \
  gcloud secrets create family-hub-stripe-secret-key \
  --data-file=-

echo -n "pk_live_xxxxx" | \
  gcloud secrets create family-hub-stripe-publishable-key \
  --data-file=-

echo -n "whsec_xxxxx" | \
  gcloud secrets create family-hub-stripe-webhook-secret \
  --data-file=-

# Pusher
echo -n "1234567" | \
  gcloud secrets create family-hub-pusher-app-id \
  --data-file=-

echo -n "xxxxx" | \
  gcloud secrets create family-hub-pusher-key \
  --data-file=-

echo -n "xxxxx" | \
  gcloud secrets create family-hub-pusher-secret \
  --data-file=-

echo -n "mt1" | \
  gcloud secrets create family-hub-pusher-cluster \
  --data-file=-

# OpenWeather API
echo -n "xxxxx" | \
  gcloud secrets create family-hub-openweather-api-key \
  --data-file=-

# Deployment URL
echo -n "https://familyhub.example.com" | \
  gcloud secrets create family-hub-deployment-url \
  --data-file=-
```

### 3.2 Grant Service Account Access to Secrets

```bash
# Grant secret accessor role to service account
for secret in family-hub-database-url family-hub-redis-url \
              family-hub-clerk-publishable-key family-hub-clerk-secret-key \
              family-hub-stripe-secret-key family-hub-stripe-publishable-key \
              family-hub-stripe-webhook-secret family-hub-pusher-app-id \
              family-hub-pusher-key family-hub-pusher-secret \
              family-hub-pusher-cluster family-hub-openweather-api-key \
              family-hub-deployment-url; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 3.3 Create Cloud Run Environment Configuration

```bash
# Create environment variables file for Cloud Run
cat > /tmp/cloud-run-env.yaml << 'EOF'
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: family-hub-database-url
  - name: REDIS_URL
    valueFrom:
      secretKeyRef:
        name: family-hub-redis-url
  - name: CLERK_PUBLISHABLE_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-clerk-publishable-key
  - name: CLERK_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-clerk-secret-key
  - name: STRIPE_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-stripe-secret-key
  - name: STRIPE_PUBLISHABLE_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-stripe-publishable-key
  - name: STRIPE_WEBHOOK_SECRET
    valueFrom:
      secretKeyRef:
        name: family-hub-stripe-webhook-secret
  - name: PUSHER_APP_ID
    valueFrom:
      secretKeyRef:
        name: family-hub-pusher-app-id
  - name: PUSHER_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-pusher-key
  - name: PUSHER_SECRET
    valueFrom:
      secretKeyRef:
        name: family-hub-pusher-secret
  - name: PUSHER_CLUSTER
    valueFrom:
      secretKeyRef:
        name: family-hub-pusher-cluster
  - name: OPENWEATHER_API_KEY
    valueFrom:
      secretKeyRef:
        name: family-hub-openweather-api-key
  - name: DEPLOYMENT_URL
    valueFrom:
      secretKeyRef:
        name: family-hub-deployment-url
EOF
```

---

## Step 4: Build and Push Docker Image

### 4.1 Create Dockerfile (if not exists)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install bun runtime
RUN npm install -g bun

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["bun", "run", "start"]
```

### 4.2 Build Docker Image

```bash
# Build image
docker build -t family-hub:latest .

# Tag for Artifact Registry
docker tag family-hub:latest ${REPO_URL}/family-hub:latest
docker tag family-hub:latest ${REPO_URL}/family-hub:$(git rev-parse --short HEAD)
```

### 4.3 Push to Artifact Registry

```bash
# Push images
docker push ${REPO_URL}/family-hub:latest
docker push ${REPO_URL}/family-hub:$(git rev-parse --short HEAD)

# Verify push
gcloud artifacts docker images list ${REPO_URL}
```

---

## Step 5: Deploy to Cloud Run

### 5.1 Deploy Service

```bash
# Deploy to Cloud Run
SERVICE_NAME=family-hub
REGION=us-central1

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
  --update-env-vars NODE_ENV=production,PORT=3000

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"
```

### 5.2 Configure Environment Variables in Cloud Run

```bash
# Update service with environment variables from Secret Manager
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars NODE_ENV=production,PORT=3000 \
  --update-secrets DATABASE_URL=family-hub-database-url:latest \
  --update-secrets REDIS_URL=family-hub-redis-url:latest \
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
```

### 5.3 Verify Deployment

```bash
# Check service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# Test service
curl -I $SERVICE_URL/health

# View logs
gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50

# Check revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION
```

### 5.4 Configure Traffic Splitting (for gradual rollouts)

```bash
# Deploy new revision
gcloud run deploy $SERVICE_NAME \
  --image=${REPO_URL}/family-hub:$(git rev-parse --short HEAD) \
  --region=$REGION \
  --no-traffic

# Get new revision name
NEW_REVISION=$(gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION \
  --format='value(name)' \
  --limit=1)

# Split traffic: 90% old, 10% new
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions LATEST=10

# Monitor metrics, then shift more traffic
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions LATEST=100
```

---

## Step 6: Set Up Cloud CDN

### 6.1 Create Backend Service

```bash
# Create health check
gcloud compute health-checks create http family-hub-health-check \
  --port=3000 \
  --request-path=/health \
  --check-interval=30s \
  --timeout=5s \
  --unhealthy-threshold=3 \
  --healthy-threshold=2

# Create backend service
gcloud compute backend-services create family-hub-backend \
  --protocol=HTTP \
  --health-checks=family-hub-health-check \
  --global \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600

# Add Cloud Run as backend
gcloud compute backend-services add-backends family-hub-backend \
  --instance-group=family-hub-ig \
  --instance-group-zone=us-central1-a \
  --global

# Or use serverless NEG for Cloud Run
gcloud compute network-endpoint-groups create family-hub-neg \
  --region=$REGION \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=$SERVICE_NAME

gcloud compute backend-services add-backends family-hub-backend \
  --network-endpoint-group=family-hub-neg \
  --network-endpoint-group-region=$REGION \
  --global
```

### 6.2 Create URL Map

```bash
# Create URL map
gcloud compute url-maps create family-hub-lb \
  --default-service=family-hub-backend

# Add path rules for caching
gcloud compute url-maps add-path-rule family-hub-lb \
  --service=family-hub-backend \
  --path-rule="/static/*" \
  --new-path-rule

gcloud compute url-maps add-path-rule family-hub-lb \
  --service=family-hub-backend \
  --path-rule="/assets/*" \
  --new-path-rule
```

### 6.3 Create HTTPS Proxy

```bash
# Create SSL certificate
gcloud compute ssl-certificates create family-hub-cert \
  --domains=familyhub.example.com,www.familyhub.example.com

# Create HTTPS proxy
gcloud compute target-https-proxies create family-hub-https-proxy \
  --url-map=family-hub-lb \
  --ssl-certificates=family-hub-cert

# Create HTTP to HTTPS redirect
gcloud compute url-maps create family-hub-http-redirect \
  --default-service=family-hub-backend

gcloud compute target-http-proxies create family-hub-http-proxy \
  --url-map=family-hub-http-redirect
```

### 6.4 Create Forwarding Rules

```bash
# Create HTTPS forwarding rule
gcloud compute forwarding-rules create family-hub-https-rule \
  --global \
  --target-https-proxy=family-hub-https-proxy \
  --address=family-hub-ip \
  --ports=443

# Create HTTP forwarding rule (for redirect)
gcloud compute forwarding-rules create family-hub-http-rule \
  --global \
  --target-http-proxy=family-hub-http-proxy \
  --address=family-hub-ip \
  --ports=80

# Get static IP
STATIC_IP=$(gcloud compute addresses describe family-hub-ip \
  --global \
  --format='value(address)')

echo "Static IP: $STATIC_IP"
```

### 6.5 Configure Cache Behaviors

```bash
# Update backend service cache settings
gcloud compute backend-services update family-hub-backend \
  --global \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600 \
  --enable-cdn

# Create cache key policy
gcloud compute backend-services update family-hub-backend \
  --global \
  --cache-key-include-host \
  --cache-key-include-protocol \
  --cache-key-include-query-string
```

---

## Step 7: Configure Cloud DNS

### 7.1 Create DNS Zone

```bash
# Create DNS zone
ZONE_NAME=family-hub-zone
DOMAIN=familyhub.example.com

gcloud dns managed-zones create $ZONE_NAME \
  --dns-name=$DOMAIN \
  --description="Family Hub DNS Zone"

# Get nameservers
gcloud dns managed-zones describe $ZONE_NAME \
  --format='value(nameServers)'
```

### 7.2 Create DNS Records

```bash
# Create A record pointing to load balancer
gcloud dns record-sets create $DOMAIN \
  --rrdatas=$STATIC_IP \
  --ttl=300 \
  --type=A \
  --zone=$ZONE_NAME

# Create www subdomain
gcloud dns record-sets create www.$DOMAIN \
  --rrdatas=$STATIC_IP \
  --ttl=300 \
  --type=A \
  --zone=$ZONE_NAME

# Verify records
gcloud dns record-sets list --zone=$ZONE_NAME
```

### 7.3 Update Domain Registrar (if external)

If your domain is registered with an external registrar:

1. Go to your registrar's dashboard
2. Find DNS/Nameserver settings
3. Update nameservers to Cloud DNS nameservers:
   - `ns-xxx.googledomains.com`
   - `ns-xxx.googledomains.com`
   - `ns-xxx.googledomains.com`
   - `ns-xxx.googledomains.com`

4. Wait 24-48 hours for DNS propagation

### 7.4 Verify DNS Propagation

```bash
# Check DNS propagation
dig $DOMAIN
nslookup $DOMAIN

# Check specific record
gcloud dns record-sets list --zone=$ZONE_NAME --filter="name=$DOMAIN"
```

---

## Step 8: SSL/TLS with Cloud Armor

### 8.1 Create SSL Certificate

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create family-hub-managed-cert \
  --domains=familyhub.example.com,www.familyhub.example.com

# Check certificate status
gcloud compute ssl-certificates describe family-hub-managed-cert
```

### 8.2 Create Cloud Armor Security Policy

```bash
# Create security policy
gcloud compute security-policies create family-hub-policy \
  --description="Family Hub Cloud Armor Policy"

# Allow traffic from specific countries
gcloud compute security-policies rules create 100 \
  --security-policy=family-hub-policy \
  --action=allow \
  --origin-region-list=US,CA,GB,AU

# Block traffic from specific countries
gcloud compute security-policies rules create 200 \
  --security-policy=family-hub-policy \
  --action=deny-403 \
  --origin-region-list=KP

# Rate limiting
gcloud compute security-policies rules create 300 \
  --security-policy=family-hub-policy \
  --action=rate-based-ban \
  --rate-limit-options=max-rps=100,enforce-on-key=IP \
  --ban-duration-sec=600

# Allow all other traffic
gcloud compute security-policies rules create 65535 \
  --security-policy=family-hub-policy \
  --action=allow

# Attach policy to backend service
gcloud compute backend-services update family-hub-backend \
  --security-policy=family-hub-policy \
  --global
```

### 8.3 Configure DDoS Protection

```bash
# Enable Cloud Armor adaptive protection
gcloud compute security-policies update family-hub-policy \
  --enable-layer7-ddos-defense

# Configure adaptive protection rules
gcloud compute security-policies rules create 10 \
  --security-policy=family-hub-policy \
  --action=rate-based-ban \
  --rate-limit-options=max-rps=1000,enforce-on-key=IP \
  --ban-duration-sec=600 \
  --enforce-on-key=IP
```

### 8.4 Update HTTPS Proxy with Certificate

```bash
# Update HTTPS proxy with managed certificate
gcloud compute target-https-proxies update family-hub-https-proxy \
  --ssl-certificates=family-hub-managed-cert

# Enable HTTP/2
gcloud compute target-https-proxies update family-hub-https-proxy \
  --enable-http2
```

---

## Step 9: Monitoring and Logging

### 9.1 Set Up Cloud Logging

```bash
# Create log sink for application logs
gcloud logging sinks create family-hub-logs \
  logging.googleapis.com/projects/$PROJECT_ID/logs/family-hub \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="family-hub"'

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50 \
  --format=json

# Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --follow \
  --format=json
```

### 9.2 Create Cloud Monitoring Alerts

```bash
# Create alert policy for high CPU
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High CPU" \
  --condition-display-name="CPU > 80%" \
  --condition-threshold-value=80 \
  --condition-threshold-duration=300s

# Create alert policy for high memory
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High Memory" \
  --condition-display-name="Memory > 80%" \
  --condition-threshold-value=80 \
  --condition-threshold-duration=300s

# Create alert policy for error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High Error Rate" \
  --condition-display-name="Error Rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

### 9.3 Create Cloud Monitoring Dashboard

```bash
# Create dashboard
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "Family Hub Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/cpu_utilization\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/memory_utilization\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF
```

### 9.4 Configure Log-Based Metrics

```bash
# Create metric for errors
gcloud logging metrics create error_count \
  --description="Count of error logs" \
  --log-filter='severity="ERROR"'

# Create metric for warnings
gcloud logging metrics create warning_count \
  --description="Count of warning logs" \
  --log-filter='severity="WARNING"'

# View metrics
gcloud logging metrics list
```

---

## Step 10: Backup and Disaster Recovery

### 10.1 Configure Cloud SQL Backups

```bash
# Verify backup configuration
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(settings.backupConfiguration)'

# Create on-demand backup
gcloud sql backups create \
  --instance=$INSTANCE_NAME \
  --description="Initial backup"

# List backups
gcloud sql backups list --instance=$INSTANCE_NAME

# Verify backup retention
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(settings.backupConfiguration.binaryLogEnabled)'
```

### 10.2 Enable Point-in-Time Recovery

```bash
# Enable PITR (already enabled during creation)
gcloud sql instances patch $INSTANCE_NAME \
  --backup-start-time=03:00 \
  --transaction-log-retention-days=7

# Verify PITR is enabled
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(settings.backupConfiguration.transactionLogRetentionDays)'
```

### 10.3 Create Disaster Recovery Plan

```bash
# Document recovery procedures
cat > docs/GCP_DISASTER_RECOVERY.md << 'EOF'
# GCP Disaster Recovery Plan

## Cloud SQL Failure Recovery

1. **Detect failure**: Cloud Monitoring alert triggers
2. **Failover to replica**: Automatic (HA replica enabled)
3. **Verify connectivity**: Test database connection
4. **Check application logs**: Review Cloud Logging
5. **Notify team**: Send alert notification

## Cloud Run Service Failure Recovery

1. **Detect failure**: Health check fails
2. **Auto-restart**: Cloud Run automatically restarts
3. **Verify service**: Check service status
4. **Scale up if needed**: Increase min instances

## Complete Outage Recovery

1. **Restore from backup**:
   ```bash
   gcloud sql backups restore BACKUP_ID \
     --backup-instance=$INSTANCE_NAME \
     --backup-configuration=default
   ```

2. **Update connection string** in Secret Manager

3. **Restart Cloud Run service**:
   ```bash
   gcloud run services update-traffic $SERVICE_NAME \
     --region=$REGION \
     --to-revisions LATEST=100
   ```

4. **Verify application**: Test all critical flows

## Point-in-Time Recovery

```bash
# Restore to specific point in time
gcloud sql backups restore BACKUP_ID \
  --backup-instance=$INSTANCE_NAME \
  --point-in-time=2024-01-15T10:30:00Z
```

## Rollback Procedure

See ROLLBACK_PROCEDURES.md
EOF
```

### 10.4 Set Up Automated Backups

```bash
# Create Cloud Scheduler job for daily backups
gcloud scheduler jobs create app-engine family-hub-backup \
  --schedule="0 3 * * *" \
  --time-zone="UTC" \
  --http-method=POST \
  --uri="https://www.googleapis.com/sql/v1/projects/${PROJECT_ID}/instances/${INSTANCE_NAME}/backups" \
  --oidc-service-account-email=${SA_EMAIL}
```

---

## Step 11: Auto-Scaling Configuration

### 11.1 Configure Cloud Run Auto-Scaling

```bash
# Update service with auto-scaling settings
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=100 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --concurrency=80

# Verify settings
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(spec.template.spec.containerConcurrency,spec.template.metadata.annotations.autoscaling)'
```

### 11.2 Configure Cloud SQL Auto-Scaling

```bash
# Enable storage auto-scaling
gcloud sql instances patch $INSTANCE_NAME \
  --database-flags=cloudsql_iam_authentication=on

# Set storage auto-scaling limits
gcloud sql instances patch $INSTANCE_NAME \
  --storage-auto-increase \
  --storage-auto-increase-limit=500
```

---

## Step 12: Performance Optimization

### 12.1 Enable Cloud CDN Caching

```bash
# Update backend service with CDN settings
gcloud compute backend-services update family-hub-backend \
  --global \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600

# Add cache key policy
gcloud compute backend-services update family-hub-backend \
  --global \
  --cache-key-include-host \
  --cache-key-include-protocol \
  --cache-key-include-query-string
```

### 12.2 Configure Compression

```bash
# Enable compression for backend service
gcloud compute backend-services update family-hub-backend \
  --global \
  --enable-compression
```

### 12.3 Set Up Connection Pooling

```bash
# Configure Cloud SQL connection pooling
gcloud sql instances patch $INSTANCE_NAME \
  --database-flags=max_connections=200,shared_preload_libraries=pgbouncer
```

---

## Step 13: Security Hardening

### 13.1 Configure VPC Service Controls

```bash
# Create VPC Service Control perimeter
gcloud access-context-manager perimeters create family-hub-perimeter \
  --resources=projects/$PROJECT_ID \
  --restricted-services=cloudsql.googleapis.com,run.googleapis.com

# Add access level
gcloud access-context-manager levels create family-hub-level \
  --basic-level-spec=- << 'EOF'
{
  "conditions": [
    {
      "ipSubnetworks": ["YOUR_IP/32"]
    }
  ]
}
EOF
```

### 13.2 Enable Binary Authorization

```bash
# Create attestor
gcloud container binauthz attestors create family-hub-attestor \
  --attestation-authority-note=family-hub-note \
  --attestation-authority-note-project=$PROJECT_ID

# Enable binary authorization policy
gcloud container binauthz policy import - << 'EOF'
{
  "admissionWhitelistPatterns": [
    {
      "namePattern": "gcr.io/gke-release/*"
    }
  ],
  "defaultAdmissionRule": {
    "requireAttestationsBy": [
      "projects/$PROJECT_ID/attestors/family-hub-attestor"
    ],
    "enforcementMode": "ENFORCED_BLOCK_AND_AUDIT_LOG"
  }
}
EOF
```

### 13.3 Configure IAM Bindings

```bash
# Grant Cloud Run developer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:developer@example.com" \
  --role="roles/run.developer"

# Grant Cloud SQL client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:developer@example.com" \
  --role="roles/cloudsql.client"

# Grant Secret Manager accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:developer@example.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Troubleshooting

### Cloud Run Service Not Starting

```bash
# Check service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit=50 \
  --format=json

# Check revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

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
# Test Cloud SQL connectivity
gcloud sql connect $INSTANCE_NAME \
  --user=$DB_USER \
  --database=$DB_NAME

# Check Cloud SQL Proxy
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(ipAddresses[*].ipAddress)'

# Verify service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

### DNS Not Resolving

```bash
# Check DNS records
gcloud dns record-sets list --zone=$ZONE_NAME

# Verify nameservers
gcloud dns managed-zones describe $ZONE_NAME \
  --format='value(nameServers)'

# Test DNS resolution
dig $DOMAIN @ns-xxx.googledomains.com
nslookup $DOMAIN
```

### SSL Certificate Issues

```bash
# Check certificate status
gcloud compute ssl-certificates describe family-hub-managed-cert

# Check certificate provisioning
gcloud compute ssl-certificates describe family-hub-managed-cert \
  --format='value(managed[0].domainStatus)'

# If certificate is stuck, delete and recreate
gcloud compute ssl-certificates delete family-hub-managed-cert
gcloud compute ssl-certificates create family-hub-managed-cert \
  --domains=familyhub.example.com,www.familyhub.example.com
```

### High Latency or Timeouts

```bash
# Check Cloud Run metrics
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check backend service health
gcloud compute backend-services get-health family-hub-backend --global

# Check Cloud CDN cache hit ratio
gcloud compute backend-services get-health family-hub-backend --global \
  --format='value(healthStatus[0].healthState)'
```

---

## Rollback Procedures

### Rollback Cloud Run Deployment

```bash
# List recent revisions
gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION \
  --limit=5

# Get previous revision name
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION \
  --format='value(name)' \
  --limit=2 | tail -1)

# Rollback to previous revision
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions $PREVIOUS_REVISION=100

# Verify rollback
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.traffic[0].revisionName)'
```

### Rollback Database Changes

```bash
# List available backups
gcloud sql backups list --instance=$INSTANCE_NAME

# Restore from backup
BACKUP_ID=$(gcloud sql backups list \
  --instance=$INSTANCE_NAME \
  --format='value(name)' \
  --limit=1)

gcloud sql backups restore $BACKUP_ID \
  --backup-instance=$INSTANCE_NAME

# Or restore to point in time
gcloud sql backups restore $BACKUP_ID \
  --backup-instance=$INSTANCE_NAME \
  --point-in-time=2024-01-15T10:30:00Z
```

---

## Cost Optimization

### Estimate Monthly Costs

```bash
# Cloud Run: ~$0.00002400 per vCPU-second + $0.0000050 per GB-second
# Estimate: 2 vCPU, 1GB RAM, 1M requests/month
# Cost: ~$30-50/month

# Cloud SQL: db-f1-micro ~$10/month, storage ~$0.18/GB/month
# Estimate: 100GB storage
# Cost: ~$28/month

# Cloud CDN: $0.12/GB (first 10TB)
# Estimate: 100GB/month
# Cost: ~$12/month

# Cloud DNS: $0.20/zone/month
# Cost: ~$0.20/month

# Total: ~$70-90/month
```

### Cost Reduction Tips

1. **Use Cloud Run's free tier**: 2M requests/month free
2. **Enable Cloud CDN caching**: Reduce origin requests
3. **Use db-f1-micro for development**: Lowest cost tier
4. **Set appropriate auto-scaling limits**: Prevent runaway costs
5. **Use committed use discounts**: For predictable workloads
6. **Monitor and alert on costs**: Use Cloud Billing alerts

---

## Post-Deployment Checklist

- [ ] Cloud SQL instance is running and accessible
- [ ] Cloud Run service is deployed and healthy
- [ ] Environment variables are configured in Secret Manager
- [ ] Cloud CDN is enabled and caching static assets
- [ ] Cloud DNS is configured and resolving correctly
- [ ] SSL certificate is valid and auto-renewing
- [ ] Cloud Armor security policy is active
- [ ] Monitoring and logging are configured
- [ ] Backups are enabled and tested
- [ ] Auto-scaling is configured appropriately
- [ ] Application is accessible at https://familyhub.example.com
- [ ] Health check endpoint returns 200: /health
- [ ] CloudLogging shows no errors
- [ ] All environment variables are working
- [ ] Database migrations have run successfully

---

## Next Steps

1. **Set up CI/CD**: Create GitHub Actions workflow for automated deployments
2. **Configure monitoring**: Set up additional Cloud Monitoring dashboards
3. **Enable advanced security**: Configure VPC Service Controls and Binary Authorization
4. **Optimize performance**: Implement caching strategies and connection pooling
5. **Set up disaster recovery**: Test backup and restore procedures

---

## References

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud CDN Documentation](https://cloud.google.com/cdn/docs)
- [Cloud DNS Documentation](https://cloud.google.com/dns/docs)
- [Cloud Armor Documentation](https://cloud.google.com/armor/docs)
- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
- [Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)

---

**Estimated Total Time**: 45-60 minutes (including DNS propagation)

**Last Updated**: January 2024
