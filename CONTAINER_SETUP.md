# Container & Registry Setup Guide

Family Hub - Docker Container and Registry Configuration

## Table of Contents

1. [Overview](#overview)
2. [Local Development Setup](#local-development-setup)
3. [Docker Image Building](#docker-image-building)
4. [Container Registry](#container-registry)
5. [Docker Compose for Development](#docker-compose-for-development)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers:

- Building Docker images locally
- Running containers with docker-compose
- Pushing images to the registry
- Managing container lifecycle

### Why Docker?

✅ **Consistency**: Same environment everywhere (dev/staging/prod)
✅ **Isolation**: Applications don't interfere with each other
✅ **Scalability**: Easy to run multiple instances
✅ **CI/CD**: Automate builds and deployments
✅ **Reproducibility**: Anyone can run the exact same setup

### Prerequisites

- Docker (≥ 24.0) - [Install](https://docs.docker.com/get-docker/)
- Docker Compose (≥ 2.20) - Usually included with Docker Desktop
- Git
- Node.js 20+ (for local development without Docker)

**Check installation**:
```bash
docker --version
docker-compose --version
```

---

## Local Development Setup

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/family-hub/app.git
cd app

# 2. Create environment file
cp .env.example .env

# Edit .env with your values (optional for local dev)
nano .env

# 3. Start services
docker-compose up -d

# 4. Wait for services to be ready
docker-compose ps

# 5. Access application
# Open browser: http://localhost:3000
```

### What docker-compose Starts

| Service | Port | Purpose |
|---------|------|---------|
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache & WebSocket support |
| `app` | 3000 | React Router application |
| `adminer` | 8080 | Database admin UI |
| `redis-commander` | 8081 | Redis admin UI |

### Verify Services are Running

```bash
# Check all services
docker-compose ps

# Output should show all containers as "Up"
CONTAINER ID   IMAGE                    PORTS
abc123         family-hub-db           0.0.0.0:5432->5432/tcp
def456         redis:7                 0.0.0.0:6379->6379/tcp
ghi789         family-hub-app          0.0.0.0:3000->3000/tcp
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs -f app --tail=50
```

### Stop Services

```bash
# Stop without removing
docker-compose stop

# Stop and remove containers (data persists in volumes)
docker-compose down

# Stop, remove, and delete volumes (WARNING: loses data)
docker-compose down -v
```

---

## Docker Image Building

### Build Locally

```bash
# Build development image
docker build -t family-hub:dev .

# Build with specific target
docker build -t family-hub:dev --target builder .
docker build -t family-hub:prod --target final .

# Build without cache (for clean build)
docker build --no-cache -t family-hub:dev .
```

### Dockerfile Stages Explained

```dockerfile
# Stage 1: Builder
# - Full Node.js runtime
# - Development dependencies
# - Used for building application

# Stage 2: Production (final)
# - Minimal Node.js runtime
# - Only production dependencies
# - Smaller image size
```

**Stage size comparison**:
```
Builder stage:  ~600 MB (all dependencies)
Final stage:    ~200 MB (production only)
```

### Build Arguments

Customize builds with build arguments:

```bash
# Example: Build with specific Node version
docker build --build-arg NODE_VERSION=20-alpine .

# Custom application port
docker build -t family-hub:prod \
  --build-arg APP_PORT=3001 .
```

### View Image Details

```bash
# List local images
docker images | grep family-hub

# Show layers
docker image history family-hub:prod

# Inspect image
docker inspect family-hub:prod
```

---

## Container Registry

### Docker Hub (Public Registry)

Docker Hub is the default public registry. Free account required.

#### Setup

1. **Create account** at [hub.docker.com](https://hub.docker.com)

2. **Login locally**
   ```bash
   docker login
   # Username: [your-username]
   # Password: [personal-access-token or password]
   ```

3. **Tag image for Docker Hub**
   ```bash
   docker tag family-hub:prod [username]/family-hub:latest
   docker tag family-hub:prod [username]/family-hub:v1.0.0
   ```

4. **Push image**
   ```bash
   docker push [username]/family-hub:latest
   docker push [username]/family-hub:v1.0.0
   ```

5. **Pull image**
   ```bash
   docker pull [username]/family-hub:latest
   docker run -p 3000:3000 [username]/family-hub:latest
   ```

### GitHub Container Registry (ghcr.io)

Private registry integrated with GitHub. Recommended for private projects.

#### Setup

1. **Create GitHub Personal Access Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Select scope: `write:packages`
   - Copy token

2. **Login**
   ```bash
   echo "[YOUR_TOKEN]" | docker login ghcr.io -u [YOUR_USERNAME] --password-stdin
   ```

3. **Tag image**
   ```bash
   docker tag family-hub:prod ghcr.io/[username]/family-hub:latest
   docker tag family-hub:prod ghcr.io/[username]/family-hub:v1.0.0
   ```

4. **Push**
   ```bash
   docker push ghcr.io/[username]/family-hub:latest
   docker push ghcr.io/[username]/family-hub:v1.0.0
   ```

5. **Pull**
   ```bash
   docker pull ghcr.io/[username]/family-hub:latest
   ```

### Amazon ECR (AWS)

Enterprise registry with AWS integration.

```bash
# Authenticate with AWS
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  [account-id].dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag family-hub:prod \
  [account-id].dkr.ecr.us-east-1.amazonaws.com/family-hub:latest

# Push
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/family-hub:latest
```

### Image Tagging Strategy

```bash
# Semantic versioning
docker tag family-hub:prod myregistry/family-hub:1.0.0
docker tag family-hub:prod myregistry/family-hub:1.0
docker tag family-hub:prod myregistry/family-hub:latest

# Branch tracking
docker tag family-hub:prod myregistry/family-hub:main-abc123
docker tag family-hub:prod myregistry/family-hub:develop-def456

# Date tagging
docker tag family-hub:prod myregistry/family-hub:2024-02-07
```

---

## Docker Compose for Development

### File Structure

```bash
docker-compose.yml          # Main configuration
.env.example               # Template
.env                       # Local (DO NOT COMMIT)
```

### Services Configuration

#### PostgreSQL Database

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: family_hub
    POSTGRES_PASSWORD: password
    POSTGRES_DB: family_hub
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U family_hub"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Access database**:
```bash
# Via psql
psql postgresql://family_hub:password@localhost:5432/family_hub

# Via Adminer UI
# Open: http://localhost:8080
# Server: postgres
# Username: family_hub
# Password: password
# Database: family_hub
```

#### Redis Cache

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

**Access Redis**:
```bash
# Via CLI
redis-cli -h localhost -p 6379

# Via Redis Commander UI
# Open: http://localhost:8081
```

#### Application Service

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
    target: builder
  ports:
    - "3000:3000"
  environment:
    NODE_ENV: development
    DATABASE_URL: postgresql://family_hub:password@postgres:5432/family_hub
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
```

### Useful Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose stop

# Remove all services (keep volumes)
docker-compose down

# Remove everything (including volumes/data)
docker-compose down -v

# View logs
docker-compose logs -f

# Execute command in container
docker-compose exec app npm run typecheck

# Restart specific service
docker-compose restart app

# Build images
docker-compose build

# Force rebuild (no cache)
docker-compose build --no-cache
```

### Overriding Environment Variables

```bash
# Via .env file
DATABASE_URL=postgresql://...

# Via command line
docker-compose -e NODE_ENV=production up

# Via environment file
docker-compose --env-file .env.production up
```

### Network Communication

Services can communicate using service names:

```typescript
// From app, connect to postgres
const dbUrl = 'postgresql://family_hub:password@postgres:5432/family_hub';

// From app, connect to redis
const redisUrl = 'redis://redis:6379';
```

---

## Production Deployment

### Image Size Optimization

```bash
# Check image size
docker images family-hub

# REPOSITORY       TAG       SIZE
# family-hub       prod      200MB
# family-hub       dev       600MB

# Tips for smaller images:
# 1. Use Alpine Linux base
# 2. Multi-stage builds
# 3. Remove build dependencies
# 4. Clean npm cache
```

### Image Security

```bash
# Scan image for vulnerabilities
docker scan family-hub:prod

# Use non-root user in Dockerfile
USER nodejs

# Keep base image updated
FROM node:20-alpine  # Check for latest
```

### Running Container in Production

```bash
# Basic run
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NODE_ENV=production \
  family-hub:prod

# With health check
docker run \
  --health-cmd='curl -f http://localhost:3000/health || exit 1' \
  --health-interval=30s \
  --health-timeout=3s \
  -p 3000:3000 \
  family-hub:prod

# With resource limits
docker run \
  --memory=512m \
  --cpus=1 \
  -p 3000:3000 \
  family-hub:prod

# Graceful shutdown
docker stop --time=30 family-hub-app
# (Gives container 30 seconds to shut down)
```

### Docker Compose for Production

```bash
# Using docker-compose in production
docker-compose -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d

# This uses:
# - docker-compose.yml (base config)
# - docker-compose.prod.yml (production overrides)
```

**Example docker-compose.prod.yml**:
```yaml
version: '3.9'

services:
  app:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs [container-name]

# Run in foreground to see errors
docker run -it family-hub:dev

# Check Dockerfile
docker build --progress=plain -t test .
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or use different port
docker-compose -p family-hub-alt up -d
```

### Out of Disk Space

```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

### Slow Build

```bash
# Clear build cache
docker builder prune

# Build without cache
docker build --no-cache -t family-hub:dev .

# Check layer caching
docker image history family-hub:dev
```

### Docker Daemon Not Running

```bash
# Linux: Start Docker service
sudo systemctl start docker

# macOS: Open Docker Desktop application
# Or:
open -a Docker

# Windows: Open Docker Desktop
```

### Network Connection Issues

```bash
# Check if services can communicate
docker-compose exec app ping postgres

# Check DNS resolution
docker-compose exec app nslookup redis

# Inspect network
docker network inspect family-hub-network
```

---

## Best Practices

✅ **DO**:
- Use `.dockerignore` to exclude unnecessary files
- Use specific base image versions (not `latest`)
- Run as non-root user
- Include health checks
- Use multi-stage builds
- Keep images small
- Document exposed ports
- Pin dependency versions

❌ **DON'T**:
- Run as root
- Use `latest` tags in production
- Commit `.env` files
- Run multiple services in one container
- Store sensitive data in images
- Use large base images
- Ignore security warnings

---

## Further Reading

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Security](https://docs.docker.com/engine/security/)

---

**Last Updated**: February 7, 2024
**Maintained By**: DevOps Team
**Next Review**: February 21, 2024
