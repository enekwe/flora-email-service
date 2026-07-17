# Flora Email Service

Comprehensive email microservice for the Flora Fund Management Platform. Handles all email types including invitations, authentication, capital calls, documents, invitation requests, and system notifications with sender context resolution, personalized templates, and reliable delivery via Brevo.

## Features

- **20+ Email Types**: Complete coverage for all Flora email workflows
  - Platform invitations (7 types: GP, LP, Admin, Founder, Generic)
  - Authentication (password reset, email verification, welcome)
  - Capital calls (notices, distributions, reminders, bulk)
  - Documents (upload, signature requests, completions, reminders)
  - Invitation requests (5-step workflow)
  - System notifications (maintenance, announcements, bulk)
- **Sender Context Resolution**: Automatically resolves sender context (GP fund, LP entity, Company, or Platform admin)
- **Personalized Email Templates**: Context-aware email templates using Handlebars
- **Brevo Integration**: Reliable email delivery via Brevo API with retry logic
- **LP Entity Tracking**: Distinguishes between individual and institutional LPs
- **RBAC**: Role-based access control at all API endpoints
- **Audit Logging**: Comprehensive logging of all email operations
- **Token Security**: Crypto-secure tokens with expiration
- **MongoDB Transactions**: Ensures data consistency for multi-step operations
- **Retry Logic**: Exponential backoff for failed email deliveries
- **Rate Limiting**: Protects against abuse (100 requests per 15 minutes)

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Flora Email Service                         │
│                    (flora-email-service)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                     API Routes Layer                      │ │
│  │  - /api/v1/invitations/*                                 │ │
│  │  - /api/v1/emails/auth/*                                 │ │
│  │  - /api/v1/emails/capital-calls/*                        │ │
│  │  - /api/v1/emails/documents/*                            │ │
│  │  - /api/v1/emails/invitation-requests/*                  │ │
│  │  - /api/v1/emails/system/*                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Middleware Layer                        │ │
│  │  - JWT Authentication                                     │ │
│  │  - RBAC (Role-Based Access Control)                      │ │
│  │  - Request Validation                                     │ │
│  │  - Rate Limiting                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Controllers Layer                        │ │
│  │  - invitationController                                   │ │
│  │  - authEmailController                                    │ │
│  │  - capitalCallEmailController                            │ │
│  │  - documentEmailController                               │ │
│  │  - invitationRequestEmailController                      │ │
│  │  - systemEmailController                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Services Layer                          │ │
│  │  - emailService (Brevo API)                              │ │
│  │  - templateService (Handlebars)                          │ │
│  │  - contextService (Sender resolution)                    │ │
│  │  - auditService (Logging)                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Models Layer                           │ │
│  │  - PlatformInvitation (MongoDB)                          │ │
│  │  - EmailAuditLog (future)                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        │                                      │
    ┌───▼────┐                          ┌─────▼──────┐
    │ MongoDB│                          │ Brevo API  │
    │        │                          │ (SendGrid) │
    └────────┘                          └────────────┘
```

Following the Flora Development Rules pattern:
- **Routes**: Define API endpoints with validation and RBAC
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic (context resolution, email delivery, audit)
- **Models**: Mongoose schemas with instance/static methods

## Directory Structure

```
/microservices/flora-invitations-service/
├── package.json
├── .env.example
├── Dockerfile
├── railway.json
├── README.md
├── src/
│   ├── server.js                    # Express app entry point
│   ├── config/
│   │   ├── database.js              # MongoDB with retry logic
│   │   ├── logger.js                # Winston logger
│   │   └── email.js                 # Brevo configuration
│   ├── models/
│   │   └── PlatformInvitation.js    # Enhanced invitation model
│   ├── routes/v1/
│   │   └── invitations.js           # API routes
│   ├── controllers/
│   │   └── invitationController.js  # Request handlers
│   ├── services/
│   │   ├── contextService.js        # Sender context resolution
│   │   ├── templateService.js       # Handlebars rendering
│   │   ├── emailService.js          # Brevo email delivery
│   │   └── auditService.js          # Audit logging
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication
│   │   ├── rbac.js                  # Role-based access control
│   │   ├── validation.js            # Request validation
│   │   └── errorHandler.js          # Global error handling
│   ├── templates/emails/
│   │   ├── admin-invitation.html
│   │   ├── gp-invitation.html
│   │   ├── lp-person-invitation.html
│   │   ├── lp-institution-invitation.html
│   │   └── founder-invitation.html
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   └── tests/
│       ├── integration/
│       └── setup.js
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18.x or higher
- MongoDB 6.x (accessible via TCP proxy for Railway)
- Brevo account with API key
- JWT_SECRET (shared with main Flora application)

### 2. Installation

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-invitations-service
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# Environment
NODE_ENV=production
PORT=3015

# MongoDB (Use TCP proxy URL for Railway)
MONGODB_URI=mongodb://username:password@metro.proxy.rlwy.net:59998/flora_invitations?authSource=admin

# JWT (Must match main application)
JWT_SECRET=your-shared-jwt-secret-min-32-chars

# Brevo Email Service
BREVO_API_KEY=xkeysib-your-api-key-here
BREVO_SENDER_EMAIL=flora@passbook.vc
BREVO_SENDER_NAME=Passbook Flora

# URLs
FRONTEND_URL=https://flora.passbook.vc
MAIN_APP_API_URL=https://flora-main.railway.app
MAIN_APP_API_KEY=your-internal-api-key

# CORS
CORS_ORIGINS=https://flora.passbook.vc,https://staging.flora.passbook.vc,http://localhost:5173
```

### 4. Local Development

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Run integration tests only
npm run test:integration
```

### 5. Railway Deployment

**Critical**: Use TCP proxy URLs for MongoDB connection, NOT `.railway.internal`:

```env
# ✅ Correct (TCP proxy)
MONGODB_URI=mongodb://user:pass@metro.proxy.rlwy.net:59998/flora_invitations

# ❌ Incorrect (Private networking - doesn't work on Railway)
MONGODB_URI=mongodb://mongodb.railway.internal:27017/flora_invitations
```

**Deploy to Railway:**

```bash
# Railway automatically detects Dockerfile and deploys
railway up
```

## API Endpoints

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

#### Create Invitation
```http
POST /api/v1/invitations/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "inviteeName": "John Doe",
  "inviteeEmail": "john@example.com",
  "role": "lp",
  "invitationType": "fund_associated",
  "investmentContext": {
    "fundId": "65a1b2c3d4e5f6g7h8i9j0k1"
  },
  "personalMessage": "Welcome to our fund!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invitationId": "550e8400-e29b-41d4-a716-446655440000",
    "inviteeName": "John Doe",
    "inviteeEmail": "john@example.com",
    "status": "sent",
    "senderContext": {
      "contextName": "Passbook Ventures I",
      "contextType": "fund",
      "contextDescription": "Passbook Ventures I - 2024"
    }
  },
  "message": "Invitation created and sent successfully"
}
```

#### List Invitations
```http
GET /api/v1/invitations?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

#### Get Invitation Details
```http
GET /api/v1/invitations/:id
Authorization: Bearer <token>
```

#### Resend Invitation
```http
PATCH /api/v1/invitations/:id/resend
Authorization: Bearer <token>
```

#### Revoke Invitation
```http
PATCH /api/v1/invitations/:id/revoke
Authorization: Bearer <token>

{
  "reason": "No longer needed"
}
```

#### Get Statistics (Admin only)
```http
GET /api/v1/invitations/stats
Authorization: Bearer <token>
```

#### Health Check
```http
GET /health
```

## Sender Context Resolution

The service automatically resolves sender context based on user role and investment context:

### Platform Admin
- **Context Type**: `platform`
- **Template**: `admin-invitation.html`
- **Example**: "Passbook Flora"

### GP (General Partner)
- **Context Type**: `fund`
- **Template**: `gp-invitation.html`
- **Resolved From**: Fund name via `investmentContext.fundId`
- **Example**: "Passbook Ventures I"

### LP (Limited Partner) - Person
- **Context Type**: `lp_entity`
- **Entity Type**: `person`
- **Template**: `lp-person-invitation.html`
- **Resolved From**: Stakeholder data
- **Example**: "Jane Smith"

### LP (Limited Partner) - Institution
- **Context Type**: `lp_entity`
- **Entity Type**: `institution`
- **Template**: `lp-institution-invitation.html`
- **Resolved From**: Stakeholder data
- **Example**: "Smith Family Office"

### Founder/Company
- **Context Type**: `company`
- **Template**: `founder-invitation.html`
- **Resolved From**: StudioCompany data via `investmentContext.companyId`
- **Example**: "Acme Inc"

## Email Templates

All templates use Handlebars for rendering with the following variables:

- `inviteeName` - Recipient name
- `inviteeEmail` - Recipient email
- `role` - User role
- `token` - Secure invitation token
- `tokenExpiresAt` - Expiration date
- `personalMessage` - Optional custom message
- `contextName` - Sender's context name
- `contextType` - Sender's context type
- `contextDescription` - Additional context info
- `inviteLink` - Full invitation acceptance URL
- `frontendUrl` - Frontend base URL
- `platformName` - "Passbook Flora"
- `currentYear` - Current year

## Security

### JWT Authentication
- Shared JWT_SECRET with main Flora application
- Token validation on all protected endpoints
- Automatic token expiration handling

### RBAC (Role-Based Access Control)
- Permission-based access control
- Admin has full access
- Users can only access invitations they created
- Fund/company-scoped access validation

### Token Security
- Crypto-secure random tokens (32 bytes)
- 7-day expiration by default
- Automatic expiration of old invitations

### Input Validation
- Express-validator for all request inputs
- Email format validation
- MongoDB ObjectId validation
- XSS prevention via input sanitization

## Audit Logging

All invitation operations are logged:

- `invitation_created` - Invitation created
- `invitation_sent` - Email sent successfully
- `invitation_resent` - Invitation resent
- `invitation_accepted` - User accepted invitation
- `invitation_revoked` - Invitation revoked
- `invitation_expired` - Invitation expired
- `email_delivery_failed` - Email sending failed
- `unauthorized_access_attempt` - Failed access attempt

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": []
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate)
- `429` - Too Many Requests
- `500` - Internal Server Error

## Testing

### Run All Tests
```bash
npm test
```

### Run Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npm test -- --coverage
```

### Test Environment Setup
Tests use separate test database and mock services. Configure in `.env.test`:

```env
NODE_ENV=test
MONGODB_URI_TEST=mongodb://localhost:27017/flora_invitations_test
JWT_SECRET=test-jwt-secret
```

## Monitoring

### Health Check
```bash
curl http://localhost:3015/health
```

Returns:
```json
{
  "success": true,
  "service": "flora-invitations-service",
  "version": "1.0.0",
  "timestamp": "2026-07-16T12:00:00.000Z",
  "uptime": 3600.5,
  "database": "connected",
  "environment": "production"
}
```

### Logs
Winston logger outputs to:
- **Console**: All environments (colored)
- **logs/error.log**: Production errors only
- **logs/combined.log**: Production all logs

## Performance

### Caching
- In-memory caching for context resolution (5-minute TTL)
- Can be upgraded to Redis for production scaling

### Database Indexes
- `invitationId` (unique)
- `token` (unique)
- `inviteeEmail`
- `status`
- `invitedBy`
- `investmentContext.fundId`
- `investmentContext.companyId`
- `senderContext.contextType`
- Compound: `inviteeEmail + status`

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

## Troubleshooting

### MongoDB Connection Fails
**Error**: `getaddrinfo ENOTFOUND mongodb.railway.internal`

**Solution**: Use TCP proxy URL:
```env
MONGODB_URI=mongodb://user:pass@metro.proxy.rlwy.net:59998/flora_invitations
```

### Email Sending Fails
**Error**: `Email sending failed: Invalid API key`

**Solution**: Verify Brevo API key:
```bash
# Test Brevo API key
curl -H "api-key: YOUR_API_KEY" https://api.brevo.com/v3/account
```

### Context Resolution Fails
**Error**: `User not found: <userId>`

**Solution**: Ensure `MAIN_APP_API_URL` and `MAIN_APP_API_KEY` are correctly configured.

## Development Guidelines

### Following Flora Development Rules

1. **Routes → Controllers → Services → Models** pattern
2. **MongoDB transactions** for multi-step operations
3. **Comprehensive error handling** at all layers
4. **Audit logging** for all operations
5. **RBAC enforcement** at route level
6. **Input validation** using express-validator
7. **TDD principles** - write tests first

### Code Style
- Use `const` by default, `let` when necessary
- Async/await (no callbacks)
- Try-catch for all async operations
- Descriptive variable names
- JSDoc comments for public methods

## Contributing

1. Create feature branch: `git checkout -b feat/your-feature`
2. Write tests first (TDD)
3. Implement feature
4. Ensure all tests pass: `npm test`
5. Submit pull request

## License

UNLICENSED - Proprietary to Passbook Media LLC

## Support

For issues or questions:
- Email: support@passbook.vc
- Documentation: `/docs/technical-reference/`

---

**Version**: 1.0.0
**Last Updated**: July 16, 2026
**Maintained By**: Passbook Development Team
