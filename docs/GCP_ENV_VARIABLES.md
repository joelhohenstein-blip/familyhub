# GCP Environment Variables Configuration Guide

This guide explains how to configure environment variables for the Family Hub application on Google Cloud Platform.

## Overview

Environment variables are stored in two places on GCP:

1. **Google Cloud Secret Manager** - For sensitive values (encrypted at rest)
2. **Cloud Run Environment Variables** - For non-sensitive configuration

## Secret Manager Setup

### 1. Database Configuration

```bash
# Get Cloud SQL connection details
PROJECT_ID=$(gcloud config get-value project)
INSTANCE_NAME=family-hub-db
DB_NAME=family_hub
DB_USER=admin
DB_PASSWORD="your-secure-password"

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)')

# Create database URL secret
# Format: postgresql://user:password@/database?host=/cloudsql/CONNECTION_NAME
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo -n "$DATABASE_URL" | \
  gcloud secrets create family-hub-database-url --data-file=-

# Verify secret was created
gcloud secrets describe family-hub-database-url
```

### 2. Redis/Memorystore Configuration

```bash
# If using Google Cloud Memorystore for Redis
REDIS_HOST="family-hub-redis.xxxxx.cache.googleapis.com"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"

# Create Redis URL secret
REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"

echo -n "$REDIS_URL" | \
  gcloud secrets create family-hub-redis-url --data-file=-
```

### 3. Authentication Secrets (Clerk)

```bash
# Get Clerk keys from https://dashboard.clerk.com
CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"
CLERK_SECRET_KEY="sk_live_xxxxx"

# Create secrets
echo -n "$CLERK_PUBLISHABLE_KEY" | \
  gcloud secrets create family-hub-clerk-publishable-key --data-file=-

echo -n "$CLERK_SECRET_KEY" | \
  gcloud secrets create family-hub-clerk-secret-key --data-file=-

# Verify secrets
gcloud secrets list --filter="name:clerk"
```

### 4. Payment Processing Secrets (Stripe)

```bash
# Get Stripe keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_live_xxxxx"
STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# Create secrets
echo -n "$STRIPE_SECRET_KEY" | \
  gcloud secrets create family-hub-stripe-secret-key --data-file=-

echo -n "$STRIPE_PUBLISHABLE_KEY" | \
  gcloud secrets create family-hub-stripe-publishable-key --data-file=-

echo -n "$STRIPE_WEBHOOK_SECRET" | \
  gcloud secrets create family-hub-stripe-webhook-secret --data-file=-

# Verify secrets
gcloud secrets list --filter="name:stripe"
```

### 5. Real-Time Communication Secrets (Pusher)

```bash
# Get Pusher credentials from https://dashboard.pusher.com
PUSHER_APP_ID="1234567"
PUSHER_KEY="xxxxx"
PUSHER_SECRET="xxxxx"
PUSHER_CLUSTER="mt1"

# Create secrets
echo -n "$PUSHER_APP_ID" | \
  gcloud secrets create family-hub-pusher-app-id --data-file=-

echo -n "$PUSHER_KEY" | \
  gcloud secrets create family-hub-pusher-key --data-file=-

echo -n "$PUSHER_SECRET" | \
  gcloud secrets create family-hub-pusher-secret --data-file=-

echo -n "$PUSHER_CLUSTER" | \
  gcloud secrets create family-hub-pusher-cluster --data-file=-

# Verify secrets
gcloud secrets list --filter="name:pusher"
```

### 6. Weather API Secrets (OpenWeather)

```bash
# Get API key from https://openweathermap.org/api
OPENWEATHER_API_KEY="xxxxx"

# Create secret
echo -n "$OPENWEATHER_API_KEY" | \
  gcloud secrets create family-hub-openweather-api-key --data-file=-

# Verify secret
gcloud secrets describe family-hub-openweather-api-key
```

### 7. Application URL

```bash
# Store deployment URL
DEPLOYMENT_URL="https://familyhub.example.com"

echo -n "$DEPLOYMENT_URL" | \
  gcloud secrets create family-hub-deployment-url --data-file=-

# Verify secret
gcloud secrets describe family-hub-deployment-url
```

## Grant Service Account Access to Secrets

```bash
# Get service account email
SA_EMAIL="family-hub-run@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant access to all secrets
for secret in family-hub-database-url \
              family-hub-redis-url \
              family-hub-clerk-publishable-key \
              family-hub-clerk-secret-key \
              family-hub-stripe-secret-key \
              family-hub-stripe-publishable-key \
              family-hub-stripe-webhook-secret \
              family-hub-pusher-app-id \
              family-hub-pusher-key \
              family-hub-pusher-secret \
              family-hub-pusher-cluster \
              family-hub-openweather-api-key \
              family-hub-deployment-url; do
  
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done

# Verify permissions
gcloud secrets get-iam-policy family-hub-database-url
```

## Cloud Run Environment Configuration

### 1. Deploy with Secrets

```bash
# Deploy Cloud Run service with secrets
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/family-hub/family-hub:latest \
  --region=us-central1 \
  --platform=managed \
  --service-account=family-hub-run@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-cloudsql-instances=family-hub-db \
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
  --update-secrets DEPLOYMENT_URL=family-hub-deployment-url:latest \
  --set-env-vars NODE_ENV=production,PORT=3000
```

### 2. Update Secrets in Existing Service

```bash
# Update secrets in running service
gcloud run services update family-hub \
  --region=us-central1 \
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

### 3. Set Non-Sensitive Environment Variables

```bash
# Set non-sensitive environment variables
gcloud run services update family-hub \
  --region=us-central1 \
  --set-env-vars \
    NODE_ENV=production,\
    PORT=3000,\
    LOG_LEVEL=info,\
    CACHE_TTL=3600,\
    SESSION_TIMEOUT=1800,\
    MAX_REQUEST_SIZE=10mb,\
    CORS_ORIGIN=https://familyhub.example.com,\
    API_RATE_LIMIT=1000,\
    ENABLE_METRICS=true,\
    ENABLE_TRACING=true
```

## Verify Environment Variables

### 1. Check Service Configuration

```bash
# View service configuration
gcloud run services describe family-hub \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)'

# View secrets mounted
gcloud run services describe family-hub \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].envFrom)'
```

### 2. Test Environment Variables in Cloud Run

```bash
# SSH into Cloud Run instance (requires gcloud beta)
gcloud beta run services proxy family-hub --region=us-central1

# Or check logs for environment variable errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50 \
  --format=json | grep -i "env\|undefined\|missing"
```

### 3. Verify Secret Access

```bash
# Check if service account can access secrets
gcloud secrets get-iam-policy family-hub-database-url \
  --format='value(bindings[0].members)'

# Test secret access
gcloud secrets versions access latest --secret=family-hub-database-url
```

## Rotate Secrets

### 1. Update Secret Value

```bash
# Update a secret with new value
NEW_VALUE="new-secret-value"

echo -n "$NEW_VALUE" | \
  gcloud secrets versions add family-hub-stripe-secret-key --data-file=-

# Verify new version
gcloud secrets versions list family-hub-stripe-secret-key
```

### 2. Redeploy Service to Use New Secret

```bash
# Cloud Run automatically uses latest secret version
# But you can force a redeploy to ensure it's picked up
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/family-hub/family-hub:latest \
  --region=us-central1 \
  --no-traffic

# Then shift traffic to new revision
gcloud run services update-traffic family-hub \
  --region=us-central1 \
  --to-revisions LATEST=100
```

## Environment Variables Reference

### Database

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `DATABASE_URL` | Secret | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `DB_POOL_SIZE` | Env | Connection pool size | `20` |
| `DB_TIMEOUT` | Env | Connection timeout (ms) | `5000` |

### Cache

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `REDIS_URL` | Secret | Redis connection string | `redis://host:6379` |
| `CACHE_TTL` | Env | Cache time-to-live (seconds) | `3600` |
| `CACHE_MAX_SIZE` | Env | Max cache size (MB) | `100` |

### Authentication

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `CLERK_PUBLISHABLE_KEY` | Secret | Clerk public key | `pk_live_xxxxx` |
| `CLERK_SECRET_KEY` | Secret | Clerk secret key | `sk_live_xxxxx` |
| `SESSION_TIMEOUT` | Env | Session timeout (seconds) | `1800` |

### Payments

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `STRIPE_SECRET_KEY` | Secret | Stripe secret key | `sk_live_xxxxx` |
| `STRIPE_PUBLISHABLE_KEY` | Secret | Stripe public key | `pk_live_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook secret | `whsec_xxxxx` |

### Real-Time

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `PUSHER_APP_ID` | Secret | Pusher app ID | `1234567` |
| `PUSHER_KEY` | Secret | Pusher key | `xxxxx` |
| `PUSHER_SECRET` | Secret | Pusher secret | `xxxxx` |
| `PUSHER_CLUSTER` | Secret | Pusher cluster | `mt1` |

### External APIs

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `OPENWEATHER_API_KEY` | Secret | OpenWeather API key | `xxxxx` |

### Application

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NODE_ENV` | Env | Environment | `production` |
| `PORT` | Env | Server port | `3000` |
| `DEPLOYMENT_URL` | Secret | Application URL | `https://familyhub.example.com` |
| `LOG_LEVEL` | Env | Logging level | `info` |
| `ENABLE_METRICS` | Env | Enable metrics | `true` |
| `ENABLE_TRACING` | Env | Enable tracing | `true` |

## Troubleshooting

### Secret Not Found Error

```bash
# Check if secret exists
gcloud secrets describe family-hub-database-url

# List all secrets
gcloud secrets list

# If missing, create it
echo -n "value" | gcloud secrets create family-hub-database-url --data-file=-
```

### Permission Denied Error

```bash
# Check service account permissions
gcloud secrets get-iam-policy family-hub-database-url

# Grant access if missing
SA_EMAIL="family-hub-run@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding family-hub-database-url \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

### Environment Variable Not Available in Application

```bash
# Check Cloud Run service configuration
gcloud run services describe family-hub \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)'

# Check logs for errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50 \
  --format=json

# Redeploy service
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/family-hub/family-hub:latest \
  --region=us-central1 \
  --force-new-deployment
```

### Secret Value Contains Special Characters

```bash
# Use file-based approach for complex values
cat > /tmp/secret-value.txt << 'EOF'
your-secret-value-with-special-chars!@#$%^&*()
EOF

gcloud secrets create family-hub-complex-secret --data-file=/tmp/secret-value.txt

# Clean up
rm /tmp/secret-value.txt
```

## Best Practices

1. **Use Secret Manager for sensitive data**: Never hardcode secrets in code or configuration files
2. **Rotate secrets regularly**: Update secrets every 90 days
3. **Use least privilege**: Grant only necessary permissions to service accounts
4. **Audit secret access**: Enable Cloud Audit Logs for secret access
5. **Use separate secrets per environment**: Keep dev, staging, and prod secrets separate
6. **Document secret purposes**: Add descriptions to secrets for team reference
7. **Automate secret updates**: Use Cloud Scheduler for automated secret rotation
8. **Monitor secret usage**: Set up alerts for unusual secret access patterns

## Automation Script

Save as `scripts/setup-gcp-secrets.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="family-hub-run@${PROJECT_ID}.iam.gserviceaccount.com"

# Function to create secret
create_secret() {
  local name=$1
  local value=$2
  
  if gcloud secrets describe $name &>/dev/null; then
    echo "Secret $name already exists, updating..."
    echo -n "$value" | gcloud secrets versions add $name --data-file=-
  else
    echo "Creating secret $name..."
    echo -n "$value" | gcloud secrets create $name --data-file=-
  fi
  
  # Grant access
  gcloud secrets add-iam-policy-binding $name \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
}

# Create all secrets
create_secret "family-hub-database-url" "${DATABASE_URL}"
create_secret "family-hub-redis-url" "${REDIS_URL}"
create_secret "family-hub-clerk-publishable-key" "${CLERK_PUBLISHABLE_KEY}"
create_secret "family-hub-clerk-secret-key" "${CLERK_SECRET_KEY}"
create_secret "family-hub-stripe-secret-key" "${STRIPE_SECRET_KEY}"
create_secret "family-hub-stripe-publishable-key" "${STRIPE_PUBLISHABLE_KEY}"
create_secret "family-hub-stripe-webhook-secret" "${STRIPE_WEBHOOK_SECRET}"
create_secret "family-hub-pusher-app-id" "${PUSHER_APP_ID}"
create_secret "family-hub-pusher-key" "${PUSHER_KEY}"
create_secret "family-hub-pusher-secret" "${PUSHER_SECRET}"
create_secret "family-hub-pusher-cluster" "${PUSHER_CLUSTER}"
create_secret "family-hub-openweather-api-key" "${OPENWEATHER_API_KEY}"
create_secret "family-hub-deployment-url" "${DEPLOYMENT_URL}"

echo "✓ All secrets created and permissions granted!"
```

Usage:
```bash
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."
# ... set other variables ...

chmod +x scripts/setup-gcp-secrets.sh
./scripts/setup-gcp-secrets.sh
```

---

**Last Updated**: January 2024
