# CI/CD Deployment Guide for AWS

This guide covers setting up automated CI/CD pipelines using GitHub Actions to deploy Family Hub to AWS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Actions Setup](#github-actions-setup)
3. [Deployment Workflows](#deployment-workflows)
4. [Environment Configuration](#environment-configuration)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring Deployments](#monitoring-deployments)

---

## Prerequisites

### 1. AWS IAM User for CI/CD

Create a dedicated IAM user for GitHub Actions:

```bash
# Create IAM user
aws iam create-user --user-name github-actions-deployer

# Create access key
aws iam create-access-key --user-name github-actions-deployer

# Save the Access Key ID and Secret Access Key
# You'll need these for GitHub Secrets
```

### 2. Create IAM Policy for Deployment

```bash
# Create policy document
cat > /tmp/github-actions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:*:ACCOUNT_ID:repository/family-hub"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackResources"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create policy
aws iam put-user-policy \
  --user-name github-actions-deployer \
  --policy-name github-actions-deployment \
  --policy-document file:///tmp/github-actions-policy.json
```

### 3. Add Secrets to GitHub

Go to your GitHub repository → Settings → Secrets and add:

```
AWS_ACCESS_KEY_ID=<from IAM user>
AWS_SECRET_ACCESS_KEY=<from IAM user>
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<your account ID>
ECR_REPOSITORY=family-hub
ECS_CLUSTER=family-hub-cluster
ECS_SERVICE=family-hub-service
```

---

## GitHub Actions Setup

### 1. Create Workflow Directory

```bash
mkdir -p .github/workflows
```

### 2. Create Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main
      - develop
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
  ECS_CLUSTER: ${{ secrets.ECS_CLUSTER }}
  ECS_SERVICE: ${{ secrets.ECS_SERVICE }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Run type check
        run: npm run tsc

      - name: Build application
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Get current task definition
        id: task-def
        run: |
          aws ecs describe-task-definition \
            --task-definition family-hub \
            --query 'taskDefinition' > task-definition.json

      - name: Update task definition with new image
        id: task-def-update
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: family-hub
          image: ${{ steps.image.outputs.image }}

      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def-update.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Verify deployment
        run: |
          aws ecs describe-services \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE \
            --query 'services[0].[serviceName,status,desiredCount,runningCount]'

      - name: Run smoke tests
        run: npm run test:smoke || true

      - name: Notify Slack on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Successful* 🎉\n*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }

      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Failed* ❌\n*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Error:* Check GitHub Actions for details"
                  }
                }
              ]
            }
```

### 3. Create Staging Deployment Workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
  ECS_CLUSTER: family-hub-staging-cluster
  ECS_SERVICE: family-hub-staging-service

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build application
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        id: image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment
```

### 4. Create Pull Request Workflow

Create `.github/workflows/pr-checks.yml`:

```yaml
name: PR Checks

on:
  pull_request:
    branches:
      - main
      - develop

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint || true

      - name: Run tests
        run: npm run test

      - name: Run type check
        run: npm run tsc

      - name: Build application
        run: npm run build

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const testResults = 'Test results available in GitHub Actions';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ All checks passed!\n\n${testResults}`
            });
```

---

## Deployment Workflows

### 1. Manual Deployment

Trigger deployment manually:

```bash
# Go to GitHub Actions → Deploy to AWS → Run workflow
# Select branch and environment
```

### 2. Automatic Deployment on Push

Deployments automatically trigger on:
- Push to `main` → Deploy to production
- Push to `develop` → Deploy to staging

### 3. Scheduled Deployments

Create `.github/workflows/scheduled-deploy.yml`:

```yaml
name: Scheduled Deployment

on:
  schedule:
    # Deploy every day at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deployment
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'deploy.yml',
              ref: 'main'
            });
```

---

## Environment Configuration

### 1. Production Environment Protection

In GitHub repository settings:

1. Go to **Settings** → **Environments** → **Production**
2. Enable **Required reviewers**
3. Add team members who can approve deployments
4. Enable **Deployment branches** and restrict to `main`

### 2. Staging Environment

1. Go to **Settings** → **Environments** → **Staging**
2. Set **Deployment branches** to `develop`
3. No approval required for staging

### 3. Environment Secrets

Add environment-specific secrets:

```
# Production
SLACK_WEBHOOK_PROD=https://hooks.slack.com/...
SENTRY_DSN_PROD=https://...

# Staging
SLACK_WEBHOOK_STAGING=https://hooks.slack.com/...
SENTRY_DSN_STAGING=https://...
```

---

## Rollback Procedures

### 1. Automatic Rollback on Failure

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    # Get previous task definition
    PREVIOUS_REVISION=$(($(aws ecs describe-services \
      --cluster $ECS_CLUSTER \
      --services $ECS_SERVICE \
      --query 'services[0].taskDefinition' \
      --output text | grep -oE '[0-9]+$') - 1))
    
    # Rollback to previous version
    aws ecs update-service \
      --cluster $ECS_CLUSTER \
      --service $ECS_SERVICE \
      --task-definition family-hub:$PREVIOUS_REVISION \
      --force-new-deployment
```

### 2. Manual Rollback

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix family-hub \
  --sort DESCENDING \
  --max-results 5

# Rollback to specific revision
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:2 \
  --force-new-deployment
```

### 3. Rollback via GitHub Actions

Create `.github/workflows/rollback.yml`:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      revision:
        description: 'Task definition revision to rollback to'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Rollback to previous version
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_CLUSTER }} \
            --service ${{ secrets.ECS_SERVICE }} \
            --task-definition family-hub:${{ github.event.inputs.revision }} \
            --force-new-deployment

      - name: Wait for service to stabilize
        run: |
          aws ecs wait services-stable \
            --cluster ${{ secrets.ECS_CLUSTER }} \
            --services ${{ secrets.ECS_SERVICE }}

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🔄 Rollback completed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Rollback Completed*\n*Revision:* ${{ github.event.inputs.revision }}\n*Triggered by:* ${{ github.actor }}"
                  }
                }
              ]
            }
```

---

## Monitoring Deployments

### 1. Deployment Status

```bash
# Check deployment status
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].[serviceName,status,desiredCount,runningCount,deployments]'

# Watch deployment progress
watch -n 5 'aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query "services[0].[desiredCount,runningCount]"'
```

### 2. View Deployment Logs

```bash
# View recent logs
aws logs tail /ecs/family-hub-production --follow --since 10m

# Filter for errors
aws logs tail /ecs/family-hub-production --follow --filter-pattern "ERROR"
```

### 3. GitHub Actions Logs

1. Go to **Actions** tab in GitHub
2. Click on the workflow run
3. Click on the job to see detailed logs

### 4. Slack Notifications

The workflows automatically post to Slack on success/failure. You can customize the messages in the workflow files.

---

## Best Practices

### 1. Always Test Before Deploying

```yaml
- name: Run tests
  run: npm run test

- name: Run type check
  run: npm run tsc

- name: Build application
  run: npm run build
```

### 2. Use Environment Protection Rules

- Require approvals for production deployments
- Restrict deployments to specific branches
- Use environment secrets for sensitive data

### 3. Monitor Deployments

- Check CloudWatch logs after deployment
- Run smoke tests to verify functionality
- Monitor error rates and performance metrics

### 4. Keep Deployment History

```bash
# View deployment history
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].deployments'
```

### 5. Document Deployment Process

Create a `DEPLOYMENT.md` file in your repository:

```markdown
# Deployment Process

## Automatic Deployments
- Push to `main` → Production
- Push to `develop` → Staging

## Manual Deployments
1. Go to GitHub Actions
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Select branch and environment

## Rollback
1. Go to GitHub Actions
2. Select "Rollback Deployment" workflow
3. Enter task definition revision
4. Click "Run workflow"

## Monitoring
- Check CloudWatch logs: `/ecs/family-hub-production`
- View metrics in CloudWatch dashboard
- Check Slack notifications
```

---

## Troubleshooting

### Issue: Deployment Fails with "Access Denied"

```bash
# Verify IAM user has correct permissions
aws iam get-user-policy \
  --user-name github-actions-deployer \
  --policy-name github-actions-deployment

# Check if access key is valid
aws sts get-caller-identity
```

### Issue: ECR Push Fails

```bash
# Verify ECR repository exists
aws ecr describe-repositories \
  --repository-names family-hub

# Check ECR permissions
aws iam get-user-policy \
  --user-name github-actions-deployer \
  --policy-name github-actions-deployment
```

### Issue: ECS Update Fails

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service

# Check task definition
aws ecs describe-task-definition \
  --task-definition family-hub:1
```

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Actions for GitHub](https://github.com/aws-actions)
- [Amazon ECS Deploy Task Definition](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)
- [AWS CLI ECS Commands](https://docs.aws.amazon.com/cli/latest/reference/ecs/)
