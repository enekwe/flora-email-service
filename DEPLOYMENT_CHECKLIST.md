# Flora Invitations Service - Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Variables Configuration

Ensure all required environment variables are set in Railway:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3015`
- [ ] `MONGODB_URI` (Use TCP proxy URL: `metro.proxy.rlwy.net:59998`)
- [ ] `JWT_SECRET` (Must match main Flora app)
- [ ] `BREVO_API_KEY`
- [ ] `BREVO_SENDER_EMAIL`
- [ ] `BREVO_SENDER_NAME`
- [ ] `FRONTEND_URL`
- [ ] `MAIN_APP_API_URL`
- [ ] `MAIN_APP_API_KEY`
- [ ] `CORS_ORIGINS`

### 2. Database Setup

- [ ] MongoDB database created: `flora_invitations`
- [ ] Database accessible via TCP proxy (NOT .railway.internal)
- [ ] Test connection from Railway environment
- [ ] Indexes will be created automatically on first run

### 3. Brevo Email Service Setup

- [ ] Brevo account created
- [ ] API key generated and verified
- [ ] Sender email verified in Brevo
- [ ] Test email sent successfully

### 4. Main App Integration

- [ ] Main Flora app API accessible from microservice
- [ ] Internal API key configured
- [ ] Test endpoints:
  - [ ] `GET /api/v1/users/:id`
  - [ ] `GET /api/v1/funds/:id`
  - [ ] `GET /api/v1/stakeholders/user/:userId`
  - [ ] `GET /api/v1/studio/companies/:id`

### 5. Code Quality

- [ ] All tests passing: `npm test`
- [ ] No TypeScript/ESLint errors
- [ ] Code follows Flora Development Rules
- [ ] All TODOs resolved or documented

### 6. Docker Build

- [ ] Dockerfile builds successfully: `docker build -t flora-invitations-service .`
- [ ] Image size optimized (<500MB)
- [ ] Health check configured
- [ ] Non-root user configured

## Deployment Steps

### 1. Create Railway Service

```bash
# Login to Railway
railway login

# Link to project
railway link

# Create new service
railway service create flora-invitations-service
```

### 2. Configure Environment Variables

```bash
# Set all environment variables in Railway dashboard
# Or use Railway CLI:
railway variables set MONGODB_URI="mongodb://..."
railway variables set JWT_SECRET="..."
# ... (repeat for all variables)
```

### 3. Deploy Service

```bash
# Deploy from local
railway up

# Or connect GitHub repo for auto-deploy
# Railway will detect Dockerfile and deploy automatically
```

### 4. Verify Deployment

- [ ] Service deployed successfully
- [ ] Health check passing: `GET https://flora-invitations-service.up.railway.app/health`
- [ ] Logs show successful MongoDB connection
- [ ] No error logs in Railway dashboard

### 5. Test API Endpoints

```bash
# Get JWT token from main app
export TOKEN="your-jwt-token"

# Test health
curl https://flora-invitations-service.up.railway.app/health

# Test create invitation (requires auth)
curl -X POST https://flora-invitations-service.up.railway.app/api/v1/invitations/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteeName": "Test User",
    "inviteeEmail": "test@example.com",
    "role": "lp",
    "invitationType": "platform"
  }'

# Test list invitations
curl https://flora-invitations-service.up.railway.app/api/v1/invitations \
  -H "Authorization: Bearer $TOKEN"
```

## Post-Deployment Verification

### 1. Functionality Tests

- [ ] Create invitation works
- [ ] Email sent successfully via Brevo
- [ ] List invitations with pagination works
- [ ] Get invitation by ID works
- [ ] Resend invitation works
- [ ] Revoke invitation works
- [ ] Context resolution works (GP, LP, Founder)
- [ ] Proper email template selected

### 2. Integration Tests

- [ ] Main app can call invitation service
- [ ] Invitation service can call main app APIs
- [ ] JWT authentication works between services
- [ ] CORS configured correctly for frontend

### 3. Monitoring Setup

- [ ] Railway metrics dashboard configured
- [ ] Error alerts configured
- [ ] Log aggregation working
- [ ] Health check endpoint monitored

### 4. Performance Verification

- [ ] Response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] Context caching working
- [ ] Email sending async and non-blocking
- [ ] Rate limiting working

## Security Checklist

- [ ] JWT_SECRET secured and not exposed
- [ ] Brevo API key secured
- [ ] Internal API keys secured
- [ ] No sensitive data in logs
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] RBAC enforced on all endpoints

## Rollback Plan

If deployment fails:

1. **Check Logs**: Review Railway logs for errors
2. **Verify Environment**: Check all environment variables
3. **Database Connection**: Test MongoDB connectivity
4. **Rollback**: Revert to previous Railway deployment
5. **Main App**: Ensure main app continues to work independently

### Rollback Commands

```bash
# List deployments
railway deployments list

# Rollback to previous
railway deployments rollback <deployment-id>
```

## Integration with Main Flora App

### 1. Update Main App Environment

Add to main Flora app environment variables:

```env
INVITATIONS_SERVICE_URL=https://flora-invitations-service.up.railway.app
INVITATIONS_SERVICE_API_KEY=your-internal-api-key
```

### 2. Update Frontend

Add to frontend environment variables:

```env
VITE_INVITATIONS_API_URL=https://flora-invitations-service.up.railway.app
```

### 3. Client Integration

Create client in main app:

```javascript
// services/integrations/invitationsClient.js
import apiClient from '../api/apiClient';

const INVITATIONS_SERVICE_URL = process.env.INVITATIONS_SERVICE_URL;

export const invitationsClient = {
  async createInvitation(data) {
    const response = await apiClient.post(
      `${INVITATIONS_SERVICE_URL}/api/v1/invitations/create`,
      data
    );
    return response.data;
  },

  async listInvitations(filters) {
    const response = await apiClient.get(
      `${INVITATIONS_SERVICE_URL}/api/v1/invitations`,
      { params: filters }
    );
    return response.data;
  }
};
```

## Maintenance

### Regular Tasks

- [ ] Monitor error logs daily
- [ ] Review invitation metrics weekly
- [ ] Expire old invitations (automated cron)
- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly

### Monitoring Queries

```bash
# Check recent invitations
curl -H "Authorization: Bearer $TOKEN" \
  "https://flora-invitations-service.up.railway.app/api/v1/invitations?limit=10"

# Check statistics
curl -H "Authorization: Bearer $TOKEN" \
  "https://flora-invitations-service.up.railway.app/api/v1/invitations/stats"

# Expire old invitations (admin only)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://flora-invitations-service.up.railway.app/api/v1/invitations/expire-old"
```

## Success Criteria

Deployment is successful when:

- [ ] All health checks passing
- [ ] All API endpoints responding correctly
- [ ] Email delivery working via Brevo
- [ ] Context resolution working for all sender types
- [ ] RBAC enforced correctly
- [ ] Audit logging working
- [ ] No errors in logs
- [ ] Performance metrics acceptable
- [ ] Integration with main app working
- [ ] Frontend can access service

## Support Contacts

- **DevOps**: devops@passbook.vc
- **Backend Lead**: backend@passbook.vc
- **Brevo Support**: https://help.brevo.com
- **Railway Support**: https://railway.app/help

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Verified By**: _________________
