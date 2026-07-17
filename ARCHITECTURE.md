# Flora Email Service - Comprehensive Architecture

**Service Name:** `flora-email-service` (formerly `flora-invitations-service`)
**Version:** 2.0.0
**Status:** Architecture Designed - Implementation 15% Complete
**Document Version:** 1.0.0
**Last Updated:** 2026-07-17

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Domain Model](#domain-model)
4. [Service Boundaries](#service-boundaries)
5. [API Design](#api-design)
6. [Data Architecture](#data-architecture)
7. [Email Processing Pipeline](#email-processing-pipeline)
8. [Integration Architecture](#integration-architecture)
9. [Security Architecture](#security-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Migration Strategy](#migration-strategy)
12. [Deployment Architecture](#deployment-architecture)
13. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

### Purpose

The Flora Email Service is a comprehensive, production-grade microservice that consolidates ALL email functionality for the Flora Fund Management Platform. It serves as the central email hub for:

- **Transactional emails** (auth, notifications, confirmations)
- **Business-critical emails** (capital calls, distributions)
- **Workflow emails** (invitations, requests, approvals)
- **System emails** (maintenance, announcements)
- **CRM email tracking** (Gmail polling for received emails)

### Key Objectives

1. **Centralization**: Single source of truth for all email operations
2. **Reliability**: 99.9% delivery success rate with retry mechanisms
3. **Observability**: Complete audit trail of all email activity
4. **Scalability**: Support for bulk operations (1000+ emails/hour)
5. **Maintainability**: Clean separation of concerns, well-documented code
6. **Security**: OAuth 2.0, encrypted tokens, RBAC enforcement

### Architecture Principles

- **Domain-Driven Design**: Email operations as a bounded context
- **SOLID Principles**: Single responsibility, dependency inversion
- **Clean Architecture**: Layered design (Routes → Controllers → Services → Models)
- **API-First**: RESTful design with OpenAPI documentation
- **Event-Driven**: Async processing for bulk operations
- **Fail-Fast**: Input validation at API boundaries

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Flora Email Service (Port 3016)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     API Gateway Layer                           │ │
│  │  - Rate Limiting (100 req/15min per IP)                        │ │
│  │  - CORS (configurable origins)                                 │ │
│  │  - Request Validation (express-validator)                      │ │
│  │  - Health Checks (/health)                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Authentication Layer                          │ │
│  │  - JWT Verification (shared secret with main app)              │ │
│  │  - API Key Validation (internal service-to-service)            │ │
│  │  - User Context Resolution                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Authorization Layer (RBAC)                    │ │
│  │  - Role-based permissions (GP, LP, Admin, Founder)             │ │
│  │  - Resource-level access control                               │ │
│  │  - Context-aware permissions                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Route Layer (6 Groups)                     │ │
│  │                                                                  │ │
│  │  1. /api/v1/invitations              (Platform Invitations)    │ │
│  │  2. /api/v1/emails/auth              (Auth Emails)             │ │
│  │  3. /api/v1/emails/capital-calls     (Capital Calls)           │ │
│  │  4. /api/v1/emails/documents         (Document Workflows)      │ │
│  │  5. /api/v1/emails/invitation-requests (5-Step Workflow)       │ │
│  │  6. /api/v1/emails/system            (System Notifications)    │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Controller Layer (6 Controllers)            │ │
│  │                                                                  │ │
│  │  1. invitationController               (11 invitation types)   │ │
│  │  2. authEmailController                (3 auth email types)    │ │
│  │  3. capitalCallEmailController         (4 capital call types)  │ │
│  │  4. documentEmailController            (4 document types)      │ │
│  │  5. invitationRequestEmailController   (5 workflow steps)      │ │
│  │  6. systemEmailController              (3 system types)        │ │
│  │                                                                  │ │
│  │  Responsibilities:                                              │ │
│  │  - HTTP request/response handling                              │ │
│  │  - Input validation coordination                               │ │
│  │  - Business logic orchestration                                │ │
│  │  - Error handling & formatting                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Service Layer (5 Services)                 │ │
│  │                                                                  │ │
│  │  1. emailService         - Brevo API integration, retry logic  │ │
│  │  2. templateService      - Handlebars rendering, caching       │ │
│  │  3. contextService       - Sender context resolution           │ │
│  │  4. auditService         - Email logging, analytics            │ │
│  │  5. gmailPollingService  - Gmail OAuth, polling, CRM sync      │ │
│  │                                                                  │ │
│  │  Responsibilities:                                              │ │
│  │  - Core business logic                                         │ │
│  │  - External service integration                                │ │
│  │  - Transaction management                                      │ │
│  │  - Caching & optimization                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                       Model Layer (4 Models)                    │ │
│  │                                                                  │ │
│  │  1. PlatformInvitation  - Invitation lifecycle & tokens        │ │
│  │  2. EmailLog            - Email audit trail & delivery status  │ │
│  │  3. GmailConnection     - OAuth tokens & sync state            │ │
│  │  4. ReceivedEmail       - Inbound email tracking (CRM)         │ │
│  │                                                                  │ │
│  │  Features:                                                      │ │
│  │  - Mongoose schemas with validation                            │ │
│  │  - Instance methods for business logic                         │ │
│  │  - Static methods for queries                                  │ │
│  │  - Compound indexes for performance                            │ │
│  │  - TTL indexes for auto-cleanup                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Background Workers (3 Workers)               │ │
│  │                                                                  │ │
│  │  1. gmailPollWorker      - Polls Gmail every 5 mins            │ │
│  │  2. emailRetryWorker     - Retries failed sends                │ │
│  │  3. cleanupWorker        - Purges old logs (90 day retention)  │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
        ┌──────────────────────┴────────────────────────┐
        │                                                 │
    ┌───▼────────┐         ┌──────────┐         ┌───────▼──────┐
    │  MongoDB   │         │ Brevo API│         │ Gmail OAuth  │
    │ venturestudio│        │ (Sending)│         │ (Receiving)  │
    │  Database  │         │          │         │              │
    └────────────┘         └──────────┘         └──────────────┘
```

### Layer Responsibilities

#### 1. API Gateway Layer
- Rate limiting per IP/user
- CORS configuration
- Request size limits (10MB)
- Health check endpoints
- Request/response logging

#### 2. Authentication Layer
- JWT token verification (shared with main app)
- API key validation (service-to-service)
- User context extraction
- Token expiration handling

#### 3. Authorization Layer (RBAC)
- Role-based permissions
- Resource ownership validation
- Context-aware access control
- Permission caching

#### 4. Route Layer
- RESTful endpoint definitions
- Path parameter validation
- Query parameter handling
- HTTP method routing

#### 5. Controller Layer
- Request validation orchestration
- Service method invocation
- Response formatting
- Error handling & logging

#### 6. Service Layer
- Business logic execution
- External API integration
- Database transactions
- Caching strategies

#### 7. Model Layer
- Data validation
- Business rules enforcement
- Query optimization
- Relationship management

---

## Domain Model

### Core Entities

#### 1. Email Message (Abstract)

Represents any email sent or received by the system.

```typescript
interface EmailMessage {
  emailType: EmailType;
  recipient: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateUsed?: string;
  attachments?: Attachment[];
  metadata: Record<string, any>;
  sentAt: Date;
  deliveryStatus: DeliveryStatus;
  brevoMessageId?: string;
  retries: number;
}

enum EmailType {
  // Invitations
  INVITATION = 'invitation',
  INVITATION_REMINDER = 'invitation_reminder',

  // Auth
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  WELCOME = 'welcome',

  // Capital Calls
  CAPITAL_CALL = 'capital_call',
  DISTRIBUTION_NOTICE = 'distribution_notice',
  CAPITAL_CALL_REMINDER = 'capital_call_reminder',

  // Documents
  DOCUMENT_UPLOAD = 'document_upload',
  SIGNATURE_REQUEST = 'signature_request',
  SIGNATURE_COMPLETE = 'signature_complete',
  SIGNATURE_REMINDER = 'signature_reminder',

  // Invitation Requests
  INVITATION_REQUEST_CONFIRMATION = 'invitation_request_confirmation',
  INVITATION_REQUEST_ADMIN = 'invitation_request_admin',
  INVITATION_REQUEST_APPROVED = 'invitation_request_approved',
  INVITATION_REQUEST_DENIED = 'invitation_request_denied',
  INVITATION_REQUEST_FOLLOWUP = 'invitation_request_followup',

  // System
  MAINTENANCE_NOTIFICATION = 'maintenance_notification',
  ANNOUNCEMENT = 'announcement',
  BULK_EMAIL = 'bulk_email'
}

enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}
```

#### 2. Platform Invitation

Represents an invitation to join the Flora platform.

```typescript
interface PlatformInvitation {
  invitationId: string;           // Unique ID (UUID)
  inviteeEmail: string;            // Required
  inviteeName: string;             // Required
  role: UserRole;                  // gp, lp, admin, founder, user
  status: InvitationStatus;        // pending, accepted, expired, revoked

  // Token Management
  token: string;                   // Crypto-secure 32-byte token
  tokenExpiresAt: Date;            // 7 days default

  // Sender Context
  senderContext: SenderContext;    // Who sent it

  // LP-Specific
  lpEntityInfo?: {
    entityType: 'person' | 'institution';
    fundId?: ObjectId;
    portfolioCompanyId?: ObjectId;
  };

  // Metadata
  personalMessage?: string;
  sentAt: Date;
  acceptedAt?: Date;
  remindersSent: number;
  lastReminderAt?: Date;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface SenderContext {
  contextType: 'fund' | 'lp_entity' | 'company' | 'platform';
  contextId: ObjectId;
  contextName: string;
  contextDescription?: string;
}

enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}
```

#### 3. Email Log

Complete audit trail for all sent emails.

```typescript
interface EmailLog {
  emailType: EmailType;
  recipient: string;
  recipientName?: string;
  subject: string;
  templateUsed?: string;

  // Delivery Tracking
  brevoMessageId?: string;
  sentAt: Date;
  deliveryStatus: DeliveryStatus;
  deliveryStatusUpdatedAt?: Date;

  // Retry Management
  retries: number;
  errorMessage?: string;
  errorStack?: string;

  // Attachments
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;

  // Relationships
  relatedInvitation?: ObjectId;
  relatedUser?: ObjectId;
  relatedFund?: ObjectId;
  relatedCompany?: ObjectId;

  // Sender Info
  senderEmail: string;
  senderName: string;

  // Provider Details
  provider: 'brevo' | 'sendgrid' | 'aws_ses';

  // Cost Tracking
  estimatedCost?: number;
  rateLimitBucket?: string;

  // Metadata
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. Gmail Connection (CRM Integration)

Tracks Gmail OAuth connections for email polling.

```typescript
interface GmailConnection {
  userId: ObjectId;
  email: string;

  // OAuth Tokens (encrypted)
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;

  // Sync State
  syncStatus: 'active' | 'paused' | 'error' | 'disconnected';
  lastSyncDate?: Date;
  lastHistoryId?: string;
  syncError?: {
    message: string;
    code: string;
    timestamp: Date;
  };

  // Statistics
  stats: {
    totalEmailsReceived: number;
    totalEmailsSent: number;
    lastEmailDate?: Date;
  };

  // Flags
  isActive: boolean;
  autoSync: boolean;
  syncFrequency: number;  // minutes

  createdAt: Date;
  updatedAt: Date;
}
```

#### 5. Received Email (CRM)

Stores emails received via Gmail polling.

```typescript
interface ReceivedEmail {
  connectionId: ObjectId;
  userId: ObjectId;

  // Gmail Data
  gmailMessageId: string;
  gmailThreadId: string;
  historyId: string;

  // Email Content
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;

  // Metadata
  receivedAt: Date;
  labels: string[];
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;

  // CRM Integration
  contactId?: ObjectId;
  dealId?: ObjectId;
  tags: string[];

  // Flags
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Service Boundaries

### What This Service Owns

1. **Email Delivery**
   - All transactional email sending
   - Template rendering and personalization
   - Delivery retry logic
   - Bounce handling

2. **Email Tracking**
   - Sent email audit logs
   - Delivery status tracking
   - Open/click tracking (Brevo webhooks)
   - Email analytics

3. **Invitation Management**
   - Invitation creation and lifecycle
   - Token generation and validation
   - Sender context resolution
   - Reminder scheduling

4. **Gmail Integration (CRM)**
   - OAuth connection management
   - Email polling and syncing
   - Received email storage
   - CRM contact linking

5. **Email Templates**
   - Template storage and versioning
   - Handlebars rendering
   - Variable interpolation
   - Template caching

### What This Service Does NOT Own

1. **User Management**
   - User creation/deletion (main app)
   - User authentication (main app)
   - User profile data (main app)

2. **Fund/Company Data**
   - Fund creation and management (main app)
   - Company data (main app)
   - LP entity management (main app)

3. **Capital Call Processing**
   - Capital call calculation (main app)
   - Wire instruction generation (main app)
   - Payment tracking (main app)

4. **Document Management**
   - Document upload/storage (main app)
   - Signature processing (main app)
   - Document versioning (main app)

### Integration Points

```
Main App                          Email Service
========                          =============

User Registration        →        Send Welcome Email
Password Reset Request   →        Send Reset Email
Email Verification       →        Send Verification Email

Capital Call Created     →        Send Capital Call Notice
Distribution Created     →        Send Distribution Notice

Document Uploaded        →        Send Upload Notification
Signature Requested      →        Send Signature Request

Invitation Created       →        Store & Send Invitation
Invitation Accepted      ←        Validate Token, Update Status

Gmail Polling            ←        Poll Gmail API
Email Received           →        Store in ReceivedEmail model
```

---

## API Design

### API Versioning Strategy

- **Current Version**: v1
- **Base Path**: `/api/v1`
- **Versioning Method**: URL path versioning
- **Backward Compatibility**: Maintain v1 for minimum 12 months after v2 release

### Endpoint Structure

#### 1. Invitations API

```
POST   /api/v1/invitations                    # Create invitation
GET    /api/v1/invitations                    # List invitations
GET    /api/v1/invitations/:id                # Get invitation details
PATCH  /api/v1/invitations/:id                # Update invitation
DELETE /api/v1/invitations/:id                # Revoke invitation
POST   /api/v1/invitations/:id/resend         # Resend invitation
POST   /api/v1/invitations/validate-token     # Validate invitation token
POST   /api/v1/invitations/accept             # Accept invitation
```

#### 2. Auth Emails API

```
POST   /api/v1/emails/auth/password-reset     # Send password reset
POST   /api/v1/emails/auth/email-verification # Send email verification
POST   /api/v1/emails/auth/resend-verification # Resend verification
POST   /api/v1/emails/auth/welcome            # Send welcome email
```

#### 3. Capital Call Emails API

```
POST   /api/v1/emails/capital-calls/send      # Send capital call
POST   /api/v1/emails/capital-calls/distribution # Send distribution
POST   /api/v1/emails/capital-calls/bulk      # Bulk capital calls
POST   /api/v1/emails/capital-calls/reminder  # Send reminder
```

#### 4. Document Emails API

```
POST   /api/v1/emails/documents/upload-notification  # Upload notification
POST   /api/v1/emails/documents/signature-request    # Signature request
POST   /api/v1/emails/documents/signature-complete   # Signature complete
POST   /api/v1/emails/documents/signature-reminder   # Signature reminder
```

#### 5. Invitation Request Emails API

```
POST   /api/v1/emails/invitation-requests/confirmation       # Step 1
POST   /api/v1/emails/invitation-requests/admin-notification # Step 2
POST   /api/v1/emails/invitation-requests/approved           # Step 3
POST   /api/v1/emails/invitation-requests/denied             # Step 4
POST   /api/v1/emails/invitation-requests/followup           # Step 5
```

#### 6. System Emails API

```
POST   /api/v1/emails/system/maintenance      # Maintenance notification
POST   /api/v1/emails/system/announcement     # System announcement
POST   /api/v1/emails/system/bulk             # Bulk email sending
```

#### 7. Email Logs API (Analytics)

```
GET    /api/v1/email-logs                     # List email logs
GET    /api/v1/email-logs/:id                 # Get log details
GET    /api/v1/email-logs/stats               # Email statistics
GET    /api/v1/email-logs/recipient/:email    # Logs by recipient
```

#### 8. Gmail Integration API (CRM)

```
GET    /api/v1/gmail/auth-url                 # Get OAuth URL
GET    /api/v1/gmail/callback                 # OAuth callback
GET    /api/v1/gmail/connections              # List connections
GET    /api/v1/gmail/connections/:id          # Get connection
DELETE /api/v1/gmail/connections/:id          # Disconnect Gmail
POST   /api/v1/gmail/connections/:id/sync     # Manual sync
GET    /api/v1/gmail/emails                   # List received emails
GET    /api/v1/gmail/emails/:id               # Get email details
```

### Request/Response Formats

#### Standard Success Response

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-07-17T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### Standard Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  },
  "metadata": {
    "timestamp": "2026-07-17T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### Pagination Format

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 235,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Example API Calls

#### Create Invitation

```http
POST /api/v1/invitations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "inviteeEmail": "lp@example.com",
  "inviteeName": "John Smith",
  "role": "lp",
  "senderContext": {
    "contextType": "fund",
    "contextId": "60f7b3b3b3b3b3b3b3b3b3b3"
  },
  "lpEntityInfo": {
    "entityType": "person",
    "fundId": "60f7b3b3b3b3b3b3b3b3b3b3"
  },
  "personalMessage": "Looking forward to having you onboard!"
}
```

#### Send Password Reset Email

```http
POST /api/v1/emails/auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "resetToken": "abc123def456",
  "resetUrl": "https://flora.passbook.vc/reset-password?token=abc123def456"
}
```

#### Send Capital Call

```http
POST /api/v1/emails/capital-calls/send
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "lpEmail": "lp@example.com",
  "lpName": "John Smith",
  "fundName": "Growth Fund I",
  "callAmount": 500000,
  "callNumber": 3,
  "dueDate": "2026-08-15",
  "wireInstructions": {
    "bankName": "Chase Bank",
    "accountNumber": "1234567890",
    "routingNumber": "021000021"
  },
  "attachments": [{
    "filename": "capital_call_003.pdf",
    "url": "https://s3.../capital_call_003.pdf",
    "contentType": "application/pdf"
  }]
}
```

---

## Data Architecture

### Database Schema

#### MongoDB Collections

1. **platforminvitations** - Invitation management
2. **emaillogs** - Email audit trail
3. **gmailconnections** - OAuth connections
4. **receivedemails** - Inbound emails (CRM)

#### Schema Definitions

**PlatformInvitation Schema**

```javascript
{
  invitationId: { type: String, required: true, unique: true, index: true },
  inviteeEmail: { type: String, required: true, lowercase: true, index: true },
  inviteeName: { type: String, required: true },
  role: { type: String, enum: ['gp', 'lp', 'admin', 'founder', 'user'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending', index: true },

  // Token
  token: { type: String, required: true, unique: true, index: true },
  tokenExpiresAt: { type: Date, required: true, index: true },

  // Sender Context
  senderContext: {
    contextType: { type: String, enum: ['fund', 'lp_entity', 'company', 'platform'], required: true },
    contextId: { type: Schema.Types.ObjectId, required: true },
    contextName: { type: String, required: true },
    contextDescription: String
  },

  // LP Entity Info (optional)
  lpEntityInfo: {
    entityType: { type: String, enum: ['person', 'institution'] },
    fundId: Schema.Types.ObjectId,
    portfolioCompanyId: Schema.Types.ObjectId
  },

  // Metadata
  personalMessage: String,
  sentAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: Date,

  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}

// Indexes
invitationId: 1 (unique)
inviteeEmail: 1
token: 1 (unique)
status: 1
tokenExpiresAt: 1
{ inviteeEmail: 1, status: 1 }
{ senderContext.contextType: 1, senderContext.contextId: 1 }
{ createdBy: 1, createdAt: -1 }

// TTL Index (auto-delete expired invitations after 90 days)
tokenExpiresAt: 1 (expireAfterSeconds: 7776000)
```

**EmailLog Schema**

```javascript
{
  emailType: { type: String, enum: [27 email types], required: true, index: true },
  recipient: { type: String, required: true, lowercase: true, index: true },
  recipientName: String,
  subject: { type: String, required: true },
  templateUsed: String,

  // Delivery
  brevoMessageId: { type: String, index: true, sparse: true },
  sentAt: { type: Date, default: Date.now, index: true },
  deliveryStatus: { type: String, enum: ['sent', 'delivered', 'bounced', 'failed', 'pending'], default: 'sent', index: true },
  deliveryStatusUpdatedAt: Date,

  // Retry
  retries: { type: Number, default: 0, min: 0 },
  errorMessage: String,
  errorStack: String,

  // Attachments
  attachments: [{
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    url: String
  }],

  // Relationships
  relatedInvitation: { type: Schema.Types.ObjectId, ref: 'PlatformInvitation', sparse: true },
  relatedUser: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  relatedFund: { type: Schema.Types.ObjectId, ref: 'Fund', sparse: true },
  relatedCompany: { type: Schema.Types.ObjectId, ref: 'StudioCompany', sparse: true },

  // Sender
  senderEmail: { type: String, lowercase: true },
  senderName: String,

  // Provider
  provider: { type: String, default: 'brevo', enum: ['brevo', 'sendgrid', 'aws_ses', 'other'] },

  // Cost & Rate Limiting
  estimatedCost: { type: Number, min: 0 },
  rateLimitBucket: { type: String, index: true },

  // Metadata
  metadata: { type: Schema.Types.Mixed, default: {} },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}

// Indexes
{ emailType: 1, sentAt: -1 }
{ recipient: 1, sentAt: -1 }
{ deliveryStatus: 1, sentAt: -1 }
{ brevoMessageId: 1 } (sparse)
{ relatedInvitation: 1 } (sparse)
{ createdAt: -1 }
{ emailType: 1, deliveryStatus: 1 }

// TTL Index (auto-delete old logs after 90 days)
createdAt: 1 (expireAfterSeconds: 7776000)
```

**GmailConnection Schema**

```javascript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true },

  // OAuth (encrypted)
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiresAt: { type: Date, required: true },

  // Sync State
  syncStatus: { type: String, enum: ['active', 'paused', 'error', 'disconnected'], default: 'active', index: true },
  lastSyncDate: Date,
  lastHistoryId: String,
  syncError: {
    message: String,
    code: String,
    timestamp: Date
  },

  // Statistics
  stats: {
    totalEmailsReceived: { type: Number, default: 0 },
    totalEmailsSent: { type: Number, default: 0 },
    lastEmailDate: Date
  },

  // Flags
  isActive: { type: Boolean, default: true, index: true },
  autoSync: { type: Boolean, default: true },
  syncFrequency: { type: Number, default: 5 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}

// Indexes
{ userId: 1, isActive: 1 }
{ email: 1 } (unique)
{ syncStatus: 1, autoSync: 1 }
```

**ReceivedEmail Schema**

```javascript
{
  connectionId: { type: Schema.Types.ObjectId, ref: 'GmailConnection', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Gmail
  gmailMessageId: { type: String, required: true, unique: true, index: true },
  gmailThreadId: { type: String, required: true, index: true },
  historyId: { type: String, required: true },

  // Content
  from: { type: String, required: true, lowercase: true, index: true },
  to: [{ type: String, lowercase: true }],
  cc: [{ type: String, lowercase: true }],
  bcc: [{ type: String, lowercase: true }],
  subject: { type: String, required: true },
  snippet: { type: String, required: true },
  bodyText: String,
  bodyHtml: String,

  // Metadata
  receivedAt: { type: Date, required: true, index: true },
  labels: [String],
  attachments: [{
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String
  }],

  // CRM
  contactId: { type: Schema.Types.ObjectId, ref: 'Contact', sparse: true },
  dealId: { type: Schema.Types.ObjectId, ref: 'Deal', sparse: true },
  tags: [String],

  // Flags
  isRead: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  isImportant: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}

// Indexes
{ gmailMessageId: 1 } (unique)
{ connectionId: 1, receivedAt: -1 }
{ userId: 1, receivedAt: -1 }
{ from: 1, receivedAt: -1 }
{ gmailThreadId: 1, receivedAt: -1 }
{ isRead: 1, receivedAt: -1 }
```

### Data Retention Policies

1. **EmailLog**: 90 days (auto-delete via TTL index)
2. **PlatformInvitation**: 90 days after expiration (TTL index)
3. **ReceivedEmail**: Indefinite (user-controlled deletion)
4. **GmailConnection**: Indefinite (until user disconnects)

### Backup Strategy

- **Frequency**: Daily automated backups
- **Retention**: 30 days of daily backups
- **Storage**: Railway Buckets (S3-compatible)
- **Recovery Point Objective (RPO)**: 24 hours
- **Recovery Time Objective (RTO)**: 4 hours

---

## Email Processing Pipeline

### Outbound Email Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Outbound Email Pipeline                       │
└─────────────────────────────────────────────────────────────────┘

1. Request Received
   ↓
2. Authentication & Authorization
   ↓
3. Input Validation
   ↓
4. Template Selection
   ↓
5. Variable Preparation
   ↓
6. Template Rendering (Handlebars)
   ↓
7. Email Composition
   ↓
8. Brevo API Call
   ↓
9. Log Email Sent (EmailLog)
   ↓
10. Return Response
```

### Detailed Processing Steps

#### Step 1: Request Received
- Parse HTTP request
- Extract headers and body
- Log incoming request

#### Step 2: Authentication & Authorization
- Verify JWT token (if authenticated endpoint)
- Validate API key (if service-to-service)
- Check user permissions (RBAC)

#### Step 3: Input Validation
- Validate required fields
- Check email format
- Validate data types
- Check business rules

#### Step 4: Template Selection
- Determine email type
- Select appropriate Handlebars template
- Load template from cache or disk

#### Step 5: Variable Preparation
- Extract template variables from request
- Fetch additional data (e.g., sender context)
- Format data for template rendering

#### Step 6: Template Rendering
- Compile Handlebars template
- Inject variables
- Generate HTML content
- Generate plain text fallback

#### Step 7: Email Composition
- Set sender (from Brevo config)
- Set recipient
- Set subject line
- Attach files (if any)
- Add tracking parameters

#### Step 8: Brevo API Call
- POST to Brevo `/smtp/email` endpoint
- Include API key in headers
- Implement retry logic (exponential backoff)
- Handle Brevo errors

#### Step 9: Log Email Sent
- Create EmailLog document
- Store Brevo message ID
- Record send time
- Link to related entities

#### Step 10: Return Response
- Format success/error response
- Include message ID
- Return HTTP 200/500

### Inbound Email Flow (Gmail Polling)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Inbound Email Pipeline (CRM)                  │
└─────────────────────────────────────────────────────────────────┘

1. Background Worker Runs (every 5 minutes)
   ↓
2. Fetch Active Gmail Connections
   ↓
3. For Each Connection:
   ↓
4. Refresh OAuth Token (if expired)
   ↓
5. Call Gmail API (history.list)
   ↓
6. Fetch New Messages
   ↓
7. Parse Email Content
   ↓
8. Extract Attachments
   ↓
9. Store in ReceivedEmail Model
   ↓
10. Update Connection Sync State
   ↓
11. Link to CRM Contacts (if match found)
```

### Retry Logic

#### Email Send Retries

```javascript
// Exponential backoff configuration
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,   // 1 second
  maxDelay: 30000,      // 30 seconds
  backoffMultiplier: 2
};

// Retry conditions
- Network errors (ECONNREFUSED, ETIMEDOUT)
- Brevo 5xx errors
- Rate limit errors (429)

// No retry conditions
- Invalid email format (400)
- Authentication errors (401)
- Insufficient permissions (403)
```

#### Gmail Polling Retries

```javascript
// OAuth token refresh retry
const oauthRetryConfig = {
  maxRetries: 2,
  delay: 5000  // 5 seconds
};

// Gmail API retry
const gmailApiRetryConfig = {
  maxRetries: 3,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2
};
```

---

## Integration Architecture

### Brevo Integration (Email Sending)

#### Configuration

```javascript
{
  apiKey: process.env.BREVO_API_KEY,
  apiUrl: 'https://api.brevo.com/v3',
  senderEmail: 'flora@passbook.vc',
  senderName: 'Passbook Flora',
  timeout: 30000
}
```

#### API Endpoints Used

1. **POST /smtp/email** - Send transactional email
2. **GET /smtp/emails/{messageId}** - Get delivery status
3. **POST /contacts** - Add contact to list
4. **POST /webhooks** - Receive delivery events

#### Webhook Events

```javascript
// Brevo webhooks for email events
{
  "request": {
    "delivered": "https://flora-email-service.railway.app/webhooks/brevo/delivered",
    "opened": "https://flora-email-service.railway.app/webhooks/brevo/opened",
    "clicked": "https://flora-email-service.railway.app/webhooks/brevo/clicked",
    "bounced": "https://flora-email-service.railway.app/webhooks/brevo/bounced",
    "spam": "https://flora-email-service.railway.app/webhooks/brevo/spam"
  }
}
```

### Gmail Integration (Email Receiving)

#### OAuth 2.0 Flow

```
1. User clicks "Connect Gmail"
   ↓
2. GET /api/v1/gmail/auth-url
   ↓
3. Redirect to Google OAuth consent screen
   ↓
4. User grants permissions
   ↓
5. Google redirects to /api/v1/gmail/callback?code=...
   ↓
6. Exchange code for tokens
   ↓
7. Store encrypted tokens in GmailConnection
   ↓
8. Start polling worker for this connection
```

#### Required OAuth Scopes

```javascript
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/userinfo.email'
];
```

#### Gmail API Endpoints Used

1. **GET /users/me/messages** - List messages
2. **GET /users/me/messages/{id}** - Get message details
3. **GET /users/me/history** - Get history (incremental sync)
4. **GET /users/me/messages/{id}/attachments/{attachmentId}** - Get attachment

### Main App Integration

#### Proxy Architecture

```javascript
// Main App (app.js)
const emailsProxyRouter = require('./routes/v1/emails-proxy');
app.use('/api/v1', emailsProxyRouter);

// Proxy forwards to Email Service
const EMAIL_SERVICE_URL = process.env.INVITATIONS_SERVICE_URL;

// Example: Password reset flow
// 1. User requests password reset (Main App)
// 2. Main App generates reset token
// 3. Main App calls Email Service via proxy
// 4. Email Service sends email via Brevo
// 5. Email Service logs email sent
// 6. Email Service returns success
```

#### Service Discovery

```javascript
// Environment-based service URLs
const serviceConfig = {
  development: 'http://localhost:3016',
  staging: 'https://flora-email-service-staging.railway.app',
  production: 'https://flora-email-service.railway.app'
};

const EMAIL_SERVICE_URL = serviceConfig[process.env.NODE_ENV] || serviceConfig.development;
```

---

## Security Architecture

### Authentication

#### JWT Verification

```javascript
// Shared JWT secret with main app
const JWT_SECRET = process.env.JWT_SECRET;

// Token validation
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, JWT_SECRET);

// User context extraction
req.user = {
  id: decoded.userId,
  email: decoded.email,
  role: decoded.role,
  permissions: decoded.permissions
};
```

#### API Key Validation

```javascript
// Service-to-service authentication
const API_KEY = process.env.INVITATIONS_SERVICE_API_KEY;

// Validate API key
const apiKey = req.headers['x-api-key'];
if (apiKey !== API_KEY) {
  throw new Error('Invalid API key');
}
```

### Authorization (RBAC)

#### Role Hierarchy

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

#### Permission Matrix

| Action | Platform Admin | GP Admin | GP User | Founder | LP | User |
|--------|----------------|----------|---------|---------|----|----|
| Create Invitation | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Send Capital Call | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Send Document Email | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Email Logs | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Connect Gmail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send System Email | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

#### RBAC Middleware

```javascript
// Check if user has required role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Usage
router.post('/emails/system/maintenance',
  authMiddleware,
  requireRole('platform_admin'),
  systemEmailController.sendMaintenanceNotification
);
```

### Data Encryption

#### OAuth Token Encryption

```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 64-char hex string
const ALGORITHM = 'aes-256-gcm';

// Encrypt OAuth tokens before storing
function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Decrypt when using
function decryptToken(encryptedToken) {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### Invitation Token Generation

```javascript
const crypto = require('crypto');

// Generate cryptographically secure token
function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Token validation
function validateToken(token) {
  return /^[a-f0-9]{64}$/.test(token);
}
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

// Email sending rate limiting (stricter)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 emails per hour per user
  keyGenerator: (req) => req.user.id,
  message: 'Email sending limit exceeded. Please try again later.'
});

// Apply limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/emails/', authMiddleware, emailLimiter);
```

### Input Sanitization

```javascript
const { body, validationResult } = require('express-validator');

// Email validation
const validateEmailRequest = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().escape().isLength({ min: 1, max: 100 }),
  body('subject').optional().trim().isLength({ max: 500 }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
```

---

## Performance & Scalability

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email Send Latency | < 2 seconds | p95 |
| API Response Time | < 500ms | p95 |
| Gmail Poll Frequency | 5 minutes | Configured |
| Bulk Email Throughput | 1000/hour | Sustained |
| Database Query Time | < 100ms | p95 |
| Template Render Time | < 50ms | p95 |

### Optimization Strategies

#### 1. Template Caching

```javascript
const NodeCache = require('node-cache');
const templateCache = new NodeCache({
  stdTTL: 3600,  // 1 hour
  checkperiod: 600  // Check every 10 minutes
});

// Cache compiled Handlebars templates
function getCachedTemplate(templateName) {
  let template = templateCache.get(templateName);

  if (!template) {
    const templatePath = path.join(__dirname, '../templates/emails', templateName);
    const source = fs.readFileSync(templatePath, 'utf8');
    template = Handlebars.compile(source);
    templateCache.set(templateName, template);
  }

  return template;
}
```

#### 2. Database Indexing

```javascript
// Critical indexes for performance
PlatformInvitation.index({ invitationId: 1 });
PlatformInvitation.index({ inviteeEmail: 1, status: 1 });
PlatformInvitation.index({ token: 1 });

EmailLog.index({ emailType: 1, sentAt: -1 });
EmailLog.index({ recipient: 1, sentAt: -1 });
EmailLog.index({ deliveryStatus: 1, sentAt: -1 });

ReceivedEmail.index({ connectionId: 1, receivedAt: -1 });
ReceivedEmail.index({ from: 1, receivedAt: -1 });
```

#### 3. Bulk Email Batching

```javascript
// Process bulk emails in batches
async function sendBulkEmails(recipients, templateData) {
  const BATCH_SIZE = 50;
  const BATCH_DELAY = 1000; // 1 second between batches

  const batches = chunkArray(recipients, BATCH_SIZE);
  const results = [];

  for (const batch of batches) {
    const promises = batch.map(recipient =>
      sendSingleEmail(recipient, templateData)
    );

    const batchResults = await Promise.allSettled(promises);
    results.push(...batchResults);

    // Delay between batches to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
  }

  return results;
}
```

#### 4. Connection Pooling

```javascript
// MongoDB connection pool
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
});
```

#### 5. Gmail Polling Optimization

```javascript
// Incremental sync using history API
async function pollGmail(connection) {
  const gmail = google.gmail({ version: 'v1', auth: getOAuthClient(connection) });

  // Use history.list for incremental updates
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: connection.lastHistoryId,
    historyTypes: ['messageAdded']
  });

  // Only fetch new messages
  const newMessages = response.data.history?.flatMap(h => h.messagesAdded || []);

  // Update last history ID
  connection.lastHistoryId = response.data.historyId;
  await connection.save();

  return newMessages;
}
```

### Scalability Architecture

#### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
│                    (Railway Auto-Scaling)                    │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │Instance1│       │Instance2│       │Instance3│
    │Port 3016│       │Port 3016│       │Port 3016│
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                ┌──────────▼──────────┐
                │   MongoDB Cluster   │
                │  (Shared Database)  │
                └─────────────────────┘
```

#### Auto-Scaling Configuration

```javascript
// Railway auto-scaling config
{
  "services": [{
    "name": "flora-email-service",
    "minInstances": 1,
    "maxInstances": 5,
    "scaling": {
      "metric": "cpu",
      "target": 70,  // Scale up at 70% CPU
      "cooldown": 300  // 5 minute cooldown
    }
  }]
}
```

#### Background Worker Scaling

```javascript
// Distribute Gmail polling across instances
const workerId = process.env.RAILWAY_INSTANCE_ID || '0';
const totalWorkers = process.env.RAILWAY_REPLICA_COUNT || '1';

// Each instance handles a subset of connections
const connections = await GmailConnection.find({ isActive: true });
const myConnections = connections.filter((conn, index) =>
  index % totalWorkers === parseInt(workerId)
);

// Poll only assigned connections
for (const connection of myConnections) {
  await pollGmail(connection);
}
```

---

## Migration Strategy

### Phase 1: Service Renaming (Day 1)

**Goal**: Rename service from `flora-invitations-service` to `flora-email-service`

**Steps**:
1. Rename GitHub repository
2. Update `package.json` name
3. Update Railway service name
4. Update environment variable `INVITATIONS_SERVICE_URL` → `EMAIL_SERVICE_URL`
5. Update all documentation references
6. Update submodule reference in main app
7. Test health endpoint returns new service name

**Risks**: Minimal - mostly cosmetic changes

**Rollback**: Git revert, redeploy

### Phase 2: Controller Implementation (Weeks 1-2)

**Goal**: Implement all email controller methods

**Priority Order**:
1. **Auth Email Controllers** (Week 1) - Most critical
   - `sendPasswordResetEmail()` - 4 hours
   - `sendEmailVerification()` - 3 hours
   - `sendWelcomeEmail()` - 3 hours
   - Testing - 4 hours

2. **Capital Call Email Controllers** (Week 1)
   - `sendCapitalCallNotice()` - 5 hours
   - `sendDistributionNotice()` - 4 hours
   - `sendBulkCapitalCalls()` - 6 hours
   - `sendCapitalCallReminder()` - 3 hours
   - Testing - 4 hours

3. **Document Email Controllers** (Week 2)
   - `sendDocumentUploadNotification()` - 3 hours
   - `sendSignatureRequest()` - 4 hours
   - `sendSignatureComplete()` - 3 hours
   - `sendSignatureReminder()` - 3 hours
   - Testing - 3 hours

4. **Invitation Request Email Controllers** (Week 2)
   - `sendRequestConfirmation()` - 3 hours
   - `sendAdminNotification()` - 3 hours
   - `sendApprovalNotification()` - 3 hours
   - `sendDenialNotification()` - 3 hours
   - `sendFollowupReminder()` - 3 hours
   - Testing - 4 hours

5. **System Email Controllers** (Week 2)
   - `sendMaintenanceNotification()` - 3 hours
   - `sendAnnouncement()` - 3 hours
   - `sendBulkEmails()` - 4 hours
   - Testing - 2 hours

**Risks**: Feature incomplete, bugs in email rendering

**Rollback**: Feature flags, incremental rollout

### Phase 3: Email Service Expansion (Week 3)

**Goal**: Enhance `emailService.js` with new capabilities

**Tasks**:
1. Add template rendering for all email types - 4 hours
2. Implement attachment support - 3 hours
3. Add bulk send with rate limiting - 5 hours
4. Implement email tracking - 3 hours
5. Add Brevo webhook handling - 4 hours
6. Testing - 5 hours

**Risks**: Brevo API limits, delivery failures

**Rollback**: Revert to basic emailService

### Phase 4: Gmail Integration (CRM) (Week 4)

**Goal**: Migrate Gmail polling from main app to email service

**Tasks**:
1. **Create GmailConnection Model** - 2 hours
2. **Create ReceivedEmail Model** - 2 hours
3. **Implement Gmail OAuth Flow** - 6 hours
   - Auth URL generation
   - OAuth callback handling
   - Token refresh logic
4. **Implement Gmail Polling Service** - 8 hours
   - History API integration
   - Message fetching
   - Attachment handling
   - Incremental sync
5. **Create Background Worker** - 4 hours
   - Cron job (every 5 minutes)
   - Error handling
   - Rate limit management
6. **Implement Gmail API Routes** - 4 hours
7. **Testing** - 6 hours

**Migration Steps**:
1. Deploy Gmail integration to email service
2. Create migration script to move existing GmailConnection data
3. Update main app to proxy Gmail requests to email service
4. Monitor for 1 week
5. Remove Gmail code from main app

**Risks**: Data loss during migration, OAuth token issues

**Rollback**: Keep main app Gmail code active for 2 weeks

### Phase 5: Main App Integration (Week 5)

**Goal**: Update main app to use email service for all emails

**Tasks**:
1. **Update Email Proxy Routes** - 3 hours
   - Add new email type endpoints
   - Update existing proxies
2. **Update Controllers in Main App** - 6 hours
   - `authController.js` - replace direct email calls
   - `capitalCallController.js` - replace email calls
   - `documentController.js` - replace email calls
   - `invitationRequestController.js` - replace email calls
3. **Environment Variable Updates** - 1 hour
4. **Testing Integration** - 8 hours
   - End-to-end flow testing
   - Error scenario testing
5. **Documentation Updates** - 3 hours

**Risks**: Breaking existing email functionality

**Rollback**: Feature flags to toggle between old/new email sending

### Phase 6: Testing & Quality Assurance (Week 6)

**Goal**: Comprehensive testing before production rollout

**Tasks**:
1. **Unit Tests** - 12 hours
   - Controller tests (6 controllers × 2 hours)
2. **Integration Tests** - 12 hours
   - Full email flow tests
   - Gmail polling tests
   - Webhook tests
3. **Load Testing** - 6 hours
   - Bulk email sending (1000 emails)
   - Concurrent request handling
   - Database performance
4. **Security Testing** - 4 hours
   - RBAC enforcement
   - OAuth token security
   - Input validation
5. **Manual Testing** - 8 hours
   - Send test emails for all 27 types
   - Verify email rendering
   - Check delivery tracking
   - Test Gmail sync

**Risks**: Undiscovered bugs, performance issues

**Rollback**: N/A (testing phase)

### Phase 7: Staging Deployment (Week 7)

**Goal**: Deploy to staging environment for final validation

**Tasks**:
1. **Deploy Email Service to Railway Staging** - 2 hours
2. **Update Main App Staging Environment** - 2 hours
3. **Run Smoke Tests** - 4 hours
4. **Monitor Logs for 3 Days** - 6 hours
5. **Fix Any Issues** - 8 hours

**Risks**: Staging-specific issues not caught in dev

**Rollback**: Rollback staging to previous version

### Phase 8: Production Rollout (Week 8)

**Goal**: Safely deploy to production with zero downtime

**Strategy**: Blue-Green Deployment

**Steps**:
1. **Deploy Email Service (Green)** - 2 hours
   - Deploy new version alongside old
   - Verify health checks pass
2. **Update Main App Configuration** - 1 hour
   - Point 10% of traffic to new service (canary)
3. **Monitor for 24 Hours** - 8 hours
   - Check error rates
   - Monitor email delivery
   - Review logs
4. **Increase Traffic Gradually** - 3 days
   - Day 1: 10% → 25%
   - Day 2: 25% → 50%
   - Day 3: 50% → 100%
5. **Decommission Old Service** - 2 hours
   - After 1 week of stable operation

**Rollback Plan**:
- **Immediate**: Route traffic back to old service (< 5 minutes)
- **Quick**: Rollback Railway deployment (< 15 minutes)
- **Full**: Restore from backup (< 4 hours)

### Migration Timeline Summary

| Phase | Duration | Completion % | Risk Level |
|-------|----------|--------------|------------|
| Phase 1: Service Renaming | Day 1 | 5% | Low |
| Phase 2: Controller Implementation | Weeks 1-2 | 40% | Medium |
| Phase 3: Email Service Expansion | Week 3 | 55% | Medium |
| Phase 4: Gmail Integration (CRM) | Week 4 | 70% | High |
| Phase 5: Main App Integration | Week 5 | 80% | High |
| Phase 6: Testing & QA | Week 6 | 90% | Low |
| Phase 7: Staging Deployment | Week 7 | 95% | Medium |
| Phase 8: Production Rollout | Week 8 | 100% | High |

**Total Duration**: 8 weeks (2 months)

---

## Deployment Architecture

### Railway Configuration

#### Service Configuration

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "healthcheck": {
    "path": "/health",
    "timeout": 10,
    "interval": 30
  }
}
```

#### Environment Variables

```bash
# Core Configuration
NODE_ENV=production
PORT=3016

# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<shared-with-main-app>

# Brevo Configuration
BREVO_API_KEY=xkeysib-...
BREVO_API_URL=https://api.brevo.com/v3
BREVO_SENDER_EMAIL=flora@passbook.vc
BREVO_SENDER_NAME=Passbook Flora

# Gmail OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://flora-email-service.railway.app/api/v1/gmail/callback

# Frontend URL
FRONTEND_URL=https://flora.passbook.vc

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=https://flora.passbook.vc,https://admin.passbook.vc

# Logging
LOG_LEVEL=info

# Internal API
INVITATIONS_SERVICE_API_KEY=<internal-secret>

# Email Retry Configuration
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=1000
EMAIL_BATCH_SIZE=50
EMAIL_BATCH_DELAY=1000

# Encryption
ENCRYPTION_KEY=<64-char-hex-string>
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3016

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3016/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
```

---

## Monitoring & Observability

### Logging Strategy

#### Log Levels

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Log Categories

1. **Email Sent**
```javascript
logger.info('Email sent successfully', {
  emailType: 'password_reset',
  recipient: 'user@example.com',
  brevoMessageId: 'msg_123',
  duration: 1234
});
```

2. **Email Failed**
```javascript
logger.error('Email sending failed', {
  emailType: 'capital_call',
  recipient: 'lp@example.com',
  error: error.message,
  stack: error.stack,
  retries: 2
});
```

3. **Gmail Sync**
```javascript
logger.info('Gmail sync completed', {
  connectionId: 'conn_123',
  newMessages: 5,
  duration: 2345
});
```

4. **API Request**
```javascript
logger.debug('API request', {
  method: 'POST',
  path: '/api/v1/emails/auth/password-reset',
  userId: 'user_123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

### Metrics & Analytics

#### Key Performance Indicators (KPIs)

```javascript
// Collect metrics
const metrics = {
  emailsSentToday: 0,
  emailsFailedToday: 0,
  emailDeliveryRate: 0,
  averageSendTime: 0,
  gmailSyncErrors: 0,
  activeGmailConnections: 0
};

// Update metrics
function updateMetrics() {
  EmailLog.aggregate([
    {
      $match: {
        sentAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalFailed: {
          $sum: {
            $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0]
          }
        }
      }
    }
  ]).then(results => {
    metrics.emailsSentToday = results[0]?.totalSent || 0;
    metrics.emailsFailedToday = results[0]?.totalFailed || 0;
    metrics.emailDeliveryRate =
      (metrics.emailsSentToday - metrics.emailsFailedToday) /
      metrics.emailsSentToday * 100;
  });
}

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

### Health Checks

#### Comprehensive Health Endpoint

```javascript
app.get('/health', async (req, res) => {
  const health = {
    service: 'flora-email-service',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,

    // Component health
    components: {
      database: 'unknown',
      brevo: 'unknown',
      gmail: 'unknown'
    },

    // Metrics
    metrics: {
      emailsSent24h: 0,
      emailsFailed24h: 0,
      activeConnections: 0
    }
  };

  // Check MongoDB
  try {
    const mongoose = require('mongoose');
    health.components.database =
      mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.components.database = 'error';
  }

  // Check Brevo API
  try {
    const response = await axios.get(`${BREVO_API_URL}/account`, {
      headers: { 'api-key': BREVO_API_KEY }
    });
    health.components.brevo = response.status === 200 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.components.brevo = 'error';
  }

  // Check Gmail sync
  try {
    const activeConnections = await GmailConnection.countDocuments({
      isActive: true
    });
    health.components.gmail = 'healthy';
    health.metrics.activeConnections = activeConnections;
  } catch (error) {
    health.components.gmail = 'error';
  }

  // Get email metrics
  const emailStats = await EmailLog.aggregate([
    {
      $match: {
        sentAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: '$deliveryStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  health.metrics.emailsSent24h = emailStats.find(s => s._id === 'sent')?.count || 0;
  health.metrics.emailsFailed24h = emailStats.find(s => s._id === 'failed')?.count || 0;

  // Determine overall status
  const allHealthy = Object.values(health.components).every(c => c === 'healthy');
  const status = allHealthy ? 200 : 503;

  res.status(status).json(health);
});
```

### Error Tracking

#### Sentry Integration

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Capture errors
app.use(Sentry.Handlers.errorHandler());

// Custom error tracking
function trackEmailError(error, context) {
  Sentry.captureException(error, {
    tags: {
      emailType: context.emailType,
      recipient: context.recipient
    },
    extra: context
  });
}
```

### Alerting

#### Alert Conditions

1. **High Email Failure Rate**: > 5% failures in 1 hour
2. **Service Down**: Health check fails 3 times
3. **Database Connection Lost**: MongoDB disconnected
4. **Gmail Sync Errors**: > 10 sync errors in 1 hour
5. **High Latency**: p95 > 5 seconds

#### Alert Channels

- **Slack**: Critical alerts
- **Email**: Daily digest
- **PagerDuty**: Production incidents

---

## Appendix

### Glossary

- **Brevo**: Email service provider (formerly Sendinblue)
- **RBAC**: Role-Based Access Control
- **TTL**: Time To Live (auto-delete mechanism)
- **OAuth**: Open Authorization protocol
- **JWT**: JSON Web Token
- **Handlebars**: Template engine
- **Railway**: Cloud hosting platform

### References

1. [Flora Development Rules](/FLORA_DEVELOPMENT_RULES.md)
2. [Brevo API Documentation](https://developers.brevo.com/)
3. [Gmail API Documentation](https://developers.google.com/gmail/api)
4. [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
5. [Railway Documentation](https://docs.railway.app/)

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-17 | System Architect | Initial architecture document |

---

**END OF ARCHITECTURE DOCUMENT**
