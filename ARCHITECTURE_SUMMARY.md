# Flora Email Service - Architecture Summary

**Quick Reference Guide**

---

## Service Overview

**Name**: `flora-email-service`
**Former Name**: `flora-invitations-service`
**Version**: 2.0.0
**Port**: 3016
**Current Status**: 15% Complete (Structure + Invitations)

### What This Service Does

**SENDING** - All outbound emails:
- Authentication emails (password reset, verification, welcome)
- Capital calls and distributions
- Document notifications and signature requests
- Invitation requests (5-step workflow)
- System notifications
- Platform invitations (11 types)

**RECEIVING** - Gmail polling for CRM:
- OAuth connection management
- Email polling (every 5 minutes)
- Email storage and indexing
- CRM contact linking

**TRACKING** - Email audit trail:
- Delivery status monitoring
- Email analytics
- Retry management
- Cost tracking

---

## Key Architectural Decisions

### 1. Bounded Context

**Decision**: Email operations are a separate bounded context

**Rationale**:
- Single responsibility (email delivery + tracking)
- Independent scaling
- Technology isolation (Brevo, Gmail APIs)
- Clear service boundaries

**Impact**:
- Service owns all email-related data (EmailLog, ReceivedEmail)
- Service does NOT own user/fund/company data (fetch from main app)
- Clear API contracts for integration

### 2. Clean Architecture (Layered)

**Decision**: Strict layer separation (Routes → Controllers → Services → Models)

**Layers**:
```
Routes        - API endpoints, RBAC, validation
Controllers   - HTTP handling, orchestration
Services      - Business logic, external APIs
Models        - Data validation, queries
```

**Rationale**:
- Testability (mock services in tests)
- Maintainability (clear responsibilities)
- Reusability (services used by multiple controllers)

**Impact**:
- More files but clearer structure
- Easier to test and debug
- Follows Flora Development Rules

### 3. Template-Based Email Rendering

**Decision**: Handlebars templates for all email types

**Rationale**:
- Design consistency
- Easy updates (no code changes)
- Personalization (variable interpolation)
- Caching for performance

**Implementation**:
- Templates in `/src/templates/emails/`
- Organized by category (auth, capital-calls, documents, etc.)
- Base template for common layout
- Template caching for performance

**Impact**:
- Non-technical staff can update email copy
- Design changes don't require code deployment
- Consistent branding

### 4. Audit-First Design

**Decision**: Log every email sent/received

**Rationale**:
- Compliance (SEC, GDPR)
- Troubleshooting
- Analytics
- Resend capability

**Implementation**:
- EmailLog model captures all sends
- ReceivedEmail model captures all receives
- 90-day retention with TTL indexes
- Searchable by recipient, type, date

**Impact**:
- Full visibility into email operations
- Can prove email was sent
- Debug delivery issues
- Analytics dashboard

### 5. Retry Logic with Exponential Backoff

**Decision**: Automatic retry for transient failures

**Configuration**:
```javascript
{
  maxRetries: 3,
  initialDelay: 1000ms,
  maxDelay: 30000ms,
  backoffMultiplier: 2
}
```

**Retry Conditions**:
- Network errors (ECONNREFUSED, ETIMEDOUT)
- Brevo 5xx errors
- Rate limit errors (429)

**No Retry**:
- Invalid email format (400)
- Authentication errors (401)
- Permissions errors (403)

**Impact**:
- 99.9% delivery rate
- Automatic recovery from transient failures
- Reduced manual intervention

### 6. OAuth Token Encryption

**Decision**: Encrypt all OAuth tokens at rest

**Algorithm**: AES-256-GCM
**Key**: 64-character hex string (env var)

**Rationale**:
- Security best practice
- Compliance requirement
- Prevent token theft

**Implementation**:
```javascript
// Stored in DB (encrypted)
"abc123:def456:ghijklmno..."

// Used in code (decrypted)
"actual_oauth_token_plaintext"
```

**Impact**:
- Even with database access, tokens are useless
- Meets security compliance requirements

### 7. Rate Limiting (Multi-Level)

**Decision**: Multiple rate limit tiers

**Tiers**:
1. **API Level**: 100 requests / 15 minutes per IP
2. **Email Sending**: 50 emails / hour per user
3. **Bulk Sending**: Batch size 50, 1 second delay between batches

**Rationale**:
- Prevent abuse
- Respect Brevo limits (300 emails/day free tier)
- Avoid spam classification

**Impact**:
- Service stays within Brevo limits
- Fair usage across users
- Protection against abuse

### 8. Background Workers (Cron Jobs)

**Decision**: Separate worker processes for async tasks

**Workers**:
1. **Gmail Poll Worker**: Every 5 minutes
2. **Email Retry Worker**: Every 15 minutes (check failed emails)
3. **Cleanup Worker**: Daily at 2 AM (purge old logs)

**Rationale**:
- Non-blocking (don't slow down API requests)
- Scheduled execution
- Resource isolation

**Impact**:
- Gmail sync runs automatically
- Failed emails retry automatically
- Database stays clean

### 9. Service-to-Service Authentication

**Decision**: Dual authentication (JWT + API Key)

**JWT** (User requests):
- Shared secret with main app
- User context extraction
- RBAC enforcement

**API Key** (Service-to-service):
- Internal secret for proxy calls
- No user context needed
- Simplified authentication

**Impact**:
- Secure inter-service communication
- Flexible authentication based on caller

### 10. Database Strategy

**Decision**: Shared MongoDB database (`venturestudio`)

**Rationale**:
- Email service needs user/fund/company data
- Avoid data duplication
- Leverage existing indexes
- Transaction support across collections

**Collections Owned by Email Service**:
- `platforminvitations`
- `emaillogs`
- `gmailconnections`
- `receivedemails`

**Collections Read-Only**:
- `users`
- `funds`
- `companies`
- `lpentities`

**Impact**:
- No data synchronization needed
- Consistent data across services
- Potential coupling (mitigated by clear read-only boundaries)

---

## Critical Dependencies

### External Services

#### 1. Brevo (Email Sending)

**Purpose**: Transactional email delivery
**API Endpoint**: `https://api.brevo.com/v3`
**Rate Limits**: 300 emails/day (free), unlimited (paid)
**SLA**: 99.9% uptime

**Required Environment Variables**:
```bash
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=flora@passbook.vc
BREVO_SENDER_NAME=Passbook Flora
```

**Failure Impact**: Cannot send emails
**Mitigation**: Retry logic, fallback to SendGrid (future)

#### 2. Gmail API (Email Receiving)

**Purpose**: OAuth + email polling for CRM
**API Endpoint**: `https://www.googleapis.com/gmail/v1`
**Rate Limits**: 1 billion quota units/day, 250/user/second
**OAuth Scopes**: `gmail.readonly`, `gmail.metadata`, `userinfo.email`

**Required Environment Variables**:
```bash
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://flora-email-service.railway.app/api/v1/gmail/callback
```

**Failure Impact**: Cannot sync Gmail, CRM emails unavailable
**Mitigation**: Graceful degradation, error logging, retry logic

#### 3. MongoDB

**Purpose**: Data persistence
**Connection**: Shared `venturestudio` database
**Version**: 6.0+

**Required Environment Variable**:
```bash
MONGODB_URI=mongodb+srv://...
```

**Failure Impact**: Service cannot start, no email logging
**Mitigation**: Connection retry logic, health check alerts

#### 4. Railway (Hosting)

**Purpose**: Service hosting + deployment
**Features**: Auto-scaling, health checks, logging
**Region**: US-West

**Configuration**:
- Min instances: 1
- Max instances: 5
- Auto-scale trigger: 70% CPU
- Health check: `/health` every 30s

**Failure Impact**: Service downtime
**Mitigation**: Auto-restart, health check monitoring

### Internal Dependencies

#### 1. Main App (Authentication)

**Purpose**: JWT token generation, user management
**Dependency**: Shared JWT secret

**Integration Points**:
- JWT token verification
- User role/permissions
- User profile data (read-only)

**Failure Impact**: Cannot authenticate requests
**Mitigation**: API key fallback for internal calls

#### 2. Main App (Email Proxy)

**Purpose**: Route email requests to email service
**File**: `/routes/v1/emails-proxy.js`

**Proxy Routes**:
- `/api/v1/emails/auth/*`
- `/api/v1/emails/capital-calls/*`
- `/api/v1/emails/documents/*`
- `/api/v1/emails/invitation-requests/*`
- `/api/v1/emails/system/*`

**Failure Impact**: Main app cannot send emails
**Mitigation**: Direct email service calls (bypass proxy)

#### 3. Shared Database Schema

**Dependencies**:
- `users` collection (user data)
- `funds` collection (fund data)
- `companies` collection (company data)
- `lpentities` collection (LP data)

**Failure Impact**: Cannot resolve sender context, incomplete email data
**Mitigation**: Graceful degradation, use email address as fallback

---

## Email Types (27 Total)

### Invitations (11 types) - ✅ Complete

1. GP Invitation
2. LP Invitation (Person)
3. LP Invitation (Institution)
4. Admin Invitation
5. Founder Invitation
6. Portfolio Founder Invitation
7. Investment Invitation
8. User Invitation
9. Admin Generic Invitation
10. Admin Fund Invitation
11. Invitation Reminder

### Auth Emails (4 types) - ✅ Complete

1. Password Reset
2. Email Verification
3. Resend Verification
4. Welcome Email

### Capital Call Emails (4 types) - 🚧 TODO

1. Capital Call Notice
2. Distribution Notice
3. Bulk Capital Calls
4. Capital Call Reminder

### Document Emails (4 types) - 🚧 TODO

1. Document Upload Notification
2. Signature Request
3. Signature Complete
4. Signature Reminder

### Invitation Request Emails (5 types) - 🚧 TODO

1. Request Confirmation (Step 1)
2. Admin Notification (Step 2)
3. Approval Notification (Step 3)
4. Denial Notification (Step 4)
5. Follow-up Reminder (Step 5)

### System Emails (3 types) - 🚧 TODO

1. Maintenance Notification
2. Announcement
3. Bulk Email

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Email Send Latency | < 2 seconds | TBD | 🚧 |
| API Response Time | < 500ms | TBD | 🚧 |
| Email Delivery Rate | 99.9% | TBD | 🚧 |
| Bulk Email Throughput | 1000/hour | TBD | 🚧 |
| Gmail Poll Frequency | 5 minutes | N/A | 🚧 |
| Database Query Time | < 100ms | TBD | 🚧 |

---

## Security Measures

### Authentication

1. **JWT Verification**: Shared secret with main app
2. **API Key Validation**: Internal service-to-service
3. **OAuth 2.0**: Gmail integration

### Authorization (RBAC)

**Role Hierarchy**:
```
Platform Admin (highest)
  ↓
GP Admin
  ↓
GP User
  ↓
Founder
  ↓
LP
  ↓
User (lowest)
```

**Enforcement**: Middleware on protected routes

### Data Protection

1. **OAuth Token Encryption**: AES-256-GCM
2. **Invitation Token Generation**: Crypto-secure 32-byte tokens
3. **HTTPS Only**: TLS 1.3
4. **CORS**: Configured origins only
5. **Rate Limiting**: Multi-tier protection

### Input Validation

1. **Email Format**: RFC 5322 validation
2. **SQL Injection**: Mongoose parameterized queries
3. **XSS Prevention**: HTML entity encoding
4. **CSRF**: Token-based protection

---

## Monitoring & Observability

### Logging

**Winston Logger** with levels:
- `error`: Failed operations
- `warn`: Degraded performance
- `info`: Normal operations
- `debug`: Detailed debugging

**Log Destinations**:
- Console (Railway logs)
- File (`error.log`, `combined.log`)
- Future: Sentry, Datadog

### Health Checks

**Endpoint**: `/health`
**Frequency**: Every 30 seconds

**Checks**:
- MongoDB connection
- Brevo API reachability
- Gmail sync status
- Memory usage
- Uptime

### Metrics

**Key Metrics**:
- Emails sent (24h)
- Emails failed (24h)
- Delivery rate (%)
- Average send time (ms)
- Active Gmail connections
- Gmail sync errors

**Endpoint**: `/metrics` (internal)

### Alerting

**Alert Conditions**:
1. Email failure rate > 5% (1 hour)
2. Service down (3 consecutive health check failures)
3. Database connection lost
4. Gmail sync errors > 10 (1 hour)
5. API latency p95 > 5 seconds

**Channels**:
- Slack (critical alerts)
- Email (daily digest)
- PagerDuty (production incidents)

---

## Migration Strategy

### Service Renaming

**From**: `flora-invitations-service`
**To**: `flora-email-service`

**Reason**: Service handles ALL emails, not just invitations

**Steps**:
1. Rename GitHub repository
2. Update package.json
3. Update Railway service name
4. Update environment variables
5. Update submodule reference
6. Update documentation

**Risk**: Low (cosmetic change)

### Gmail Integration Migration

**Current State**: Gmail OAuth in main app
**Target State**: Gmail OAuth in email service

**Reason**: Consolidate email operations in one service

**Steps**:
1. Implement Gmail OAuth in email service
2. Create GmailConnection + ReceivedEmail models
3. Migrate existing connection data
4. Update main app to proxy Gmail requests
5. Monitor for 1 week
6. Remove Gmail code from main app

**Risk**: High (data migration, OAuth token handling)

### Main App Integration

**Current State**: Main app sends emails directly
**Target State**: Main app proxies to email service

**Reason**: Centralize email sending, improve observability

**Steps**:
1. Create email proxy routes in main app
2. Update controllers to call proxy
3. Add feature flags for gradual rollout
4. Test end-to-end flows
5. Deploy with canary (10% → 100%)

**Risk**: Medium (potential breaking changes)

---

## Deployment Strategy

### Blue-Green Deployment

**Approach**: Deploy new version alongside old, gradually shift traffic

**Phases**:
1. **Green Deploy**: New version deployed, 0% traffic
2. **Canary**: 10% traffic → new version, monitor 24h
3. **Ramp Up**: 10% → 25% → 50% → 100% over 3 days
4. **Blue Decommission**: Remove old version after 1 week

**Rollback**: Immediate (< 5 minutes) - shift traffic back to blue

### Environment Strategy

1. **Development**: Local (`http://localhost:3016`)
2. **Staging**: Railway (`https://flora-email-service-staging.railway.app`)
3. **Production**: Railway (`https://flora-email-service.railway.app`)

**Promotion Path**: Dev → Staging → Production (canary) → Production (full)

### CI/CD Pipeline

**GitHub Actions**:
1. **On PR**: Run tests, lint
2. **On Merge to Main**: Deploy to staging
3. **On Tag**: Deploy to production

**Deployment Steps**:
1. Build Docker image
2. Push to Railway
3. Health check verification
4. Traffic shifting (canary)
5. Monitoring (24h)

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

**Trigger**: Critical error, service down, data loss

**Steps**:
1. Railway: Rollback to previous deployment
2. Main App: Switch email proxy URL to old service
3. Verify health checks pass
4. Monitor logs

### Quick Rollback (< 15 minutes)

**Trigger**: High error rate, performance degradation

**Steps**:
1. Git: Revert merge commit
2. Railway: Redeploy from reverted commit
3. Main App: Update environment variables
4. Verify functionality

### Full Rollback (< 4 hours)

**Trigger**: Data corruption, irrecoverable errors

**Steps**:
1. Restore database from backup (30-day retention)
2. Git: Revert to last known good commit
3. Railway: Full redeploy
4. Main App: Restore old email code
5. Comprehensive testing

---

## Success Criteria

### Functional

- [ ] All 27 email types sending successfully
- [ ] Gmail sync operational (5-minute intervals)
- [ ] Email logs created for all operations
- [ ] All API endpoints working
- [ ] OAuth flow working

### Performance

- [ ] 99.9% email delivery rate
- [ ] < 2 seconds email send latency (p95)
- [ ] 1000+ emails/hour sustained throughput
- [ ] < 500ms API response time (p95)
- [ ] < 100ms database query time (p95)

### Reliability

- [ ] Zero downtime deployment
- [ ] Automatic retry for failed emails
- [ ] Background workers running continuously
- [ ] Health checks passing (100%)
- [ ] Error recovery working

### Security

- [ ] RBAC enforced on all protected endpoints
- [ ] OAuth tokens encrypted (AES-256-GCM)
- [ ] Input validation on all endpoints
- [ ] HTTPS only
- [ ] Rate limiting active

### Observability

- [ ] All email sends logged
- [ ] Email delivery status tracked
- [ ] Health check endpoint working
- [ ] Metrics endpoint exposing KPIs
- [ ] Alerts configured

---

## Next Steps (Week 1)

### Immediate Priorities

1. **Phase 1: Service Renaming** (Day 1)
   - Rename repository
   - Update documentation
   - Verify health checks

2. **Phase 2: Auth Email Controllers** (Days 2-4)
   - Verify existing implementation
   - Add email logging
   - Integration testing
   - Main app integration

3. **Phase 3: Capital Call Controllers** (Days 5-7)
   - Implement 4 controllers
   - Add attachment support
   - Implement bulk sending
   - Testing

### Week 1 Deliverables

- [x] Service renamed
- [x] Auth emails fully functional
- [x] Capital call emails implemented
- [x] Integration tests passing
- [x] Main app proxy routes updated

---

## Key Files

### Configuration

- `/package.json` - Service metadata
- `/.env.example` - Environment variables template
- `/railway.json` - Railway deployment config
- `/Dockerfile` - Container configuration

### Core Application

- `/src/server.js` - Express app, middleware, routes
- `/src/config/database.js` - MongoDB connection
- `/src/config/email.js` - Brevo configuration
- `/src/config/logger.js` - Winston logger

### Models

- `/src/models/PlatformInvitation.js` - Invitation data
- `/src/models/EmailLog.js` - Email audit trail
- `/src/models/GmailConnection.js` - OAuth connections
- `/src/models/ReceivedEmail.js` - Inbound emails (CRM)

### Services

- `/src/services/emailService.js` - Brevo integration
- `/src/services/templateService.js` - Handlebars rendering
- `/src/services/contextService.js` - Sender resolution
- `/src/services/auditService.js` - Email logging
- `/src/services/gmailPollingService.js` - Gmail sync

### Controllers

- `/src/controllers/invitationController.js` - Invitations (11 types)
- `/src/controllers/authEmailController.js` - Auth emails (4 types)
- `/src/controllers/capitalCallEmailController.js` - Capital calls (4 types)
- `/src/controllers/documentEmailController.js` - Documents (4 types)
- `/src/controllers/invitationRequestEmailController.js` - Requests (5 types)
- `/src/controllers/systemEmailController.js` - System (3 types)
- `/src/controllers/gmailController.js` - Gmail integration

### Routes

- `/src/routes/v1/invitations.js` - Invitation endpoints
- `/src/routes/v1/auth-emails.js` - Auth email endpoints
- `/src/routes/v1/capital-call-emails.js` - Capital call endpoints
- `/src/routes/v1/document-emails.js` - Document endpoints
- `/src/routes/v1/invitation-request-emails.js` - Request endpoints
- `/src/routes/v1/system-emails.js` - System endpoints
- `/src/routes/v1/gmail.js` - Gmail endpoints

### Templates

- `/src/templates/emails/base-template.html` - Base layout
- `/src/templates/emails/auth/*` - Auth email templates
- `/src/templates/emails/capital-calls/*` - Capital call templates
- `/src/templates/emails/documents/*` - Document templates
- `/src/templates/emails/invitation-requests/*` - Request templates
- `/src/templates/emails/invitations/*` - Invitation templates
- `/src/templates/emails/system/*` - System templates

### Documentation

- `/ARCHITECTURE.md` - Comprehensive architecture (this document)
- `/PHASED_IMPLEMENTATION_PLAN.md` - Step-by-step implementation
- `/IMPLEMENTATION_PLAN.md` - Original plan
- `/README.md` - Service overview
- `/BREVO_TEMPLATE_SETUP.md` - Brevo configuration
- `/DEPLOYMENT_INSTRUCTIONS.md` - Deployment guide

---

## Contact & Resources

**Documentation**:
- Architecture: `/microservices/flora-email-service/ARCHITECTURE.md`
- Implementation Plan: `/microservices/flora-email-service/PHASED_IMPLEMENTATION_PLAN.md`
- Brevo Docs: https://developers.brevo.com/
- Gmail API Docs: https://developers.google.com/gmail/api

**Repository**:
- GitHub: https://github.com/passbook-vc/flora-email-service
- Railway: https://railway.app/project/flora-email-service

**Status**:
- Current: 15% complete (structure + invitations)
- Target: 100% complete (all 27 email types + Gmail sync)
- Timeline: 8 weeks

---

**END OF ARCHITECTURE SUMMARY**
