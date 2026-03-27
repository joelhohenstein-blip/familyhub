# ⚡ FamilyHub Quick Reference Guide

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2024

---

## 🚀 Quick Start Commands

### Development
```bash
# Start dev server
bun run dev

# Run tests
bun test

# Type check
bun run typecheck

# Format code
bun run format

# Lint code
bun run lint
```

### Database
```bash
# Apply migrations
bun run db:push

# Pull schema
bun run db:pull

# Open Drizzle Studio
bun run db:studio

# Seed database
bun run db:seed
```

### Build & Deploy
```bash
# Build for production
bun run build

# Start production server
bun run start

# Build Docker image
docker build -t familyhub:v1.0.0 .

# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Deploy to production
kubectl set image deployment/familyhub familyhub=your-registry/familyhub:v1.0.0
```

---

## 📁 Project Structure

```
familyhub/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   ├── api/                # API client
│   └── styles/             # Global styles
├── server/
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic
│   ├── db/                 # Database
│   └── webhooks/           # Webhook handlers
├── public/                 # Static assets
├── docs/                   # Documentation
├── tests/                  # Test files
├── docker/                 # Docker files
├── k8s/                    # Kubernetes manifests
└── package.json            # Dependencies
```

---

## 🔑 Environment Variables

### Required (Development)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://localhost:5432/familyhub
VITE_APP_URL=http://localhost:3000
```

### Optional (Development)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
VITE_PUSHER_APP_KEY=...
PUSHER_APP_ID=...
PUSHER_SECRET=...
```

### Production
See `.env.example` and [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

## 🔗 Important URLs

### Development
- **App**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Drizzle Studio**: http://localhost:3001

### Production
- **App**: https://familyhub.app
- **API**: https://api.familyhub.app
- **Status**: https://status.familyhub.app
- **Docs**: https://docs.familyhub.app

### External Services
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Pusher Dashboard**: https://dashboard.pusher.com
- **Google Cloud Console**: https://console.cloud.google.com

---

## 📊 Key Metrics

### Performance Targets
- **Response Time**: <200ms (p95)
- **Error Rate**: <0.1%
- **Uptime**: 99.9%+
- **Database Query**: <50ms (p95)

### User Metrics
- **Signup Conversion**: >5%
- **30-day Retention**: >60%
- **Feature Adoption**: >80%
- **Pro Conversion**: >10%

---

## 🔐 Security Checklist

### Before Deployment
- [ ] All secrets in environment variables
- [ ] HTTPS/TLS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Security headers configured
- [ ] 2FA enabled for admin accounts

### Regular Maintenance
- [ ] Weekly: Check error logs
- [ ] Weekly: Monitor performance metrics
- [ ] Monthly: Security audit
- [ ] Monthly: Database optimization
- [ ] Quarterly: Dependency updates
- [ ] Quarterly: Security assessment

---

## 🐛 Troubleshooting

### Dev Server Won't Start
```bash
# Check if port 3000 is in use
fuser 3000/tcp

# Kill process on port 3000
fuser -k 3000/tcp

# Start dev server
bun run dev
```

### Database Connection Error
```bash
# Check database is running
psql -h localhost -U postgres -d familyhub -c "SELECT 1"

# Check connection string
echo $DATABASE_URL

# Run migrations
bun run db:push
```

### High Error Rate
```bash
# Check logs
kubectl logs deployment/familyhub

# Check database performance
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://familyhub.app/health
```

### Real-time Features Not Working
```bash
# Check Pusher connection
curl -X POST https://api.pusher.com/apps/$PUSHER_APP_ID/channels/test-channel/events

# Check WebSocket
wscat -c wss://familyhub.app/ws

# Check logs
kubectl logs deployment/familyhub | grep pusher
```

---

## 📚 Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| **README.md** | Project overview | Everyone |
| **USER_GUIDE.md** | How to use FamilyHub | End users |
| **API_DOCUMENTATION.md** | API reference | Developers |
| **DEPLOYMENT_GUIDE.md** | How to deploy | DevOps/Ops |
| **LAUNCH_CHECKLIST.md** | Pre-launch verification | Product/Ops |
| **PROJECT_SUMMARY.md** | Project overview | Leadership |
| **QUICK_REFERENCE.md** | Quick commands | Developers |

---

## 🎯 Common Tasks

### Adding a New Feature
1. Create a story in the architecture
2. Create a feature branch
3. Implement the feature
4. Write tests
5. Submit a pull request
6. Code review and merge
7. Deploy to staging
8. Deploy to production

### Deploying to Production
1. Create database backup
2. Build Docker image
3. Push to registry
4. Update Kubernetes deployment
5. Run migrations
6. Verify deployment
7. Monitor error rates

### Scaling the Application
1. Increase replica count: `kubectl scale deployment familyhub --replicas=5`
2. Monitor resource usage: `kubectl top pods`
3. Add database read replicas
4. Configure caching (Redis)
5. Setup CDN for static assets

### Monitoring & Alerting
1. Check Prometheus metrics
2. View Grafana dashboards
3. Review alert rules
4. Configure notification channels
5. Test alert routing

---

## 🔄 Release Process

### Version Numbering
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

### Release Steps
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Build and push Docker image
6. Deploy to production
7. Announce release

---

## 💡 Tips & Tricks

### Development
- Use `bun run dev` for HMR (Hot Module Replacement)
- Use `bun run typecheck` to catch type errors early
- Use `bun test --watch` for test-driven development
- Use `bun run format` to auto-format code

### Database
- Use `bun run db:studio` to visualize data
- Use `EXPLAIN ANALYZE` to optimize queries
- Create indexes for frequently queried columns
- Monitor slow queries with `pg_stat_statements`

### Performance
- Use React DevTools to profile components
- Use Lighthouse to audit performance
- Use Chrome DevTools to monitor network
- Use `curl -w` to measure response times

### Debugging
- Use `console.log()` for quick debugging
- Use VS Code debugger for step-through debugging
- Use browser DevTools for frontend debugging
- Use `kubectl logs` for production debugging

---

## 📞 Support & Escalation

### Quick Links
- **Slack**: #familyhub-dev
- **GitHub Issues**: github.com/familyhub/familyhub/issues
- **Email**: dev-support@familyhub.app
- **On-Call**: Check PagerDuty schedule

### Escalation Path
1. **Tier 1**: Team member (immediate)
2. **Tier 2**: Tech lead (within 1 hour)
3. **Tier 3**: Engineering manager (within 4 hours)
4. **Tier 4**: Director (within 24 hours)

---

## 🎓 Learning Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/)
- [DBeaver](https://dbeaver.io/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Courses
- [React Course](https://react.dev/learn)
- [TypeScript Course](https://www.typescriptlang.org/docs/handbook/)
- [PostgreSQL Course](https://www.postgresql.org/docs/current/tutorial.html)
- [Docker Course](https://docs.docker.com/get-started/)

---

## ✅ Pre-Launch Checklist

### Week Before Launch
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Security audit complete
- [ ] Load testing done
- [ ] Staging deployment verified
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Monitoring configured

### Launch Day
- [ ] Database backup created
- [ ] Production deployment ready
- [ ] Team on standby
- [ ] Monitoring active
- [ ] Support channels open
- [ ] Communication plan ready

### Post-Launch
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Plan hotfixes
- [ ] Celebrate! 🎉

---

## 🚨 Emergency Procedures

### Application Down
1. Check status page
2. Check error logs: `kubectl logs deployment/familyhub`
3. Check database: `psql -h prod-db.example.com -U postgres -d familyhub -c "SELECT 1"`
4. Restart deployment: `kubectl rollout restart deployment/familyhub`
5. If still down, rollback: `kubectl rollout undo deployment/familyhub`

### Database Down
1. Check database status
2. Check disk space: `df -h`
3. Check connections: `psql -c "SELECT count(*) FROM pg_stat_activity;"`
4. Restart database service
5. Restore from backup if needed

### High Error Rate
1. Check error logs
2. Check database performance
3. Check API response times
4. Scale up replicas if needed
5. Investigate root cause

### Security Incident
1. Isolate affected systems
2. Notify security team
3. Preserve logs and evidence
4. Communicate with users
5. Implement fixes
6. Post-incident review

---

## 📋 Useful Commands

### Kubernetes
```bash
# Get pods
kubectl get pods -l app=familyhub

# View logs
kubectl logs deployment/familyhub -f

# Execute command
kubectl exec -it deployment/familyhub -- bun run db:push

# Scale deployment
kubectl scale deployment familyhub --replicas=5

# Rollout status
kubectl rollout status deployment/familyhub

# Rollback
kubectl rollout undo deployment/familyhub
```

### Docker
```bash
# Build image
docker build -t familyhub:v1.0.0 .

# Run container
docker run -p 3000:3000 familyhub:v1.0.0

# Push to registry
docker push your-registry/familyhub:v1.0.0

# View logs
docker logs container-id
```

### Database
```bash
# Connect to database
psql -h localhost -U postgres -d familyhub

# Run query
psql -h localhost -U postgres -d familyhub -c "SELECT * FROM families;"

# Backup database
pg_dump -h localhost -U postgres familyhub > backup.sql

# Restore database
psql -h localhost -U postgres familyhub < backup.sql
```

---

## 🎯 Next Steps

1. **This Week**: Complete environment setup
2. **Next Week**: Deploy to staging
3. **Week 3**: Deploy to production
4. **Week 4+**: Monitor and iterate

---

**Status**: 🟢 **READY FOR LAUNCH**

**Questions?** Contact the team on Slack or email dev-support@familyhub.app

---

*Last Updated: 2024*  
*Version: 1.0.0*
