# Flora Email Service - Visual Architecture Diagram

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Flora Platform Ecosystem                           │
└─────────────────────────────────────────────────────────────────────────────┘

External Users                     External Services                  Internal Services
═══════════════                    ═════════════════                  ═════════════════

┌──────────┐                       ┌──────────┐                       ┌──────────────┐
│   GPs    │                       │  Brevo   │                       │   Main App   │
│   LPs    │                       │   API    │                       │  (Port 3001) │
│ Founders │                       │ (Sending)│                       │              │
│  Admins  │                       └────┬─────┘                       │ - Auth       │
└────┬─────┘                            │                             │ - Users      │
     │                                  │                             │ - Funds      │
     │ HTTPS                            │ HTTPS                       │ - Companies  │
     │                                  │                             │ - Documents  │
     ▼                                  ▼                             └──────┬───────┘
┌─────────────────────────────────────────────────────────────────┐         │
│                                                                  │◄────────┘
│               Flora Email Service (Port 3016)                    │  JWT + Proxy
│                                                                  │
│  27 Email Types + Gmail Sync + Audit Trail                      │
│                                                                  │
└─────┬────────────────────────────────────────────────┬──────────┘
      │                                                 │
      │ MongoDB                                         │ OAuth 2.0
      │                                                 │
      ▼                                                 ▼
┌─────────────────┐                            ┌────────────────┐
│    MongoDB      │                            │   Gmail API    │
│  venturestudio  │                            │  (Receiving)   │
│   (Shared DB)   │                            └────────────────┘
└─────────────────┘
```

---

## Service Architecture (Detailed)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        Flora Email Service (v2.0.0)                                │
│                              Port: 3016                                             │
└───────────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────┐
                                  │  HTTP Client │
                                  │  (Main App)  │
                                  └──────┬───────┘
                                         │
                                         │ JWT / API Key
                                         │
                    ┌────────────────────▼────────────────────┐
                    │       API Gateway Layer                 │
                    │  - Rate Limiting (100 req/15min)        │
                    │  - CORS (configured origins)            │
                    │  - Body Parser (10MB limit)             │
                    │  - Helmet Security                      │
                    └────────────────┬────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────┐
                    │    Authentication/Authorization         │
                    │  - JWT Verification                     │
                    │  - API Key Validation                   │
                    │  - RBAC Enforcement                     │
                    └────────────────┬────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────┐
                    │         Route Layer (6 Groups)          │
                    │                                         │
                    │  /api/v1/invitations                    │
                    │  /api/v1/emails/auth                    │
                    │  /api/v1/emails/capital-calls           │
                    │  /api/v1/emails/documents               │
                    │  /api/v1/emails/invitation-requests     │
                    │  /api/v1/emails/system                  │
                    │  /api/v1/gmail                          │
                    │                                         │
                    └────────────────┬────────────────────────┘
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      │                              │                              │
      ▼                              ▼                              ▼
┌─────────────┐             ┌─────────────┐              ┌─────────────┐
│ Invitation  │             │Auth/Capital │              │Gmail/System │
│ Controller  │             │Doc/Request  │              │ Controllers │
│             │             │ Controllers │              │             │
│ 11 methods  │             │ 19 methods  │              │  9 methods  │
└─────┬───────┘             └──────┬──────┘              └──────┬──────┘
      │                            │                            │
      └────────────────────────────┼────────────────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │      Service Layer (5 Services) │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │   emailService         │    │
                  │  │   - Brevo integration  │    │
                  │  │   - Retry logic        │    │
                  │  │   - Attachments        │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │   templateService      │    │
                  │  │   - Handlebars render  │    │
                  │  │   - Template caching   │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │   gmailPollingService  │    │
                  │  │   - OAuth management   │    │
                  │  │   - History API sync   │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │   auditService         │    │
                  │  │   - Email logging      │    │
                  │  │   - Analytics          │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │   contextService       │    │
                  │  │   - Sender resolution  │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │     Model Layer (4 Models)      │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │  PlatformInvitation    │    │
                  │  │  - Token management    │    │
                  │  │  - Lifecycle tracking  │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │  EmailLog              │    │
                  │  │  - Delivery tracking   │    │
                  │  │  - Audit trail         │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │  GmailConnection       │    │
                  │  │  - OAuth tokens        │    │
                  │  │  - Sync state          │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  │  ┌────────────────────────┐    │
                  │  │  ReceivedEmail         │    │
                  │  │  - Inbound emails      │    │
                  │  │  - CRM linking         │    │
                  │  └────────────────────────┘    │
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
       ▼                           ▼                           ▼
┌──────────────┐          ┌─────────────┐            ┌──────────────┐
│   MongoDB    │          │  Brevo API  │            │  Gmail API   │
│ venturestudio│          │  (Sending)  │            │ (Receiving)  │
│              │          │             │            │              │
│ Collections: │          │ Endpoints:  │            │ Endpoints:   │
│ - invitations│          │ - /smtp/    │            │ - /messages  │
│ - emaillogs  │          │   email     │            │ - /history   │
│ - gmail...   │          │ - /webhooks │            │ - /attach... │
│ - received.. │          │             │            │              │
└──────────────┘          └─────────────┘            └──────────────┘
```

---

## Background Workers

```
┌───────────────────────────────────────────────────────────────────────┐
│                      Background Workers (Cron)                         │
└───────────────────────────────────────────────────────────────────────┘

Worker 1: Gmail Poll Worker
═══════════════════════════════
Schedule: */5 * * * * (Every 5 minutes)

┌─────────────┐
│   Start     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Fetch Active Gmail      │
│ Connections             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ For Each Connection:    │
│                         │
│ 1. Refresh OAuth Token  │
│ 2. Call Gmail History   │
│    API                  │
│ 3. Fetch New Messages   │
│ 4. Parse Content        │
│ 5. Save to DB           │
│ 6. Update Sync State    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│  Complete   │
└─────────────┘


Worker 2: Email Retry Worker
═════════════════════════════
Schedule: */15 * * * * (Every 15 minutes)

┌─────────────┐
│   Start     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Find Failed Emails      │
│ (retries < 3)           │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ For Each Failed Email:  │
│                         │
│ 1. Wait (exponential    │
│    backoff)             │
│ 2. Retry Send           │
│ 3. Update Status        │
│ 4. Increment Retries    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│  Complete   │
└─────────────┘


Worker 3: Cleanup Worker
════════════════════════
Schedule: 0 2 * * * (Daily at 2 AM)

┌─────────────┐
│   Start     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Find Old Logs           │
│ (> 90 days)             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Delete Old:             │
│ - EmailLogs             │
│ - Expired Invitations   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│  Complete   │
└─────────────┘
```

---

## Email Processing Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Outbound Email Processing Pipeline                  │
└───────────────────────────────────────────────────────────────────────┘

1. Request Received
   │
   │  POST /api/v1/emails/auth/password-reset
   │  {
   │    email: "user@example.com",
   │    resetToken: "abc123",
   │    resetUrl: "https://..."
   │  }
   │
   ▼
2. Authentication
   │
   │  - Verify JWT (if authenticated route)
   │  - Validate API Key (if service call)
   │  - Extract user context
   │
   ▼
3. Authorization (RBAC)
   │
   │  - Check user role
   │  - Verify permissions
   │  - Validate resource access
   │
   ▼
4. Input Validation
   │
   │  - Required fields present?
   │  - Email format valid?
   │  - Data types correct?
   │
   ▼
5. Template Selection
   │
   │  templateService.selectTemplate('auth/password-reset')
   │
   ▼
6. Variable Preparation
   │
   │  variables = {
   │    name: "John Doe",
   │    email: "user@example.com",
   │    resetLink: "https://...",
   │    expiresIn: "10 minutes",
   │    frontendUrl: "https://flora.passbook.vc",
   │    currentYear: 2026
   │  }
   │
   ▼
7. Template Rendering
   │
   │  htmlContent = Handlebars.compile(template)(variables)
   │
   ▼
8. Email Composition
   │
   │  {
   │    sender: { email: "flora@passbook.vc", name: "Passbook Flora" },
   │    to: [{ email: "user@example.com", name: "John Doe" }],
   │    subject: "🔐 Password Reset Request",
   │    htmlContent: "<html>...</html>"
   │  }
   │
   ▼
9. Brevo API Call
   │
   │  POST https://api.brevo.com/v3/smtp/email
   │  Headers: { "api-key": "..." }
   │  Body: { sender, to, subject, htmlContent }
   │
   │  ┌──────────────────┐
   │  │  Retry Logic:    │
   │  │  - Max: 3 tries  │
   │  │  - Delay: 1s→2s→4s│
   │  │  - Backoff: 2x   │
   │  └──────────────────┘
   │
   ▼
10. Email Logging
    │
    │  EmailLog.create({
    │    emailType: 'password_reset',
    │    recipient: 'user@example.com',
    │    subject: '🔐 Password Reset Request',
    │    brevoMessageId: 'msg_123',
    │    sentAt: new Date(),
    │    deliveryStatus: 'sent'
    │  })
    │
    ▼
11. Response
    │
    │  {
    │    success: true,
    │    message: "Password reset email sent successfully",
    │    messageId: "msg_123"
    │  }
    │
    ▼
12. Brevo Webhook (Async)
    │
    │  POST /webhooks/brevo/delivered
    │  {
    │    messageId: "msg_123",
    │    event: "delivered",
    │    timestamp: "..."
    │  }
    │
    │  → Update EmailLog.deliveryStatus = 'delivered'
    │
    ▼
Complete
```

---

## Gmail Polling Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Inbound Email Processing (CRM)                      │
└───────────────────────────────────────────────────────────────────────┘

Background Worker (Every 5 minutes)
│
├──► Fetch Active GmailConnections
│    │
│    │  GmailConnection.find({
│    │    isActive: true,
│    │    autoSync: true
│    │  })
│    │
│    ▼
│    For Each Connection:
│    │
│    ├──► 1. Check Token Expiration
│    │         │
│    │         │  if (token.expiresAt < now) {
│    │         │    refreshToken()
│    │         │  }
│    │         │
│    │         ▼
│    │
│    ├──► 2. Call Gmail History API
│    │         │
│    │         │  GET /users/me/history
│    │         │  ?startHistoryId={lastHistoryId}
│    │         │  &historyTypes=messageAdded
│    │         │
│    │         │  Response:
│    │         │  {
│    │         │    history: [
│    │         │      { messagesAdded: [...] }
│    │         │    ],
│    │         │    historyId: "12345"
│    │         │  }
│    │         │
│    │         ▼
│    │
│    ├──► 3. Process New Messages
│    │         │
│    │         │  For each message:
│    │         │
│    │         ├──► 3a. Fetch Full Message
│    │         │         │
│    │         │         │  GET /users/me/messages/{id}
│    │         │         │
│    │         │         ▼
│    │         │
│    │         ├──► 3b. Parse Headers
│    │         │         │
│    │         │         │  from: "sender@example.com"
│    │         │         │  to: "recipient@example.com"
│    │         │         │  subject: "Re: Investment Opportunity"
│    │         │         │
│    │         │         ▼
│    │         │
│    │         ├──► 3c. Extract Body
│    │         │         │
│    │         │         │  - Text/plain
│    │         │         │  - Text/html
│    │         │         │  - Decode base64
│    │         │         │
│    │         │         ▼
│    │         │
│    │         ├──► 3d. Extract Attachments
│    │         │         │
│    │         │         │  [{
│    │         │         │    filename: "doc.pdf",
│    │         │         │    mimeType: "application/pdf",
│    │         │         │    size: 12345,
│    │         │         │    attachmentId: "att_123"
│    │         │         │  }]
│    │         │         │
│    │         │         ▼
│    │         │
│    │         ├──► 3e. Save to Database
│    │         │         │
│    │         │         │  ReceivedEmail.create({
│    │         │         │    connectionId,
│    │         │         │    userId,
│    │         │         │    gmailMessageId,
│    │         │         │    from,
│    │         │         │    to,
│    │         │         │    subject,
│    │         │         │    bodyText,
│    │         │         │    bodyHtml,
│    │         │         │    attachments,
│    │         │         │    receivedAt
│    │         │         │  })
│    │         │         │
│    │         │         ▼
│    │         │
│    │         └──► 3f. Link to CRM (Future)
│    │                   │
│    │                   │  - Match sender to Contact
│    │                   │  - Link to Deal
│    │                   │  - Apply tags
│    │                   │
│    │                   ▼
│    │
│    └──► 4. Update Connection State
│              │
│              │  connection.lastHistoryId = "12345"
│              │  connection.lastSyncDate = now
│              │  connection.syncStatus = 'active'
│              │  connection.stats.totalEmailsReceived += newCount
│              │  connection.save()
│              │
│              ▼
│
└──► Complete
     │
     │  Log: "Gmail sync complete - 5 new messages"
     │
     ▼
Wait 5 minutes... (Repeat)
```

---

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Data Flow Overview                            │
└───────────────────────────────────────────────────────────────────────┘

Main App                      Email Service                   External APIs
════════                      ═════════════                   ═════════════

User Registration
    │
    ├──► POST /api/v1/auth/register
    │      │
    │      │  1. Create User
    │      │  2. Generate email token
    │      │  3. Call Email Service ────────►  POST /api/v1/emails/auth/welcome
    │      │                                       │
    │      │                                       ├──► Render template
    │      │                                       ├──► Send via Brevo ─────► Brevo API
    │      │                                       └──► Log to EmailLog       │
    │      │                                                                  │
    │      │  ◄──────────────────────────────── Success response              │
    │      │                                                                  │
    │      ▼                                                                  │
    │  Response to user                                                      │
    │                                                                         │
                                                                              │
Capital Call Created                                                         │
    │                                                                         │
    ├──► POST /api/v1/capital-calls/:id/send                                │
    │      │                                                                  │
    │      │  1. Fetch capital call data                                     │
    │      │  2. Get LP list                                                 │
    │      │  3. Generate PDF                                                │
    │      │  4. Call Email Service ────────►  POST /api/v1/emails/capital-calls/bulk
    │      │                                       │                          │
    │      │                                       ├──► Batch recipients     │
    │      │                                       ├──► For each:            │
    │      │                                       │    - Render template    │
    │      │                                       │    - Attach PDF         │
    │      │                                       │    - Send via Brevo ───►│
    │      │                                       │    - Log to EmailLog    │
    │      │                                       │    - Rate limit delay   │
    │      │                                       └──► Return summary       │
    │      │                                                                  │
    │      │  ◄──────────────────────────────── {sent: 45, failed: 2}        │
    │      │                                                                  │
    │      ▼                                                                  │
    │  Show results                                                          │
    │                                                                         │
                                                                              │
Gmail Sync (Background)                                                      │
    │                                                                         │
    │                                      Cron Job (Every 5 min)            │
    │                                          │                              │
    │                                          ├──► Fetch connections        │
    │                                          ├──► For each:                │
    │                                          │    - Refresh token          │
    │                                          │    - Call Gmail API ────────► Gmail API
    │                                          │    - Parse messages         │    │
    │                                          │    - Save to ReceivedEmail  │    │
    │                                          │    - Update sync state      │    │
    │                                          └──► Complete                 │    │
    │                                                                         │    │
    │                                                                         │    │
    ├──► GET /api/v1/gmail/emails                                           │    │
    │      │                                                                  │    │
    │      │  ◄────────────────────────────── Query ReceivedEmail model     │    │
    │      │                                      │                          │    │
    │      │                                      └──► Return results        │    │
    │      │                                                                  │    │
    │      ▼                                                                  │    │
    │  Display emails in CRM                                                 │    │
    │                                                                         │    │
                                                                              │    │
Brevo Webhook (Async)                                                        │    │
    │                                                                         │    │
    │                                      POST /webhooks/brevo/delivered    │    │
    │                                          │                              │    │
    │                                          │  ◄─────────────────────────────┘
    │                                          │
    │                                          ├──► Find EmailLog by messageId
    │                                          ├──► Update deliveryStatus
    │                                          └──► Save
    │
    │
    └──► Email delivery status updated automatically
```

---

## Security Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         Security Layers                                │
└───────────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
═════════════════════════
┌─────────────────────────────────┐
│ HTTPS/TLS 1.3                   │
│ - Certificate validation        │
│ - End-to-end encryption         │
└─────────────────────────────────┘


Layer 2: API Gateway
════════════════════
┌─────────────────────────────────┐
│ Rate Limiting                   │
│ - 100 req/15min per IP          │
│ - 50 emails/hour per user       │
│                                 │
│ CORS                            │
│ - Allowed origins only          │
│ - Credentials: true             │
│                                 │
│ Helmet                          │
│ - CSP headers                   │
│ - XSS protection                │
└─────────────────────────────────┘


Layer 3: Authentication
═══════════════════════
┌─────────────────────────────────┐
│ JWT Verification                │
│ ┌─────────────────────────────┐ │
│ │ 1. Extract token            │ │
│ │ 2. Verify signature         │ │
│ │ 3. Check expiration         │ │
│ │ 4. Extract user context     │ │
│ └─────────────────────────────┘ │
│                                 │
│ API Key Validation              │
│ ┌─────────────────────────────┐ │
│ │ 1. Extract API key          │ │
│ │ 2. Compare with env secret  │ │
│ │ 3. Grant service access     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘


Layer 4: Authorization (RBAC)
═════════════════════════════
┌─────────────────────────────────┐
│ Role Hierarchy                  │
│                                 │
│   Platform Admin (highest)      │
│         ↓                       │
│     GP Admin                    │
│         ↓                       │
│     GP User                     │
│         ↓                       │
│     Founder                     │
│         ↓                       │
│       LP                        │
│         ↓                       │
│     User (lowest)               │
│                                 │
│ Permission Matrix               │
│ ┌─────────────────────────────┐ │
│ │ Check user role             │ │
│ │ Check endpoint permissions  │ │
│ │ Check resource ownership    │ │
│ │ Grant/Deny access           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘


Layer 5: Input Validation
═════════════════════════
┌─────────────────────────────────┐
│ express-validator               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Email format (RFC 5322)     │ │
│ │ String length limits        │ │
│ │ Required fields present     │ │
│ │ Data type validation        │ │
│ │ XSS prevention (escape)     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘


Layer 6: Data Protection
════════════════════════
┌─────────────────────────────────┐
│ OAuth Token Encryption          │
│ ┌─────────────────────────────┐ │
│ │ Algorithm: AES-256-GCM      │ │
│ │ Key: 64-char hex string     │ │
│ │ IV: Random 16 bytes         │ │
│ │ Auth Tag: Integrity check   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Invitation Token Generation     │
│ ┌─────────────────────────────┐ │
│ │ crypto.randomBytes(32)      │ │
│ │ Cryptographically secure    │ │
│ │ 64-character hex token      │ │
│ └─────────────────────────────┘ │
│                                 │
│ Database Encryption             │
│ ┌─────────────────────────────┐ │
│ │ Encrypted at rest           │ │
│ │ TLS for connections         │ │
│ │ Parameterized queries       │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘


Layer 7: Audit & Monitoring
═══════════════════════════
┌─────────────────────────────────┐
│ Email Logging                   │
│ - All sends tracked             │
│ - Delivery status monitored     │
│ - 90-day retention              │
│                                 │
│ Error Tracking                  │
│ - Sentry integration            │
│ - Stack traces                  │
│ - User context                  │
│                                 │
│ Access Logging                  │
│ - Winston logger                │
│ - All API requests              │
│ - Failed auth attempts          │
└─────────────────────────────────┘
```

---

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                      Railway Production Environment                    │
└───────────────────────────────────────────────────────────────────────┘

Internet
   │
   │ HTTPS
   │
   ▼
┌─────────────────────────────────┐
│  Railway Load Balancer          │
│  - Auto-scaling (1-5 instances) │
│  - Health checks                │
│  - SSL termination              │
└────────────┬────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐
│Instance│ │Instance│ │Instance│
│   1    │ │   2    │ │   3    │
│        │ │        │ │        │
│Port    │ │Port    │ │Port    │
│3016    │ │3016    │ │3016    │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    └──────────┼──────────┘
               │
               │ MongoDB Connection
               │
               ▼
    ┌──────────────────────┐
    │   MongoDB Atlas      │
    │                      │
    │  Database:           │
    │  venturestudio       │
    │                      │
    │  Collections:        │
    │  - users             │
    │  - funds             │
    │  - companies         │
    │  - invitations       │
    │  - emaillogs         │
    │  - gmailconnections  │
    │  - receivedemails    │
    │                      │
    │  Replica Set (3)     │
    │  Auto-backup daily   │
    │  30-day retention    │
    └──────────────────────┘


External API Connections
════════════════════════

┌────────────────────┐          ┌────────────────────┐
│    Brevo API       │          │    Gmail API       │
│                    │          │                    │
│ api.brevo.com/v3   │          │ googleapis.com     │
│                    │          │                    │
│ Rate Limit:        │          │ Rate Limit:        │
│ - Free: 300/day    │          │ - 1B units/day     │
│ - Paid: Unlimited  │          │ - 250/user/sec     │
│                    │          │                    │
│ SLA: 99.9%         │          │ SLA: 99.95%        │
└────────────────────┘          └────────────────────┘
         ▲                               ▲
         │                               │
         │ HTTPS                         │ OAuth 2.0
         │                               │
         └───────────┬───────────────────┘
                     │
              Email Service
              (All Instances)


Background Workers
══════════════════

Each instance runs workers:

┌────────────────────────────────┐
│ Worker 1: Gmail Poll           │
│ - Cron: */5 * * * *            │
│ - Polls active connections     │
│ - Incremental sync             │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Worker 2: Email Retry          │
│ - Cron: */15 * * * *           │
│ - Retries failed emails        │
│ - Max 3 retries                │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Worker 3: Cleanup              │
│ - Cron: 0 2 * * *              │
│ - Purges old logs (90 days)    │
│ - Purges expired invitations   │
└────────────────────────────────┘


Monitoring & Alerts
═══════════════════

┌────────────────────────────────┐
│ Railway Metrics                │
│ - CPU usage                    │
│ - Memory usage                 │
│ - Request rate                 │
│ - Response time                │
│ - Error rate                   │
└────────────────────────────────┘
              │
              │ Alerts
              ▼
┌────────────────────────────────┐
│ Notification Channels          │
│ - Slack (critical)             │
│ - Email (daily digest)         │
│ - PagerDuty (incidents)        │
└────────────────────────────────┘
```

---

**END OF ARCHITECTURE DIAGRAMS**
