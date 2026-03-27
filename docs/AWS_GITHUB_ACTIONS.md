# GitHub Actions CI/CD Workflows for AWS Deployment

Complete guide for setting up automated CI/CD pipelines using GitHub Actions to deploy Family Hub to AWS.

## Overview

The CI/CD pipeline automates:
- **Code Quality**: Linting, type checking, testing
- **Build**: Docker image creation and ECR push
- **Deploy**: Automated deployment to staging/production
- **Monitoring**: Health checks and rollback on failure

### Workflow Branches

| Branch | Environment | Trigger | Deployment |
|--------|-------------|---------|-----------|
| `develop` | Staging | Push/PR merge | Automatic |
| `main` | Production | Push/PR merge | Automatic |
| `feature/*` | None | PR created | Tests only |

---

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### AWS Credentials
```
AWS_ACCESS_KEY_ID          # From IAM user
AWS_SECRET_ACCESS_KEY      # From IAM user
AWS_REGION                 # e.g., us-east-1
AWS_ACCOUNT_ID             # Your AWS account ID
```

### Application Secrets
```
CLERK_PUBLISHABLE_KEY      # Clerk public key
CLERK_SECRET_KEY           # Clerk secret key
STRIPE_SECRET_KEY          # Stripe secret key
PUSHER_APP_ID              # Pusher app ID
PUSHER_KEY                 # Pusher key
PUSHER_SECRET              # Pusher secret
PUSHER_CLUSTER             # Pusher cluster (e.g., mt1)
OPENWEATHER_API_KEY        # OpenWeather API key
```

### Deployment Configuration
```
ECR_REPOSITORY             # family-hub
ECS_CLUSTER_STAGING        # staging-family-hub-cluster
ECS_SERVICE_STAGING        # staging-family-hub-service
ECS_CLUSTER_PRODUCTION     # production-family-hub-cluster
ECS_SERVICE_PRODUCTION     # production-family-hub-service
SLACK_WEBHOOK_URL          # For notifications (optional)
```

---

## Test Workflow

Runs on every push and pull request to validate code quality:

```yaml
name: Test

on:
  push:
    branches: [main, develop, feature/**]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: family_hub_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Type check
        run: bun run typecheck
      
      - name: Lint
        run: bun run lint
      
      - name: Run tests
        run: bun run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/family_hub_test
      
      - name: Build
        run: bun run build
```

---

## Build and Push to ECR

Builds Docker image and pushes to ECR on successful tests:

```yaml
name: Build and Push to ECR

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

---

## Deploy to Staging

Deploys to staging environment on develop branch:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_CLUSTER_STAGING }} \
            --service ${{ secrets.ECS_SERVICE_STAGING }} \
            --force-new-deployment \
            --region ${{ secrets.AWS_REGION }}
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ secrets.ECS_CLUSTER_STAGING }} \
            --services ${{ secrets.ECS_SERVICE_STAGING }} \
            --region ${{ secrets.AWS_REGION }}
      
      - name: Health check
        run: |
          for i in {1..30}; do
            if curl -f http://staging.familyhub.example.com/health; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i/30 - waiting for service to be healthy..."
            sleep 10
          done
          
          echo "Health check failed"
          exit 1
```

---

## Deploy to Production

Deploys to production environment on main branch with approval:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://familyhub.example.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_CLUSTER_PRODUCTION }} \
            --service ${{ secrets.ECS_SERVICE_PRODUCTION }} \
            --force-new-deployment \
            --region ${{ secrets.AWS_REGION }}
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ secrets.ECS_CLUSTER_PRODUCTION }} \
            --services ${{ secrets.ECS_SERVICE_PRODUCTION }} \
            --region ${{ secrets.AWS_REGION }}
      
      - name: Health check
        run: |
          for i in {1..30}; do
            if curl -f https://familyhub.example.com/health; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i/30 - waiting for service to be healthy..."
            sleep 10
          done
          
          echo "Health check failed"
          exit 1
```

---

## Rollback Workflow

Manual workflow to rollback to a previous deployment:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      task_definition:
        description: 'Task definition revision to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.event.inputs.environment }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Get cluster and service names
        id: env-config
        run: |
          if [ "${{ github.event.inputs.environment }}" = "production" ]; then
            echo "CLUSTER=${{ secrets.ECS_CLUSTER_PRODUCTION }}" >> $GITHUB_OUTPUT
            echo "SERVICE=${{ secrets.ECS_SERVICE_PRODUCTION }}" >> $GITHUB_OUTPUT
          else
            echo "CLUSTER=${{ secrets.ECS_CLUSTER_STAGING }}" >> $GITHUB_OUTPUT
            echo "SERVICE=${{ secrets.ECS_SERVICE_STAGING }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Rollback to previous task definition
        run: |
          aws ecs update-service \
            --cluster ${{ steps.env-config.outputs.CLUSTER }} \
            --service ${{ steps.env-config.outputs.SERVICE }} \
            --task-definition ${{ github.event.inputs.task_definition }} \
            --region ${{ secrets.AWS_REGION }}
      
      - name: Wait for rollback
        run: |
          aws ecs wait services-stable \
            --cluster ${{ steps.env-config.outputs.CLUSTER }} \
            --services ${{ steps.env-config.outputs.SERVICE }} \
            --region ${{ secrets.AWS_REGION }}
```

---

## Best Practices

1. **Always test in staging first** - Deploy to staging before production
2. **Use branch protection rules** - Require PR reviews before merging
3. **Monitor deployments** - Watch CloudWatch logs and metrics
4. **Keep secrets secure** - Use GitHub Secrets, never commit credentials
5. **Document changes** - Update CHANGELOG.md with deployment notes
6. **Plan rollback** - Always have a rollback strategy ready
7. **Test health checks** - Ensure /health endpoint works correctly

---

**Last Updated**: 2024-03-22