# Flora Email Service - Railway Deployment Guide

**Service Name:** flora-email-service
**Date:** 2026-07-17
**Status:** Ready for Deployment

---

## Prerequisites

- [x] Service renamed from flora-invitations-service to flora-email-service
- [x] Git submodule configuration updated
- [x] Package.json updated
- [x] Railway account with access to passbook-flora project
- [x] Railway CLI installed: `npm install -g @railway/cli`

---

## Deployment Strategy: Blue-Green Deployment

We'll use a blue-green deployment strategy to ensure zero downtime:

### Blue-Green Deployment Steps

1. **Keep existing service running** (flora-invitations-service-production)
2. **Deploy new service** (flora-email-service-production)
3. **Test new service** thoroughly
4. **Switch traffic** from old to new
5. **Monitor** for issues
6. **Rollback** if needed (keep old service for 24h)

---

## Step 1: Create New Railway Service

### Option A: Using Railway Dashboard (Recommended)

1. Go to Railway Dashboard: https://railway.app
2. Open your project: **passbook-flora**
3. Click **+ New Service**
4. Select **GitHub Repo**
5. Choose repository: `flora-email-service`
6. Service name: `flora-email-service-production`

### Option B: Using Railway CLI

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service
railway login
railway link  # Link to passbook-flora project
railway service create flora-email-service-production
```

---

## Step 2: Configure Build Settings

### In Railway Dashboard

1. Go to **flora-email-service-production** → Settings
2. **Build Settings:**
   - Builder: `DOCKERFILE`
   - Dockerfile Path: `Dockerfile`
   - Build Command: (leave empty, Dockerfile handles it)
3. **Deploy Settings:**
   - Start Command: `node src/server.js`
   - Health Check Path: `/health`
   - Health Check Timeout: 100s
   - Restart Policy: `ON_FAILURE`
   - Max Retries: 10

### Verify railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node src/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Step 3: Set Environment Variables

### Get Required Values from Existing Service

```bash
# Login to Railway
railway login

# Link to passbook-flora project
cd /Users/cope/Passbook_Oracle
railway link

# Get values from main app
railway variables --service passbook-flora | grep -E "JWT_SECRET|BREVO_API_KEY|MONGODB_URI|INVITATIONS_SERVICE_API_KEY"
```

### Set Variables in New Service

#### Method 1: Railway Dashboard

1. Go to **flora-email-service-production** → Variables
2. Click **+ New Variable** for each:

```bash
# Service Configuration
NODE_ENV=production
PORT=3016
SERVICE_NAME=flora-email-service
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true

# Database (CRITICAL - Copy from MongoDB service or passbook-flora)
MONGODB_URI=<paste-from-mongodb-service>

# JWT (CRITICAL - Must match main app)
JWT_SECRET=<paste-from-passbook-flora>
JWT_EXPIRES_IN=7d

# Brevo Email (CRITICAL - Copy from passbook-flora)
BREVO_API_KEY=<paste-from-passbook-flora>
BREVO_API_URL=https://api.brevo.com/v3
BREVO_SENDER_EMAIL=flora@passbook.vc
BREVO_SENDER_NAME=Passbook Flora

# Service-to-Service Auth (CRITICAL)
MAIN_APP_API_KEY=<paste-from-passbook-flora-INVITATIONS_SERVICE_API_KEY>

# External URLs
FRONTEND_URL=https://flora.passbook.vc
MAIN_APP_API_URL=https://api.flora.passbook.vc

# Rate Limiting
MAX_INVITATIONS_PER_HOUR=100
TOKEN_EXPIRATION_DAYS=7

# CORS
ALLOWED_ORIGINS=https://flora.passbook.vc,https://api.flora.passbook.vc

# Feature Flags
ENABLE_INVITATION_EMAILS=true
ENABLE_AUTH_EMAILS=true
ENABLE_CAPITAL_CALL_EMAILS=true
ENABLE_DOCUMENT_EMAILS=true
ENABLE_NOTIFICATION_EMAILS=true
```

#### Method 2: Railway CLI

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service
railway link --service flora-email-service-production

# Set variables one by one
railway variables --set NODE_ENV=production
railway variables --set PORT=3016
railway variables --set SERVICE_NAME=flora-email-service
# ... (continue for all variables)
```

#### Method 3: Bulk Import (Fastest)

1. Create `.env.railway` file (DO NOT COMMIT)
2. Copy all variables from template
3. Fill in actual values
4. In Railway Dashboard → Variables → **Raw Editor**
5. Paste all variables
6. Click **Save**

---

## Step 4: Configure Domain

### Automatic Railway Domain

Railway will automatically assign:
`https://flora-email-service-production.up.railway.app`

### Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **+ Generate Domain** or **+ Custom Domain**
3. For custom domain:
   - Domain: `email-service.flora.passbook.vc`
   - Add CNAME record in your DNS:
     ```
     email-service.flora.passbook.vc → <railway-provided-cname>
     ```

---

## Step 5: Deploy

### Trigger Deployment

#### Option A: Push to GitHub

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service
git add .
git commit -m "chore: prepare for Railway deployment as flora-email-service"
git push origin main
```

Railway will automatically detect the push and deploy.

#### Option B: Manual Deploy via CLI

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service
railway up
```

#### Option C: Manual Deploy via Dashboard

1. Go to **Deployments** tab
2. Click **Deploy**

---

## Step 6: Monitor Deployment

### Watch Logs

```bash
railway logs --service flora-email-service-production
```

### Expected Log Output

```
✅ Server starting on port 3016
✅ Connecting to MongoDB...
✅ MongoDB connected successfully
✅ Email service initialized with Brevo
✅ Health check endpoint available at /health
✅ Server running on port 3016 in production mode
```

### Check Build Status

1. Go to **Deployments** tab
2. Watch build progress
3. Should complete in 2-3 minutes

---

## Step 7: Verify Deployment

### 1. Health Check

```bash
curl https://flora-email-service-production.up.railway.app/health
```

**Expected Response:**
```json
{
  "success": true,
  "service": "flora-email-service",
  "version": "2.0.0",
  "database": "connected",
  "environment": "production",
  "timestamp": "2026-07-17T04:56:00.000Z"
}
```

### 2. Test Email Sending (Invitation)

```bash
curl -X POST https://flora-email-service-production.up.railway.app/api/v1/invitations/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: <MAIN_APP_API_KEY>" \
  -d '{
    "email": "test@example.com",
    "role": "LP",
    "inviterName": "Test GP",
    "fundName": "Test Fund",
    "personalMessage": "Welcome to the fund!"
  }'
```

### 3. Test Auth Email

```bash
curl -X POST https://flora-email-service-production.up.railway.app/api/v1/auth-emails/password-reset \
  -H "Content-Type: application/json" \
  -H "x-api-key: <MAIN_APP_API_KEY>" \
  -d '{
    "email": "test@example.com",
    "resetToken": "test-token-123"
  }'
```

### 4. Database Connection

Check logs for:
```
✅ MongoDB connection established
✅ Connected to database: flora_invitations (or venturestudio)
```

---

## Step 8: Update Main App

### Update Environment Variables in passbook-flora

```bash
# Old variables (keep for rollback)
INVITATIONS_SERVICE_URL=https://flora-invitations-service-production.up.railway.app
INVITATIONS_SERVICE_API_KEY=<current-value>

# New variables (add)
EMAIL_SERVICE_URL=https://flora-email-service-production.up.railway.app
EMAIL_SERVICE_API_KEY=<same-as-INVITATIONS_SERVICE_API_KEY>
```

### Update Code References

In main app, update service endpoint references:

```javascript
// Before
const invitationsServiceUrl = process.env.INVITATIONS_SERVICE_URL;

// After
const emailServiceUrl = process.env.EMAIL_SERVICE_URL || process.env.INVITATIONS_SERVICE_URL;
```

---

## Step 9: Traffic Switch (Blue-Green Cutover)

### Gradual Cutover

1. **Phase 1: Test Traffic**
   - Send 10% of traffic to new service
   - Monitor for errors
   - Duration: 1 hour

2. **Phase 2: Partial Traffic**
   - Send 50% of traffic to new service
   - Monitor metrics
   - Duration: 2 hours

3. **Phase 3: Full Traffic**
   - Send 100% of traffic to new service
   - Keep old service running for 24h
   - Monitor closely

### Implementation

Update main app environment variable:
```bash
# In passbook-flora Railway variables
EMAIL_SERVICE_URL=https://flora-email-service-production.up.railway.app
```

---

## Step 10: Post-Deployment Monitoring

### Monitor Metrics

1. **Response Times**
   - Health endpoint: < 100ms
   - Email send: < 2s
   - Database queries: < 500ms

2. **Error Rates**
   - Target: < 0.1%
   - Alert if > 1%

3. **Email Delivery**
   - Check Brevo dashboard
   - Verify delivery rates
   - Check bounce rates

### Set Up Alerts (Optional)

```bash
# In Railway Dashboard → Observability
# Set up alerts for:
- CPU usage > 80%
- Memory usage > 80%
- Response time > 5s
- Error rate > 5%
```

---

## Rollback Procedure

If issues occur, follow these steps immediately:

### 1. Switch Traffic Back

```bash
# In passbook-flora service variables
EMAIL_SERVICE_URL=https://flora-invitations-service-production.up.railway.app
```

### 2. Stop New Service (Temporary)

```bash
railway service stop --service flora-email-service-production
```

### 3. Investigate Logs

```bash
railway logs --service flora-email-service-production | tail -1000
```

### 4. Fix and Redeploy

1. Identify issue in logs
2. Fix code/configuration
3. Commit and push
4. Wait for new deployment
5. Repeat verification steps

---

## Common Issues & Solutions

### Issue: Health Check Failing

**Symptoms:**
- Health endpoint returns 404 or 500
- Service keeps restarting

**Solutions:**
1. Check `PORT` environment variable is set to `3016`
2. Verify Dockerfile exposes port 3016
3. Check server.js starts on correct port
4. Review logs for startup errors

### Issue: Database Connection Failed

**Symptoms:**
- "MongoDB connection failed" in logs
- Health check shows `database: "disconnected"`

**Solutions:**
1. Verify `MONGODB_URI` is set correctly
2. Check MongoDB service is running
3. Test connection string format
4. Verify database user has permissions

### Issue: Email Not Sending

**Symptoms:**
- Email API returns error
- No emails in Brevo dashboard

**Solutions:**
1. Verify `BREVO_API_KEY` is correct
2. Check Brevo account is active
3. Verify sender email is verified
4. Check Brevo API limits

### Issue: Authentication Failed

**Symptoms:**
- Main app cannot reach email service
- 401 Unauthorized errors

**Solutions:**
1. Verify `MAIN_APP_API_KEY` matches in both services
2. Check `x-api-key` header is sent correctly
3. Review authentication middleware logs

---

## Performance Optimization

### 1. Database Connection Pooling

Already configured in `src/config/database.js`:
```javascript
maxPoolSize: 10,
minPoolSize: 2,
```

### 2. Response Caching

Consider implementing for:
- Template retrieval
- User context lookups
- Configuration data

### 3. Rate Limiting

Already configured:
- 100 requests per IP per 15 minutes
- Customizable per endpoint

---

## Security Checklist

- [x] Environment variables not committed to git
- [x] API key authentication for all endpoints
- [x] JWT verification for user-initiated requests
- [x] CORS configured for allowed origins
- [x] Helmet.js security headers enabled
- [x] Rate limiting enabled
- [x] Input validation on all endpoints
- [x] MongoDB connection uses authentication
- [x] Non-root user in Docker container
- [ ] SSL/TLS certificate configured (Railway handles this)
- [ ] Security headers verified
- [ ] Dependency vulnerability scan completed

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates in Railway dashboard
- Check email delivery rates in Brevo

**Weekly:**
- Review logs for anomalies
- Check database size and performance
- Update dependencies if security patches available

**Monthly:**
- Review and optimize database queries
- Analyze email templates performance
- Update documentation

### Backup Strategy

**Database:**
- Railway MongoDB automated backups (check Railway plan)
- Consider additional backup to S3/Google Cloud Storage

**Configuration:**
- Environment variables backed up securely
- Railway configuration exported

---

## Support & Troubleshooting

### Logs Access

```bash
# Real-time logs
railway logs --service flora-email-service-production --tail

# Last 1000 lines
railway logs --service flora-email-service-production | tail -1000

# Filter for errors
railway logs --service flora-email-service-production | grep ERROR
```

### Database Access

```bash
# Get MongoDB connection string
railway variables --service flora-email-service-production | grep MONGODB_URI

# Connect with MongoDB Compass or CLI
mongosh "<MONGODB_URI>"
```

### Service Metrics

View in Railway Dashboard:
- CPU usage
- Memory usage
- Network traffic
- Deployment history

---

## Documentation References

- **Architecture:** `/microservices/flora-email-service/ARCHITECTURE.md`
- **API Documentation:** `/microservices/flora-email-service/README.md`
- **Environment Variables:** `/microservices/flora-email-service/.env.production.template`
- **Implementation Plan:** `/microservices/flora-email-service/PHASED_IMPLEMENTATION_PLAN.md`

---

## Deployment Checklist Summary

- [ ] Railway service created: `flora-email-service-production`
- [ ] Build settings configured (Dockerfile)
- [ ] All environment variables set
- [ ] Database connection verified
- [ ] Health check endpoint tested
- [ ] Email sending tested (all types)
- [ ] Main app integration updated
- [ ] Traffic switched from old service
- [ ] Monitoring and alerts configured
- [ ] Old service kept running for 24h
- [ ] Documentation updated
- [ ] Team notified of deployment

---

**Last Updated:** 2026-07-17
**Deployment Status:** Ready for Execution
**Estimated Deployment Time:** 30-45 minutes
