# Environment Variables Reference

Family Hub - Complete Environment Variables Documentation

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables by Category](#environment-variables-by-category)
3. [Security Considerations](#security-considerations)
4. [Rotation Policies](#rotation-policies)
5. [Per-Environment Setup](#per-environment-setup)
6. [Validation & Testing](#validation--testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides a comprehensive reference for all environment variables used by the Family Hub application across development, staging, and production environments.

### Key Principles

✅ **Never commit secrets** - Use `.env.local` or secrets manager
✅ **Use .env.example** - Provide template for all required variables
✅ **Document defaults** - Specify which values are optional
✅ **Validate startup** - Ensure required variables are present
✅ **Rotate regularly** - Implement credential rotation policy

---

## Environment Variables by Category

### Application Configuration

#### `NODE_ENV`
- **Purpose**: Runtime environment indicator
- **Type**: `String`
- **Required**: Yes
- **Allowed Values**: `development`, `staging`, `production`
- **Default**: `development`
- **Example**: `NODE_ENV=production`
- **Notes**: Controls logging level, error handling, and feature flags

#### `APP_PORT`
- **Purpose**: Port for application server
- **Type**: `Number`
- **Required**: No
- **Default**: `3000`
- **Example**: `APP_PORT=3000`
- **Notes**: Must be available on the host

#### `PREDEV_DEPLOYMENT_URL`
- **Purpose**: Public URL for the deployed application
- **Type**: `URL`
- **Required**: Yes
- **Example**: `PREDEV_DEPLOYMENT_URL=https://familyhub.pre.dev`
- **Notes**: Used for OAuth redirects, email links, webhook callbacks

---

### Database Configuration

#### `DATABASE_URL`
- **Purpose**: PostgreSQL connection string
- **Type**: `URL`
- **Required**: Yes
- **Format**: `postgresql://[user[:password]@][host][:port][/database]`
- **Example**: `DATABASE_URL=postgresql://family_hub:securepass@localhost:5432/family_hub`
- **Security**: 
  - Store in secrets manager
  - Use strong password (32+ characters)
  - Use SSL/TLS in production (`?sslmode=require`)
- **Rotation**: Every 90 days in production

#### `DB_USER`
- **Purpose**: PostgreSQL username
- **Type**: `String`
- **Required**: Yes (for docker-compose)
- **Default**: `family_hub`
- **Example**: `DB_USER=family_hub`
- **Security**: Use dedicated database user, not postgres

#### `DB_PASSWORD`
- **Purpose**: PostgreSQL password
- **Type**: `String`
- **Required**: Yes (for docker-compose)
- **Security**: 
  - Minimum 16 characters
  - Mix of upper, lower, numbers, symbols
  - Never use default values in production
- **Example**: `DB_PASSWORD=Y8pL@2xQ9mN#5vR$`

#### `DB_NAME`
- **Purpose**: PostgreSQL database name
- **Type**: `String`
- **Required**: Yes (for docker-compose)
- **Default**: `family_hub`
- **Example**: `DB_NAME=family_hub`

#### `DB_HOST`
- **Purpose**: PostgreSQL server hostname
- **Type**: `String`
- **Required**: Yes (for docker-compose)
- **Default**: `localhost` (development), `postgres` (docker-compose), RDS endpoint (production)
- **Example**: 
  - Dev: `DB_HOST=localhost`
  - Docker: `DB_HOST=postgres`
  - Prod: `DB_HOST=family-hub-db.c9akciq32.us-east-1.rds.amazonaws.com`

#### `DB_PORT`
- **Purpose**: PostgreSQL server port
- **Type**: `Number`
- **Required**: Yes (for docker-compose)
- **Default**: `5432`
- **Example**: `DB_PORT=5432`

---

### Redis Configuration

#### `REDIS_URL`
- **Purpose**: Redis connection string for caching and real-time features
- **Type**: `URL`
- **Required**: Yes (for WebSocket and real-time features)
- **Format**: `redis://[user[:password]@][host][:port]`
- **Example**: `REDIS_URL=redis://localhost:6379`
- **Staging/Prod**: `REDIS_URL=redis://default:securepass@family-hub-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379`
- **Security**:
  - Use password in production
  - Enable TLS/SSL
  - Use dedicated Redis user
- **Rotation**: Every 90 days

#### `REDIS_PASSWORD`
- **Purpose**: Redis authentication password
- **Type**: `String`
- **Required**: No (development), Yes (production)
- **Security**: Minimum 32 characters, alphanumeric + symbols
- **Example**: `REDIS_PASSWORD=6Kx#9pL$2mQ@8vN`

---

### Authentication (Clerk)

#### `CLERK_PUBLISHABLE_KEY`
- **Purpose**: Clerk public key for frontend authentication
- **Type**: `String`
- **Required**: Yes
- **Format**: `pk_[live|test]_[alphanumeric]`
- **Example**: `CLERK_PUBLISHABLE_KEY=pk_test_abc123def456`
- **Security**: Public key, can be exposed in frontend code
- **Source**: [Clerk Dashboard](https://dashboard.clerk.com) → API Keys

#### `CLERK_SECRET_KEY`
- **Purpose**: Clerk secret key for backend authentication
- **Type**: `String`
- **Required**: Yes
- **Format**: `sk_[live|test]_[alphanumeric]`
- **Example**: `CLERK_SECRET_KEY=sk_test_xyz789uvw012`
- **Security**: 
  - NEVER expose in frontend code
  - Store only in backend .env
  - Rotate immediately if compromised
- **Rotation**: Every 90 days (generate new key in Clerk Dashboard)

#### `CLERK_WEBHOOK_SECRET`
- **Purpose**: Webhook signature verification for Clerk events
- **Type**: `String`
- **Required**: No (if using webhooks)
- **Security**: Stored in webhooks section of Clerk Dashboard
- **Example**: `CLERK_WEBHOOK_SECRET=whsec_1234567890abcdef`

---

### Real-time Communication (WebSockets)

#### `WEBSOCKET_URL`
- **Purpose**: WebSocket server endpoint for real-time features
- **Type**: `URL`
- **Required**: No (default to same origin)
- **Example**:
  - Dev: `WEBSOCKET_URL=ws://localhost:3000`
  - Prod: `WEBSOCKET_URL=wss://familyhub.pre.dev`
- **Notes**: Must use `wss://` (secure) in production

#### `WEBSOCKET_ENABLE_COMPRESSION`
- **Purpose**: Enable WebSocket compression for bandwidth optimization
- **Type**: `Boolean`
- **Required**: No
- **Default**: `true`
- **Example**: `WEBSOCKET_ENABLE_COMPRESSION=true`
- **Notes**: Reduces bandwidth by ~60%, slight CPU overhead

---

### Media Upload Configuration

#### `STORAGE_TYPE`
- **Purpose**: Where to store uploaded media (local filesystem or S3)
- **Type**: `String`
- **Required**: Yes
- **Allowed Values**: `local`, `s3`
- **Default**: `local` (development)
- **Production**: `s3`
- **Example**: `STORAGE_TYPE=s3`

#### `S3_BUCKET`
- **Purpose**: AWS S3 bucket name for media storage
- **Type**: `String`
- **Required**: Yes (if `STORAGE_TYPE=s3`)
- **Example**: `S3_BUCKET=family-hub-media-prod`
- **Notes**: Must exist in AWS account before startup

#### `S3_REGION`
- **Purpose**: AWS region for S3 bucket
- **Type**: `String`
- **Required**: Yes (if using S3)
- **Example**: `S3_REGION=us-east-1`
- **Valid Values**: `us-east-1`, `us-west-2`, `eu-west-1`, etc.

#### `S3_ACCESS_KEY_ID`
- **Purpose**: AWS IAM access key for S3 authentication
- **Type**: `String`
- **Required**: Yes (if using S3)
- **Security**:
  - Use IAM user with S3-only permissions
  - Rotate every 90 days
  - Never use root AWS credentials
- **Example**: `S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`

#### `S3_SECRET_ACCESS_KEY`
- **Purpose**: AWS IAM secret key for S3 authentication
- **Type**: `String`
- **Required**: Yes (if using S3)
- **Security**: Store in secrets manager only
- **Example**: `S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Rotation**: Every 90 days

#### `MAX_FILE_SIZE`
- **Purpose**: Maximum file size for uploads (in bytes)
- **Type**: `Number`
- **Required**: No
- **Default**: `104857600` (100 MB)
- **Example**: `MAX_FILE_SIZE=209715200` (200 MB)

#### `ALLOWED_FILE_TYPES`
- **Purpose**: Comma-separated list of allowed MIME types
- **Type**: `String`
- **Required**: No
- **Default**: `image/jpeg,image/png,image/gif,video/mp4,video/quicktime`
- **Example**: `ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4`

---

### Video Streaming Integration

#### `STREAMING_SERVICE_KEYS`
- **Purpose**: API keys for streaming services (Pluto, Tubi, Roku, Freeview)
- **Type**: `JSON String`
- **Required**: No (optional for public streams)
- **Example**:
  ```json
  {
    "pluto": "api_key_123",
    "tubi": "api_key_456",
    "roku": "api_key_789"
  }
  ```
- **Security**: Store as JSON in secrets manager

#### `STREAMING_API_TIMEOUT`
- **Purpose**: Timeout for streaming service API calls (milliseconds)
- **Type**: `Number`
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Example**: `STREAMING_API_TIMEOUT=45000`

---

### Weather Widget (Geolocation)

#### `WEATHER_API_KEY`
- **Purpose**: OpenWeatherMap or similar weather API key
- **Type**: `String`
- **Required**: No (optional, required if weather widget is enabled)
- **Example**: `WEATHER_API_KEY=abc123def456ghi789`
- **Source**: [OpenWeatherMap](https://openweathermap.org/api)
- **Security**: Store in secrets manager

#### `WEATHER_API_ENDPOINT`
- **Purpose**: Weather service API endpoint
- **Type**: `URL`
- **Required**: No
- **Default**: `https://api.openweathermap.org/data/2.5`
- **Example**: `WEATHER_API_ENDPOINT=https://api.openweathermap.org/data/2.5`

#### `GEOLOCATION_ENABLED`
- **Purpose**: Enable/disable geolocation feature
- **Type**: `Boolean`
- **Required**: No
- **Default**: `true`
- **Example**: `GEOLOCATION_ENABLED=true`
- **Notes**: Requires user permission in browser

---

### Logging & Monitoring

#### `LOG_LEVEL`
- **Purpose**: Logging level for application logs
- **Type**: `String`
- **Required**: No
- **Allowed Values**: `debug`, `info`, `warn`, `error`
- **Default**: `info` (production), `debug` (development)
- **Example**: `LOG_LEVEL=debug`

#### `SENTRY_DSN`
- **Purpose**: Sentry error tracking DSN
- **Type**: `URL`
- **Required**: No (optional, recommended for production)
- **Example**: `SENTRY_DSN=https://abc123@sentry.io/987654`
- **Source**: [Sentry Dashboard](https://sentry.io)
- **Notes**: Enables error tracking and performance monitoring

#### `DATADOG_API_KEY`
- **Purpose**: Datadog monitoring API key
- **Type**: `String`
- **Required**: No (optional alternative to Sentry)
- **Example**: `DATADOG_API_KEY=abc123def456ghi789jkl012`
- **Security**: Store in secrets manager

---

### Email & Notifications

#### `SENDGRID_API_KEY`
- **Purpose**: SendGrid email service API key
- **Type**: `String`
- **Required**: No (optional, for email notifications)
- **Example**: `SENDGRID_API_KEY=SG.abc123_def456ghi789jkl012mno345`
- **Source**: [SendGrid Dashboard](https://sendgrid.com/go/mail-settings-general)
- **Security**: Store in secrets manager
- **Rotation**: Every 90 days

#### `SENDGRID_FROM_EMAIL`
- **Purpose**: Sender email address for SendGrid emails
- **Type**: `Email`
- **Required**: No (if using SendGrid)
- **Example**: `SENDGRID_FROM_EMAIL=noreply@familyhub.local`
- **Notes**: Must be verified sender in SendGrid

---

### Session & Security

#### `SESSION_SECRET`
- **Purpose**: Secret key for session encryption
- **Type**: `String`
- **Required**: Yes (if using session-based auth)
- **Length**: Minimum 32 characters
- **Example**: `SESSION_SECRET=Ks7mP2#9xL@4vQ$8nR&5yT!3wU%1sC^6`
- **Security**:
  - Generate with: `openssl rand -hex 32`
  - Store in secrets manager
  - Rotate every 6 months
- **Impact**: Changing this invalidates all existing sessions

#### `CSRF_TOKEN_SECRET`
- **Purpose**: Secret for CSRF token generation
- **Type**: `String`
- **Required**: Yes
- **Length**: Minimum 32 characters
- **Example**: `CSRF_TOKEN_SECRET=9xK@2pM#5lQ$8vR&3yT!7wU%1sC^4nJ`
- **Security**: Store in secrets manager

#### `JWT_SECRET`
- **Purpose**: Secret key for JWT signing (if using JWT instead of sessions)
- **Type**: `String`
- **Required**: No (if using Clerk for auth)
- **Length**: Minimum 32 characters
- **Example**: `JWT_SECRET=Mx4nP7#2vL@9yQ$1kR&8sT!5wU%3xC^6`
- **Security**: Rotate every 90 days in production

---

### Feature Flags

#### `FEATURE_MESSAGING_ENABLED`
- **Purpose**: Enable/disable message board feature
- **Type**: `Boolean`
- **Default**: `true`
- **Example**: `FEATURE_MESSAGING_ENABLED=true`

#### `FEATURE_VIDEO_CALLS_ENABLED`
- **Purpose**: Enable/disable Zoom-like video calls
- **Type**: `Boolean`
- **Default**: `true`
- **Example**: `FEATURE_VIDEO_CALLS_ENABLED=true`

#### `FEATURE_MEDIA_UPLOAD_ENABLED`
- **Purpose**: Enable/disable photo/video uploads
- **Type**: `Boolean`
- **Default**: `true`
- **Example**: `FEATURE_MEDIA_UPLOAD_ENABLED=true`

#### `FEATURE_STREAMING_ENABLED`
- **Purpose**: Enable/disable streaming theater
- **Type**: `Boolean`
- **Default**: `true`
- **Example**: `FEATURE_STREAMING_ENABLED=true`

#### `FEATURE_WEATHER_ENABLED`
- **Purpose**: Enable/disable weather widget
- **Type**: `Boolean`
- **Default**: `true`
- **Example**: `FEATURE_WEATHER_ENABLED=true`

---

## Security Considerations

### Secret Storage

**Development**:
```bash
# Create .env.local (never commit)
cp .env.example .env.local
# Edit .env.local with real values
```

**Staging/Production**:
```bash
# Use GitHub Secrets
# Use AWS Secrets Manager
# Use Vault
# Use 1Password/LastPass
```

### Access Control

| Role | Access |
|------|--------|
| Developers | `.env.local` for development, no production secrets |
| DevOps | All secrets, rotation procedures |
| CI/CD System | Only required secrets for deployment |
| Admins | Audit logs of secret access |

### Principle of Least Privilege

```bash
# ✗ WRONG - Root credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

# ✓ CORRECT - Dedicated IAM user with S3-only access
AWS_ACCESS_KEY_ID=AKIAI4XAMPLE2BUCKET
```

---

## Rotation Policies

### Rotation Schedule

| Secret | Frequency | Impact | Procedure |
|--------|-----------|--------|-----------|
| `DB_PASSWORD` | Every 90 days | Requires deployment | Update .env, test, deploy |
| `CLERK_SECRET_KEY` | Every 90 days | Auth interruption | Generate new key, update, no downtime |
| `S3_SECRET_ACCESS_KEY` | Every 90 days | Storage access | Generate new key, update, no downtime |
| `REDIS_PASSWORD` | Every 90 days | Cache restart | Update, restart Redis connection |
| `SESSION_SECRET` | Every 6 months | Session invalidation | All users re-authenticate |
| `JWT_SECRET` | Every 90 days | Token invalidation | All API clients need new tokens |

### Rotation Procedure

```bash
#!/bin/bash
# Rotate database password (example)

OLD_PASSWORD="current_password"
NEW_PASSWORD="$(openssl rand -hex 16)"

echo "Generating new password: $NEW_PASSWORD"

# 1. Update PostgreSQL user password
psql -U postgres -h localhost << EOF
ALTER USER family_hub WITH PASSWORD '$NEW_PASSWORD';
EOF

# 2. Update environment variable
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$NEW_PASSWORD/" .env.local

# 3. Restart application (if needed)
docker-compose restart app

# 4. Verify connection
psql "postgresql://family_hub:$NEW_PASSWORD@localhost:5432/family_hub" -c "SELECT NOW();"

echo "✓ Password rotation complete"
```

---

## Per-Environment Setup

### Development

```bash
cp .env.example .env.local

# Edit .env.local
NODE_ENV=development
APP_PORT=3000
DATABASE_URL=postgresql://family_hub:password@localhost:5432/family_hub
REDIS_URL=redis://localhost:6379
STORAGE_TYPE=local
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Staging

Use GitHub Secrets or AWS Secrets Manager:

```bash
# In GitHub Actions workflow
env:
  NODE_ENV: staging
  DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}
  CLERK_SECRET_KEY: ${{ secrets.STAGING_CLERK_SECRET_KEY }}
```

### Production

```bash
# Use AWS Secrets Manager or Vault
aws secretsmanager get-secret-value --secret-id family-hub/prod --query SecretString --output text

# Or use environment variables from deployment platform
NODE_ENV=production
DATABASE_URL=$PROD_DATABASE_URL
REDIS_URL=$PROD_REDIS_URL
```

---

## Validation & Testing

### Startup Validation

The application validates required environment variables on startup:

```bash
bun run dev

# If variables missing:
# ✗ Error: Missing required environment variable: DATABASE_URL
# ✗ Error: Invalid DATABASE_URL format
```

### Manual Validation

```bash
# Check if all required variables are set
./scripts/validate-env.sh

# Output:
# ✓ NODE_ENV=production
# ✓ DATABASE_URL=postgresql://...
# ✓ CLERK_PUBLISHABLE_KEY=pk_test_...
# ✗ SENTRY_DSN missing (optional)
```

### Testing Changes

```bash
# Before committing environment changes
bun run dev

# Test critical flows
curl http://localhost:3000/health
curl http://localhost:3000/api/trpc/user.me

# Verify database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Verify Redis connectivity
redis-cli -u $REDIS_URL ping
```

---

## Troubleshooting

### "Missing required environment variable: DATABASE_URL"

```bash
# Verify .env.local exists
ls -la .env.local

# Check file permissions
cat .env.local | grep DATABASE_URL

# Ensure no typos
echo $DATABASE_URL  # Should print connection string
```

### "Connection refused" to database

```bash
# Verify database is running
docker-compose ps postgres

# Start if not running
docker-compose up -d postgres

# Test connection manually
psql $DATABASE_URL -c "SELECT NOW();"
```

### "Authentication failed" to Clerk

```bash
# Verify keys are correct
echo $CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY

# Test in Clerk Dashboard
# Settings → API Keys → Compare with your values

# If keys are wrong, get new ones from Clerk Dashboard
```

### "Invalid S3 credentials"

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Verify S3 bucket exists
aws s3 ls s3://$S3_BUCKET/

# Verify IAM permissions
aws iam get-user

# If permissions missing, attach S3 policy to IAM user
```

---

## Related Documentation

- [.env.example](./.env.example) - Template file with all variables
- [DEPLOYMENT.md](./.github/DEPLOYMENT.md) - Deployment guide
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Infrastructure setup
