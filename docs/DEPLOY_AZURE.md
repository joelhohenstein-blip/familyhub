# Azure Deployment Guide

Complete guide for deploying FamilyHub to Microsoft Azure with App Service, Azure Database for PostgreSQL, CDN, DNS, and monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Database for PostgreSQL](#azure-database-for-postgresql)
3. [App Service Deployment](#app-service-deployment)
4. [Azure CDN Setup](#azure-cdn-setup)
5. [Azure DNS Configuration](#azure-dns-configuration)
6. [Environment Variables](#environment-variables)
7. [Application Insights Monitoring](#application-insights-monitoring)
8. [Security Best Practices](#security-best-practices)
9. [Cost Optimization](#cost-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Azure CLI (`az` command)
- Node.js 18+ and Bun
- Git
- Azure subscription with appropriate permissions

### Installation

```bash
# Install Azure CLI (macOS)
brew install azure-cli

# Install Azure CLI (Linux)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Azure CLI (Windows)
# Download from https://aka.ms/installazurecliwindows

# Verify installation
az --version
```

### Azure Login

```bash
# Login to Azure
az login

# Set default subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify subscription
az account show
```

---

## Azure Database for PostgreSQL

### Create Resource Group

```bash
# Define variables
RESOURCE_GROUP="familyhub-rg"
LOCATION="eastus"  # or your preferred region
DB_SERVER_NAME="familyhub-db-server"
DB_NAME="familyhub_db"
DB_ADMIN_USER="dbadmin"
DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Use strong password

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Create PostgreSQL Server

```bash
# Create Azure Database for PostgreSQL (Flexible Server)
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name "Standard_B1ms" \
  --tier "Burstable" \
  --storage-size 32 \
  --version 15 \
  --high-availability "Disabled" \
  --backup-retention 7 \
  --geo-redundant-backup "Disabled"
```

### Configure PostgreSQL Firewall

```bash
# Allow Azure services to access the database
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name "AllowAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"

# Allow your local IP (for development)
YOUR_IP="YOUR_PUBLIC_IP"
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name "AllowLocalDevelopment" \
  --start-ip-address $YOUR_IP \
  --end-ip-address $YOUR_IP
```

### Create Database and User

```bash
# Connect to PostgreSQL and create database
PGPASSWORD=$DB_ADMIN_PASSWORD psql \
  -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
  -U "${DB_ADMIN_USER}@${DB_SERVER_NAME}" \
  -d "postgres" \
  -c "CREATE DATABASE $DB_NAME;"

# Create application user (optional but recommended)
APP_USER="appuser"
APP_PASSWORD="AppUserSecurePassword123!"

PGPASSWORD=$DB_ADMIN_PASSWORD psql \
  -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
  -U "${DB_ADMIN_USER}@${DB_SERVER_NAME}" \
  -d $DB_NAME \
  -c "CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';"

# Grant privileges
PGPASSWORD=$DB_ADMIN_PASSWORD psql \
  -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
  -U "${DB_ADMIN_USER}@${DB_SERVER_NAME}" \
  -d $DB_NAME \
  -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_USER;"
```

### Connection String

```bash
# For application use
DATABASE_URL="postgresql://${APP_USER}:${APP_PASSWORD}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

echo "DATABASE_URL=$DATABASE_URL"
```

---

## App Service Deployment

### Create App Service Plan

```bash
# Define variables
APP_SERVICE_PLAN="familyhub-plan"
APP_SERVICE_NAME="familyhub-app"
RUNTIME="NODE|18-lts"  # or NODE|20-lts

# Create App Service Plan
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku "B2" \
  --is-linux
```

### Create Web App

```bash
# Create App Service
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $APP_SERVICE_NAME \
  --runtime $RUNTIME
```

### Configure App Service

```bash
# Enable managed identity
az webapp identity assign \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME

# Configure startup command
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --startup-file "bun run start"

# Enable HTTPS only
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --https-only true
```

### Deploy Application

#### Option 1: GitHub Actions (Recommended)

```bash
# Create deployment credentials
az webapp deployment user set \
  --user-name "familyhub-deploy" \
  --password "YourDeploymentPassword123!"

# Get publish profile
az webapp deployment list-publishing-profiles \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --query "[0]" \
  --output json > publish-profile.json
```

Add to GitHub Secrets:
- `AZURE_WEBAPP_PUBLISH_PROFILE`: Content of publish-profile.json
- `AZURE_WEBAPP_NAME`: $APP_SERVICE_NAME

GitHub Actions Workflow (`.github/workflows/azure-deploy.yml`):

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build application
        run: bun run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}

      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

#### Option 2: Local Deployment

```bash
# Install Azure App Service extension
az extension add --name webapp

# Deploy using zip
cd /workspace
bun install
bun run build

# Create deployment package
zip -r deployment.zip . \
  -x "node_modules/*" \
  "dist/*" \
  ".git/*" \
  "venv/*"

# Deploy
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --src deployment.zip
```

---

## Azure CDN Setup

### Create CDN Profile

```bash
# Define variables
CDN_PROFILE="familyhub-cdn"
CDN_ENDPOINT="familyhub-cdn-endpoint"

# Create CDN Profile
az cdn profile create \
  --resource-group $RESOURCE_GROUP \
  --name $CDN_PROFILE \
  --sku "Standard_Microsoft"
```

### Create CDN Endpoint

```bash
# Get App Service hostname
APP_HOSTNAME="${APP_SERVICE_NAME}.azurewebsites.net"

# Create CDN Endpoint
az cdn endpoint create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $CDN_PROFILE \
  --name $CDN_ENDPOINT \
  --origin $APP_HOSTNAME \
  --origin-host-header $APP_HOSTNAME \
  --enable-compression true \
  --content-types-to-compress "text/plain" "text/html" "text/xml" "text/css" "application/x-javascript" "application/javascript" "application/json"
```

### Configure CDN Caching Rules

```bash
# Create caching rule for static assets
az cdn endpoint rule add \
  --resource-group $RESOURCE_GROUP \
  --profile-name $CDN_PROFILE \
  --name $CDN_ENDPOINT \
  --order 1 \
  --rule-name "CacheStaticAssets" \
  --match-variable "UrlPath" \
  --operator "BeginsWith" \
  --match-values "/assets/" \
  --cache-behavior "Override" \
  --cache-duration "7.00:00:00"

# Create rule for HTML (shorter cache)
az cdn endpoint rule add \
  --resource-group $RESOURCE_GROUP \
  --profile-name $CDN_PROFILE \
  --name $CDN_ENDPOINT \
  --order 2 \
  --rule-name "CacheHTML" \
  --match-variable "UrlPath" \
  --operator "EndsWith" \
  --match-values ".html" \
  --cache-behavior "Override" \
  --cache-duration "0.01:00:00"
```

### CDN Endpoint URL

```bash
# Get CDN endpoint URL
CDN_URL="https://${CDN_ENDPOINT}.azureedge.net"
echo "CDN URL: $CDN_URL"
```

---

## Azure DNS Configuration

### Create DNS Zone

```bash
# Define variables
DNS_ZONE="yourdomain.com"
DNS_ZONE_RG="familyhub-dns-rg"

# Create resource group for DNS (optional, can use same RG)
az group create \
  --name $DNS_ZONE_RG \
  --location $LOCATION

# Create DNS Zone
az network dns zone create \
  --resource-group $DNS_ZONE_RG \
  --name $DNS_ZONE
```

### Get Nameservers

```bash
# Get Azure nameservers
az network dns zone show \
  --resource-group $DNS_ZONE_RG \
  --name $DNS_ZONE \
  --query "nameServers" \
  --output table
```

Update your domain registrar with these nameservers.

### Create DNS Records

```bash
# A record for App Service
az network dns record-set a add-record \
  --resource-group $DNS_ZONE_RG \
  --zone-name $DNS_ZONE \
  --record-set-name "@" \
  --ipv4-address "YOUR_APP_SERVICE_IP"

# CNAME for www subdomain
az network dns record-set cname set-record \
  --resource-group $DNS_ZONE_RG \
  --zone-name $DNS_ZONE \
  --record-set-name "www" \
  --cname "${APP_SERVICE_NAME}.azurewebsites.net"

# CNAME for CDN
az network dns record-set cname set-record \
  --resource-group $DNS_ZONE_RG \
  --zone-name $DNS_ZONE \
  --record-set-name "cdn" \
  --cname "${CDN_ENDPOINT}.azureedge.net"

# TXT record for domain verification (if needed)
az network dns record-set txt add-record \
  --resource-group $DNS_ZONE_RG \
  --zone-name $DNS_ZONE \
  --record-set-name "@" \
  --value "v=spf1 include:sendgrid.net ~all"
```

### Configure Custom Domain in App Service

```bash
# Add custom domain to App Service
az webapp config hostname add \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $APP_SERVICE_NAME \
  --hostname "yourdomain.com"

# Create SSL certificate (free managed certificate)
az webapp config ssl bind \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --certificate-thumbprint "YOUR_CERT_THUMBPRINT" \
  --ssl-type "SNI"
```

---

## Environment Variables

### Set App Service Configuration

```bash
# Create .env file with all variables
cat > azure-env.txt << 'EOF'
DATABASE_URL=postgresql://appuser:AppUserSecurePassword123!@familyhub-db-server.postgres.database.azure.com:5432/familyhub_db?sslmode=require
NODE_ENV=production
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
SENTRY_DSN=your_sentry_dsn
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
ANALYTICS_WRITE_KEY=your_analytics_write_key
VITE_API_URL=https://yourdomain.com/api
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
EOF

# Apply environment variables to App Service
while IFS='=' read -r key value; do
  if [ -n "$key" ] && [ -n "$value" ]; then
    az webapp config appsettings set \
      --resource-group $RESOURCE_GROUP \
      --name $APP_SERVICE_NAME \
      --settings "${key}=${value}"
  fi
done < azure-env.txt
```

### Verify Configuration

```bash
# List all app settings
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --output table
```

---

## Application Insights Monitoring

### Create Application Insights Resource

```bash
# Define variables
APP_INSIGHTS_NAME="familyhub-insights"

# Create Application Insights
az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type "web"

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "instrumentationKey" \
  --output tsv)

echo "Instrumentation Key: $INSTRUMENTATION_KEY"
```

### Link to App Service

```bash
# Add Application Insights to App Service
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY"

# Enable Application Insights
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --web-sockets-enabled true
```

### Configure Monitoring

```bash
# Create metric alert for high CPU
az monitor metrics alert create \
  --name "HighCPUAlert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/serverfarms/${APP_SERVICE_PLAN}" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "email" \
  --email-receiver "admin@yourdomain.com"

# Create metric alert for high memory
az monitor metrics alert create \
  --name "HighMemoryAlert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/serverfarms/${APP_SERVICE_PLAN}" \
  --condition "avg Memory Percentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "email" \
  --email-receiver "admin@yourdomain.com"

# Create alert for failed requests
az monitor metrics alert create \
  --name "FailedRequestsAlert" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${APP_SERVICE_NAME}" \
  --condition "total Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "email" \
  --email-receiver "admin@yourdomain.com"
```

### View Logs

```bash
# Stream application logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME

# View deployment logs
az webapp deployment log show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME
```

---

## Security Best Practices

### 1. Network Security

```bash
# Enable Web Application Firewall (WAF)
az network front-door waf-policy create \
  --name "familyhub-waf" \
  --resource-group $RESOURCE_GROUP \
  --mode "Prevention"

# Add WAF rules
az network front-door waf-policy rule create \
  --name "RateLimitRule" \
  --policy-name "familyhub-waf" \
  --resource-group $RESOURCE_GROUP \
  --action "Block" \
  --priority 1 \
  --rule-type "RateLimitRule" \
  --rate-limit-threshold 2000 \
  --rate-limit-duration-sec 60
```

### 2. Database Security

```bash
# Enable SSL enforcement
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name "require_secure_transport" \
  --value "ON"

# Enable audit logging
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name "log_statement" \
  --value "all"
```

### 3. Secrets Management

```bash
# Create Azure Key Vault
VAULT_NAME="familyhub-vault"

az keyvault create \
  --name $VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Store secrets
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name "DatabasePassword" \
  --value $DB_ADMIN_PASSWORD

az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name "ClerkSecretKey" \
  --value "your_clerk_secret_key"

# Grant App Service access to Key Vault
PRINCIPAL_ID=$(az webapp identity show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --query "principalId" \
  --output tsv)

az keyvault set-policy \
  --name $VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

### 4. HTTPS/TLS Configuration

```bash
# Enforce HTTPS
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --https-only true

# Set minimum TLS version
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --min-tls-version "1.2"
```

---

## Cost Optimization

### 1. Right-Size Resources

```bash
# Monitor resource usage
az monitor metrics list \
  --resource "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/serverfarms/${APP_SERVICE_PLAN}" \
  --metric "CpuPercentage" \
  --start-time "2024-01-01T00:00:00Z" \
  --interval PT1H

# Scale down if needed
az appservice plan update \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku "B1"
```

### 2. Database Optimization

```bash
# Use Burstable tier for development
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --tier "Burstable" \
  --sku-name "Standard_B1ms"

# Disable geo-redundant backup if not needed
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --geo-redundant-backup "Disabled"
```

### 3. CDN Optimization

```bash
# Use Standard tier for cost savings
az cdn profile update \
  --resource-group $RESOURCE_GROUP \
  --name $CDN_PROFILE \
  --sku "Standard_Microsoft"
```

### 4. Reserved Instances

```bash
# Purchase reserved instances for long-term savings
# Use Azure Portal: Cost Management + Billing > Reservations > Purchase
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME

# Test connection
psql -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
  -U "${DB_ADMIN_USER}@${DB_SERVER_NAME}" \
  -d $DB_NAME \
  -c "SELECT version();"
```

#### 2. App Service Won't Start

```bash
# Check logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME

# Restart app service
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME

# Check app settings
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME
```

#### 3. CDN Not Caching

```bash
# Purge CDN cache
az cdn endpoint purge \
  --resource-group $RESOURCE_GROUP \
  --profile-name $CDN_PROFILE \
  --name $CDN_ENDPOINT \
  --content-paths "/*"

# Check endpoint status
az cdn endpoint show \
  --resource-group $RESOURCE_GROUP \
  --profile-name $CDN_PROFILE \
  --name $CDN_ENDPOINT
```

#### 4. DNS Not Resolving

```bash
# Check DNS records
az network dns record-set list \
  --resource-group $DNS_ZONE_RG \
  --zone-name $DNS_ZONE

# Verify nameservers
nslookup $DNS_ZONE

# Test DNS propagation
dig $DNS_ZONE
```

### Monitoring and Debugging

```bash
# View real-time logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --provider "Application"

# Check Application Insights
az monitor app-insights metrics show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --metric "requests/count"

# View failed requests
az monitor app-insights query \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "requests | where success == false | summarize count() by resultCode"
```

---

## Deployment Checklist

- [ ] Azure subscription created and configured
- [ ] Resource group created
- [ ] PostgreSQL database created and configured
- [ ] App Service plan and web app created
- [ ] Application deployed successfully
- [ ] Environment variables configured
- [ ] CDN profile and endpoint created
- [ ] DNS zone created and nameservers updated
- [ ] Custom domain configured
- [ ] SSL/TLS certificate installed
- [ ] Application Insights enabled
- [ ] Monitoring alerts configured
- [ ] Backup and disaster recovery configured
- [ ] Security hardening completed
- [ ] Performance testing completed
- [ ] Cost optimization reviewed

---

## Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Azure CDN Documentation](https://docs.microsoft.com/en-us/azure/cdn/)
- [Azure DNS Documentation](https://docs.microsoft.com/en-us/azure/dns/)
- [Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/fundamentals/best-practices-and-patterns)

---

## Support

For issues or questions:
1. Check Azure Portal for resource status
2. Review Application Insights logs
3. Check Azure CLI error messages
4. Consult Azure documentation
5. Contact Azure Support

---

**Last Updated**: 2024
**Version**: 1.0
