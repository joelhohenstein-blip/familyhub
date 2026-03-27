# Family Hub - AWS Deployment Documentation

Complete guide for deploying and managing Family Hub on Amazon Web Services (AWS).

## 📚 Documentation Index

### Getting Started
- **[AWS Quick Start](AWS_QUICK_START.md)** - Deploy in 30 minutes
- **[AWS Deployment Guide](DEPLOY_AWS.md)** - Comprehensive step-by-step guide

### Configuration
- **[Environment Variables](AWS_ENV_VARIABLES.md)** - Configure secrets and settings
- **[CloudFormation Template](../infrastructure/cloudformation-template.yaml)** - Infrastructure as Code

### Operations
- **[Monitoring & Troubleshooting](AWS_MONITORING.md)** - CloudWatch, logs, alarms
- **[Cost Optimization](AWS_COST_OPTIMIZATION.md)** - Reduce AWS spending
- **[CI/CD Deployment](AWS_CI_CD.md)** - GitHub Actions automation

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
```bash
# Install AWS CLI
brew install awscli

# Configure credentials
aws configure

# Verify setup
aws sts get-caller-identity
```

### Deploy Infrastructure
```bash
# Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export DOMAIN_NAME=familyhub.example.com

# Deploy with CloudFormation
aws cloudformation create-stack \
  --stack-name family-hub-production \
  --template-body file://infrastructure/cloudformation-template.yaml \
  --parameters \
    ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
    ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name family-hub-production
```

### Deploy Application
```bash
# Build and push Docker image
docker build -t family-hub:latest .
docker tag family-hub:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Deploy to ECS
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --force-new-deployment
```

For detailed instructions, see [AWS Quick Start](AWS_QUICK_START.md).

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Route53 DNS                          │
│                   (familyhub.example.com)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    CloudFront CDN                           │
│              (Global Content Distribution)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Load Balancer                 │
│                    (ECS Service Port 3000)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    ECS Cluster (Fargate)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ECS Task 1   │  │ ECS Task 2   │  │ ECS Task 3   │      │
│  │ (Container)  │  │ (Container)  │  │ (Container)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────┐
│  RDS PostgreSQL│ │  ElastiCache  │ │  S3 (Static)   │
│   (Primary +   │ │    (Redis)    │ │   (Assets)     │
│   Standby)     │ │               │ │                │
└────────────────┘ └───────────────┘ └────────────────┘
```

---

## 🔧 AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **ECS Fargate** | Container orchestration | 2-10 tasks, 512 CPU, 1GB RAM |
| **RDS PostgreSQL** | Database | db.t3.medium, 100GB, Multi-AZ |
| **Application Load Balancer** | Load balancing | HTTP/HTTPS, health checks |
| **CloudFront** | CDN | Global distribution, caching |
| **Route53** | DNS | Domain management |
| **ACM** | SSL/TLS certificates | HTTPS encryption |
| **CloudWatch** | Monitoring | Logs, metrics, alarms |
| **Parameter Store** | Secrets management | Encrypted configuration |
| **ECR** | Container registry | Docker image storage |
| **S3** | Object storage | Static assets, backups |
| **NAT Gateway** | Network | Private subnet internet access |

---

## 📊 Cost Estimation

### Monthly Costs (Production)

| Service | Configuration | Cost |
|---------|---------------|------|
| ECS Fargate | 2 tasks × 512 CPU, 1GB | $30-50 |
| RDS PostgreSQL | db.t3.medium, 100GB | $50-80 |
| ALB | 1 ALB | $15-20 |
| NAT Gateway | 1 NAT, ~100GB data | $30-45 |
| Data Transfer | ~100GB outbound | $10-20 |
| CloudWatch | Logs, metrics | $5-10 |
| Route53 | Hosted zone | $1-5 |
| S3 | Assets, backups | $5-10 |
| Miscellaneous | Secrets, snapshots | $5-10 |
| **TOTAL** | | **$151-250** |

**Optimization potential**: 40% savings with Reserved Instances and Spot instances.

See [Cost Optimization Guide](AWS_COST_OPTIMIZATION.md) for details.

---

## 🔐 Security Features

### Network Security
- ✅ VPC with public/private subnets
- ✅ Security groups with least privilege
- ✅ NAT Gateway for private subnet internet access
- ✅ VPC Flow Logs for network monitoring

### Data Security
- ✅ RDS encryption at rest
- ✅ Encrypted secrets in Parameter Store
- ✅ SSL/TLS for data in transit
- ✅ S3 bucket encryption

### Access Control
- ✅ IAM roles and policies
- ✅ Least privilege principle
- ✅ CloudTrail audit logging
- ✅ MFA for AWS console access

### Application Security
- ✅ Health checks on ALB
- ✅ Auto-scaling for resilience
- ✅ Multi-AZ RDS for high availability
- ✅ Automated backups and snapshots

---

## 📈 Monitoring and Alerts

### CloudWatch Metrics
- ECS CPU/Memory utilization
- RDS CPU/connections/storage
- ALB request count/response time
- Application error rates

### Alarms
- High CPU (>80%)
- High memory (>80%)
- Low RDS storage (<10GB)
- Unhealthy targets
- High error rate (>10 5XX errors)

### Logs
- ECS application logs: `/ecs/family-hub-production`
- RDS error logs: `/aws/rds/instance/family-hub-db/error`
- VPC Flow Logs: `/aws/vpc/flowlogs`

See [Monitoring Guide](AWS_MONITORING.md) for detailed setup.

---

## 🚢 Deployment Methods

### 1. Manual Deployment (Quick Start)
```bash
./scripts/deploy-aws.sh --environment production
```

### 2. Automated CI/CD (GitHub Actions)
Push to `main` branch → Automatic production deployment
Push to `develop` branch → Automatic staging deployment

See [CI/CD Guide](AWS_CI_CD.md) for setup.

### 3. CloudFormation (Infrastructure)
```bash
aws cloudformation create-stack \
  --stack-name family-hub-production \
  --template-body file://infrastructure/cloudformation-template.yaml
```

---

## 🔄 Deployment Workflow

### Development
1. Create feature branch
2. Make changes and test locally
3. Push to GitHub
4. GitHub Actions runs tests
5. Create Pull Request
6. Code review and approval

### Staging
1. Merge to `develop` branch
2. GitHub Actions deploys to staging
3. QA testing
4. Verify in staging environment

### Production
1. Create Pull Request from `develop` to `main`
2. Code review and approval
3. Merge to `main` branch
4. GitHub Actions deploys to production
5. Monitor CloudWatch logs and metrics

---

## 🛠️ Common Tasks

### View Application Logs
```bash
aws logs tail /ecs/family-hub-production --follow
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service
```

### Scale Service
```bash
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --desired-count 4
```

### Rollback Deployment
```bash
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:2 \
  --force-new-deployment
```

### Create Database Backup
```bash
aws rds create-db-snapshot \
  --db-instance-identifier family-hub-db \
  --db-snapshot-identifier family-hub-backup-$(date +%Y%m%d)
```

### Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234EXAMPLE \
  --paths "/*"
```

---

## 🐛 Troubleshooting

### ECS Tasks Not Starting
```bash
# Check logs
aws logs tail /ecs/family-hub-production --follow

# Check task status
aws ecs describe-tasks \
  --cluster family-hub-cluster \
  --tasks <TASK_ARN>
```

### Database Connection Errors
```bash
# Test connection
psql -h <RDS_ENDPOINT> -U admin -d family_hub -c "SELECT NOW();"

# Check security group
aws ec2 describe-security-groups --filters "Name=group-name,Values=*rds*"
```

### High CPU/Memory Usage
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=family-hub-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

See [Monitoring Guide](AWS_MONITORING.md) for detailed troubleshooting.

---

## 📚 Documentation Files

### Deployment
- `DEPLOY_AWS.md` - Complete deployment guide (42KB)
- `AWS_QUICK_START.md` - 30-minute quick start (10KB)
- `AWS_ENV_VARIABLES.md` - Environment configuration (12KB)

### Operations
- `AWS_MONITORING.md` - Monitoring and troubleshooting (18KB)
- `AWS_COST_OPTIMIZATION.md` - Cost reduction strategies (15KB)
- `AWS_CI_CD.md` - GitHub Actions automation (18KB)

### Infrastructure
- `cloudformation-template.yaml` - IaC template (21KB)
- `deploy-aws.sh` - Deployment automation script (11KB)

---

## 🔗 External Resources

### AWS Documentation
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)

### Tools
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [AWS Management Console](https://console.aws.amazon.com/)
- [AWS Cost Calculator](https://calculator.aws/)

### Learning
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Best Practices](https://aws.amazon.com/architecture/best-practices/)
- [AWS Training](https://aws.amazon.com/training/)

---

## 👥 Team Roles and Responsibilities

### DevOps Engineer
- Infrastructure setup and maintenance
- Monitoring and alerting
- Backup and disaster recovery
- Cost optimization

### Application Developer
- Code changes and testing
- Local development setup
- Pull request reviews
- Smoke testing after deployment

### DevOps Lead
- Deployment approvals
- Security and compliance
- Incident response
- Documentation updates

---

## 📋 Pre-Deployment Checklist

- [ ] AWS account created and configured
- [ ] IAM users and roles created
- [ ] VPC and subnets configured
- [ ] RDS instance created and tested
- [ ] ECS cluster created
- [ ] Application Load Balancer configured
- [ ] Docker image built and pushed to ECR
- [ ] ECS task definition created
- [ ] ECS service deployed
- [ ] CloudFront distribution created
- [ ] Route53 DNS configured
- [ ] SSL certificate requested and validated
- [ ] CloudWatch alarms configured
- [ ] SNS notifications configured
- [ ] RDS backups configured
- [ ] Auto-scaling configured
- [ ] Security groups configured
- [ ] Environment variables configured
- [ ] Health checks verified
- [ ] Smoke tests passed
- [ ] Monitoring verified
- [ ] Team trained on procedures

---

## 🚨 Incident Response

### Service Down
1. Check CloudWatch alarms
2. View ECS task status
3. Check application logs
4. Verify database connectivity
5. Check ALB target health
6. Rollback if recent deployment
7. Notify team via Slack

### High CPU/Memory
1. Check CloudWatch metrics
2. Scale up service
3. Investigate application logs
4. Optimize code if needed
5. Monitor for resolution

### Database Issues
1. Check RDS status
2. Verify security groups
3. Check connections
4. Review slow query logs
5. Optimize queries if needed

### Network Issues
1. Check VPC Flow Logs
2. Verify security groups
3. Check NAT Gateway status
4. Verify DNS resolution
5. Check ALB health

---

## 📞 Support and Escalation

### Level 1 - Self Service
- Check CloudWatch logs
- Review monitoring dashboard
- Consult troubleshooting guide
- Check GitHub Actions logs

### Level 2 - Team
- Post in team Slack channel
- Create GitHub issue
- Request code review
- Ask for deployment approval

### Level 3 - AWS Support
- Open AWS Support ticket
- Contact AWS support team
- Escalate critical issues
- Request expert consultation

---

## 📝 Change Log

| Date | Change | Author |
|------|--------|--------|
| 2024-03-22 | Initial AWS deployment documentation | DevOps Team |
| | CloudFormation template created | |
| | CI/CD workflows configured | |
| | Monitoring and alerting setup | |

---

## 📄 License

This documentation is part of the Family Hub project and follows the same license.

---

## 🤝 Contributing

To update this documentation:

1. Create a feature branch
2. Make changes to documentation files
3. Submit a Pull Request
4. Get approval from DevOps Lead
5. Merge to main branch

---

**Last Updated**: 2024-03-22  
**Maintained By**: DevOps Team  
**Next Review**: 2024-06-22

For questions or issues, contact the DevOps team or create a GitHub issue.
