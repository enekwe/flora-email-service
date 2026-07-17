# 🚀 Deploy Flora Email Service to Railway - NOW

## Quick Deploy (10 minutes)

### Step 1: Create Service in Railway Dashboard (2 minutes)

1. Go to https://railway.app
2. Open your project: **EnGarde Suite**
3. Click **"+ New"** → **"Empty Service"**
4. Name it: `flora-email-service-production`
5. Click **"Settings"** tab
6. Under **"Source"** → **"Connect Repo"**
7. Select: `enekwe/flora-email-service`
8. Branch: `main`
9. Root Directory: `/`

### Step 2: Set Environment Variables (5 minutes)

In the Railway dashboard, go to **Variables** tab and add these:

#### Copy These Exact Values from passbook-flora:

```bash
# DATABASE (copy exact value from passbook-flora)
MONGODB_URI=mongodb://...

# AUTHENTICATION (must match passbook-flora exactly)
JWT_SECRET=c56e20492084575d806641e859b...

# ENCRYPTION (must match passbook-flora)
ENCRYPTION_KEY=af651b4a765500d66e099070e8a...

# BREVO EMAIL SENDING (copy exact values from passbook-flora)
BREVO_API_KEY=<copy-from-passbook-flora>
BREVO_API_URL=https://api.brevo.com/v3
BREVO_SENDER_EMAIL=flora@passbook.vc
BREVO_SENDER_NAME=Passbook Flora

# IMAP/GMAIL (copy exact values from passbook-flora)
IMAP_EMAIL=crm@flora.passbook.vc
IMAP_PASSWORD=<copy-from-passbook-flora>
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
EMAIL_POLLING_INTERVAL=60000

# URLs
FRONTEND_URL=https://flora.passbook.vc
API_BASE_URL=https://api.flora.passbook.vc
BACKEND_URL=https://flora.passbook.vc

# SERVICE COMMUNICATION (copy from passbook-flora INVITATIONS_SERVICE_API_KEY)
MAIN_APP_API_KEY=3aa74dbdfeb1fc14269721da67b9d10e...

# APP CONFIGURATION
NODE_ENV=production
PORT=3016
EMAIL_AUTO_CATEGORIZE=true
EMAIL_CONFIDENCE_THRESHOLD=70
```

### Step 3: Deploy (1 minute)

1. Click **"Deploy"** or wait for auto-deploy
2. Watch deployment logs
3. Wait for **"Build successful"** and **"Deployment successful"**

### Step 4: Get Service URL (1 minute)

1. Go to **"Settings"** tab
2. Scroll to **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `flora-email-service-production.up.railway.app`)

### Step 5: Verify Health (1 minute)

```bash
curl https://flora-email-service-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-17T...",
  "service": "flora-email-service",
  "version": "2.0.0",
  "database": "connected"
}
```

### Step 6: Update passbook-flora (2 minutes)

In Railway dashboard for **passbook-flora**:

1. Go to **Variables** tab
2. Find or create: `EMAIL_SERVICE_URL`
3. Set to: `https://flora-email-service-production.up.railway.app`
4. Save

### Step 7: Test Email Sending (Optional)

```bash
# Test auth email
curl -X POST https://flora-email-service-production.up.railway.app/api/v1/emails/auth/password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "resetToken": "test-token-123",
    "name": "Test User"
  }'
```

---

## Alternative: Command Line Deployment

If you prefer CLI (in Railway Dashboard):

1. Go to project settings
2. Copy **Project ID**
3. Copy **Service ID** (after creating service)

Then run:

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service

# Link to project
railway link [project-id]

# Set environment variables (one at a time)
railway variables set NODE_ENV=production
railway variables set PORT=3016
railway variables set MONGODB_URI='<copy-from-passbook-flora>'
railway variables set JWT_SECRET='<copy-from-passbook-flora>'
railway variables set BREVO_API_KEY='<copy-from-passbook-flora>'
# ... etc for all variables above

# Deploy
railway up
```

---

## Quick Copy-Paste Variables

Get these values from passbook-flora Railway dashboard → Variables tab:

| Variable | Copy From passbook-flora |
|----------|--------------------------|
| MONGODB_URI | Exact value |
| JWT_SECRET | Exact value (must match!) |
| ENCRYPTION_KEY | Exact value (must match!) |
| BREVO_API_KEY | Exact value |
| IMAP_PASSWORD | Exact value |
| MAIN_APP_API_KEY | INVITATIONS_SERVICE_API_KEY value |

---

## Troubleshooting

### "Database connection failed"
- Check MONGODB_URI is correct
- Verify MongoDB Atlas allows Railway IPs

### "Health check returns 500"
- Check all env vars are set
- Verify JWT_SECRET matches passbook-flora
- Check logs: `railway logs` in service directory

### "Email not sending"
- Verify BREVO_API_KEY is correct
- Check Brevo dashboard for API status
- Verify BREVO_SENDER_EMAIL is verified in Brevo

### "IMAP connection failed"
- Verify IMAP_EMAIL and IMAP_PASSWORD
- Check Gmail App Password is valid
- Ensure 2FA is enabled on Gmail account

---

## Success Checklist

- [ ] Service created in Railway
- [ ] All environment variables set
- [ ] Service deployed successfully
- [ ] Health endpoint returns "healthy"
- [ ] Database shows "connected"
- [ ] passbook-flora EMAIL_SERVICE_URL updated
- [ ] Test email sent successfully

---

## Estimated Time: 10-15 minutes

**Status**: Ready to deploy
**Service URL**: Will be generated during deployment
**Health Check**: `/health`
**API Docs**: See README.md

---

Generated: 2026-07-17
Service: flora-email-service v2.0.0
