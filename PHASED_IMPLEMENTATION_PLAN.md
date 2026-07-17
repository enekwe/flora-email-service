# Flora Email Service - Phased Implementation Plan

**Service:** `flora-email-service` (v2.0.0)
**Status:** Ready for Implementation
**Timeline:** 8 weeks (2 months)
**Current Completion:** 15% (structure + invitations complete)

---

## Implementation Overview

### Execution Strategy

- **Approach**: Incremental, risk-minimized deployment
- **Method**: Feature flags + Blue-Green deployment
- **Testing**: Continuous integration with staging validation
- **Rollback**: Immediate rollback capability at each phase

### Success Criteria

1. **Functional**: All 27 email types sending successfully
2. **Performance**: 99.9% delivery rate, < 2s send latency
3. **Reliability**: Zero downtime during migration
4. **Security**: All RBAC enforced, OAuth tokens encrypted
5. **Observability**: Complete audit trail of all emails

---

## Phase 1: Service Renaming & Foundation

**Duration**: 1 day
**Risk Level**: Low
**Dependencies**: None
**Completion Target**: 20%

### Objectives

1. Rename service from `flora-invitations-service` to `flora-email-service`
2. Update all references across codebase
3. Establish naming consistency
4. Set up proper documentation

### Tasks

#### 1.1 GitHub Repository Rename

```bash
# In GitHub:
# Repository Settings → General → Repository name
# Change: flora-invitations-service → flora-email-service

# Update local repository
cd /Users/cope/Passbook_Oracle
git submodule update --remote microservices/flora-invitations-service
```

**Time**: 15 minutes

#### 1.2 Update Package.json

File: `/microservices/flora-email-service/package.json`

Already complete:
```json
{
  "name": "flora-email-service",
  "version": "2.0.0",
  "description": "Flora Email Service - Comprehensive email microservice..."
}
```

**Time**: 5 minutes (verification only)

#### 1.3 Update Railway Service

```bash
# In Railway Dashboard:
# 1. Navigate to flora-invitations-service
# 2. Settings → General → Service Name
# 3. Change to: flora-email-service
# 4. Update description
```

**Time**: 10 minutes

#### 1.4 Update Environment Variables

Main App `.env`:
```bash
# OLD
INVITATIONS_SERVICE_URL=http://localhost:3016

# NEW
EMAIL_SERVICE_URL=http://localhost:3016
# Keep INVITATIONS_SERVICE_URL as alias for backward compatibility
INVITATIONS_SERVICE_URL=${EMAIL_SERVICE_URL}
```

**Time**: 15 minutes

#### 1.5 Update Submodule Reference

```bash
cd /Users/cope/Passbook_Oracle

# Update .gitmodules
# Change path from flora-invitations-service to flora-email-service
nano .gitmodules

# Commit changes
git add .gitmodules
git commit -m "chore: rename flora-invitations-service to flora-email-service"
```

**Time**: 20 minutes

#### 1.6 Update Documentation

Files to update:
- `/README.md` - Update service references
- `/MICROSERVICES_ARCHITECTURE.md` - Update diagrams
- `/microservices/flora-email-service/README.md` - Already updated

**Time**: 30 minutes

#### 1.7 Verify Health Check

Test that health endpoint returns correct service name:

```bash
curl http://localhost:3016/health

# Expected response:
{
  "success": true,
  "service": "flora-email-service",  # ✓ Correct
  "version": "2.0.0",
  ...
}
```

**Time**: 10 minutes

### Acceptance Criteria

- [ ] GitHub repository renamed
- [ ] Package.json shows `flora-email-service`
- [ ] Railway service renamed
- [ ] Environment variables updated
- [ ] Submodule reference updated
- [ ] Documentation updated
- [ ] Health check returns new service name
- [ ] No broken references in codebase

### Total Time: 2 hours

---

## Phase 2: Auth Email Controllers

**Duration**: 3 days (Week 1)
**Risk Level**: Medium
**Dependencies**: Phase 1 complete
**Completion Target**: 30%

### Objectives

1. Implement all authentication email controllers
2. Test password reset flow end-to-end
3. Integrate with main app authentication

### Tasks

#### 2.1 Password Reset Email Implementation

File: `/src/controllers/authEmailController.js`

Status: ✅ Already implemented

Verify implementation:
```javascript
exports.sendPasswordResetEmail = async (req, res) => {
  // Validate input
  // Render template
  // Send via Brevo
  // Log email sent
  // Return response
}
```

**Time**: 1 hour (verification + testing)

#### 2.2 Email Verification Implementation

File: `/src/controllers/authEmailController.js`

Status: ✅ Already implemented

**Time**: 1 hour (verification + testing)

#### 2.3 Welcome Email Implementation

File: `/src/controllers/authEmailController.js`

Status: ✅ Already implemented

**Time**: 1 hour (verification + testing)

#### 2.4 Resend Verification Implementation

File: `/src/controllers/authEmailController.js`

Status: ✅ Already implemented

**Time**: 30 minutes (verification + testing)

#### 2.5 Email Service Enhancements

File: `/src/services/emailService.js`

Add email logging to EmailLog model:

```javascript
async sendEmail({ to, subject, htmlContent, emailType, metadata }) {
  // Existing Brevo send logic...

  // NEW: Log email to database
  const emailLog = new EmailLog({
    emailType,
    recipient: to.email,
    recipientName: to.name,
    subject,
    brevoMessageId: result.messageId,
    sentAt: new Date(),
    deliveryStatus: 'sent',
    senderEmail: this.senderEmail,
    senderName: this.senderName,
    provider: 'brevo',
    metadata
  });

  await emailLog.save();

  return result;
}
```

**Time**: 2 hours

#### 2.6 Main App Integration - Auth Routes

File: `/routes/v1/auth.js` (Main App)

Update password reset endpoint:

```javascript
// OLD (Direct email send)
router.post('/forgot-password', async (req, res) => {
  // ... generate reset token ...

  // Send email directly
  await emailService.sendTemplateEmail({
    to: user.email,
    template: 'password-reset',
    variables: { resetLink }
  });
});

// NEW (Proxy to email service)
router.post('/forgot-password', async (req, res) => {
  // ... generate reset token ...

  // Call email service
  await axios.post(`${EMAIL_SERVICE_URL}/api/v1/emails/auth/password-reset`, {
    email: user.email,
    name: user.name,
    resetToken: resetToken,
    resetUrl: resetLink
  }, {
    headers: {
      'X-API-Key': process.env.EMAIL_SERVICE_API_KEY
    }
  });
});
```

**Time**: 3 hours (all auth routes)

#### 2.7 Integration Testing

Create test file: `/tests/integration/auth-emails.test.js`

```javascript
describe('Auth Email Integration', () => {
  it('should send password reset email', async () => {
    const response = await request(app)
      .post('/api/v1/emails/auth/password-reset')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        resetToken: 'abc123',
        resetUrl: 'https://flora.passbook.vc/reset?token=abc123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify email logged
    const emailLog = await EmailLog.findOne({
      emailType: 'password_reset',
      recipient: 'test@example.com'
    });
    expect(emailLog).toBeTruthy();
  });

  it('should send email verification', async () => { /* ... */ });
  it('should send welcome email', async () => { /* ... */ });
});
```

**Time**: 4 hours

#### 2.8 Manual Testing Checklist

- [ ] Send test password reset email
- [ ] Verify email received in inbox
- [ ] Check email rendering (desktop/mobile)
- [ ] Verify reset link works
- [ ] Check EmailLog entry created
- [ ] Test email verification flow
- [ ] Test welcome email flow
- [ ] Verify Brevo delivery status

**Time**: 2 hours

### Acceptance Criteria

- [ ] All 4 auth email methods implemented
- [ ] Integration tests passing (100% coverage)
- [ ] Main app auth routes updated
- [ ] Manual testing complete
- [ ] Email logs created for all sends
- [ ] No regressions in existing auth flow
- [ ] Documentation updated

### Total Time: 16 hours (2 days)

---

## Phase 3: Capital Call Email Controllers

**Duration**: 4 days (Week 1-2)
**Risk Level**: Medium-High
**Dependencies**: Phase 2 complete
**Completion Target**: 45%

### Objectives

1. Implement capital call email controllers
2. Support PDF attachments
3. Enable bulk sending with rate limiting
4. Test end-to-end capital call workflow

### Tasks

#### 3.1 Capital Call Notice Implementation

File: `/src/controllers/capitalCallEmailController.js`

```javascript
exports.sendCapitalCallNotice = async (req, res) => {
  try {
    const {
      lpEmail,
      lpName,
      fundName,
      callAmount,
      callNumber,
      dueDate,
      wireInstructions,
      attachments
    } = req.body;

    // Validate required fields
    if (!lpEmail || !fundName || !callAmount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Prepare template variables
    const variables = {
      lpName: lpName || lpEmail.split('@')[0],
      fundName,
      callAmount: formatCurrency(callAmount),
      callNumber,
      dueDate: formatDate(dueDate),
      wireInstructions,
      frontendUrl: process.env.FRONTEND_URL,
      currentYear: new Date().getFullYear()
    };

    // Render template
    const htmlContent = await templateService.renderTemplate(
      'capital-calls/capital-call-notification',
      variables
    );

    // Prepare attachments for Brevo
    const brevoAttachments = attachments?.map(att => ({
      name: att.filename,
      url: att.url
    }));

    // Send via Brevo with attachments
    const result = await emailService.sendEmailWithAttachments({
      to: { email: lpEmail, name: lpName },
      subject: `Capital Call ${callNumber} - ${fundName}`,
      htmlContent,
      attachments: brevoAttachments
    });

    // Log email
    await auditService.logEmail({
      emailType: 'capital_call',
      recipient: lpEmail,
      recipientName: lpName,
      subject: `Capital Call ${callNumber} - ${fundName}`,
      templateUsed: 'capital-calls/capital-call-notification',
      brevoMessageId: result.messageId,
      metadata: { fundName, callAmount, callNumber }
    });

    res.status(200).json({
      success: true,
      message: 'Capital call email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Capital call email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send capital call email'
    });
  }
};
```

**Time**: 4 hours

#### 3.2 Distribution Notice Implementation

Similar to capital call, different template.

**Time**: 3 hours

#### 3.3 Bulk Capital Calls Implementation

```javascript
exports.sendBulkCapitalCalls = async (req, res) => {
  try {
    const { recipients, capitalCallData, attachments } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients provided'
      });
    }

    const BATCH_SIZE = 50;
    const BATCH_DELAY = 1000; // 1 second between batches

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process in batches
    const batches = chunkArray(recipients, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      logger.info(`Processing batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length
      });

      // Send emails in parallel within batch
      const promises = batch.map(async (recipient) => {
        try {
          await sendSingleCapitalCall({
            ...capitalCallData,
            lpEmail: recipient.email,
            lpName: recipient.name
          }, attachments);

          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            recipient: recipient.email,
            error: error.message
          });

          logger.error('Failed to send to recipient', {
            email: recipient.email,
            error: error.message
          });
        }
      });

      await Promise.allSettled(promises);

      // Delay between batches (rate limiting)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    logger.info('Bulk capital call send complete', results);

    res.status(200).json({
      success: true,
      message: 'Bulk capital call send complete',
      results
    });

  } catch (error) {
    logger.error('Bulk capital call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk capital calls'
    });
  }
};

// Helper function
async function sendSingleCapitalCall(data, attachments) {
  const variables = {
    lpName: data.lpName,
    fundName: data.fundName,
    callAmount: formatCurrency(data.callAmount),
    callNumber: data.callNumber,
    dueDate: formatDate(data.dueDate),
    wireInstructions: data.wireInstructions,
    frontendUrl: process.env.FRONTEND_URL,
    currentYear: new Date().getFullYear()
  };

  const htmlContent = await templateService.renderTemplate(
    'capital-calls/capital-call-notification',
    variables
  );

  const brevoAttachments = attachments?.map(att => ({
    name: att.filename,
    url: att.url
  }));

  const result = await emailService.sendEmailWithAttachments({
    to: { email: data.lpEmail, name: data.lpName },
    subject: `Capital Call ${data.callNumber} - ${data.fundName}`,
    htmlContent,
    attachments: brevoAttachments
  });

  await auditService.logEmail({
    emailType: 'capital_call',
    recipient: data.lpEmail,
    recipientName: data.lpName,
    subject: `Capital Call ${data.callNumber} - ${data.fundName}`,
    brevoMessageId: result.messageId,
    metadata: {
      fundName: data.fundName,
      callAmount: data.callAmount,
      callNumber: data.callNumber
    }
  });

  return result;
}

// Helper to chunk array
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

**Time**: 6 hours

#### 3.4 Capital Call Reminder Implementation

**Time**: 3 hours

#### 3.5 Email Service - Add Attachment Support

File: `/src/services/emailService.js`

```javascript
async sendEmailWithAttachments({ to, subject, htmlContent, attachments }) {
  const sendEmailFn = async () => {
    try {
      const payload = {
        sender: {
          email: this.senderEmail,
          name: this.senderName
        },
        to: [{ email: to.email, name: to.name }],
        subject,
        htmlContent
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        payload.attachment = attachments.map(att => ({
          name: att.name,
          url: att.url
        }));
      }

      const response = await axios.post(
        `${this.apiUrl}/smtp/email`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': this.apiKey
          },
          timeout: 30000
        }
      );

      return {
        messageId: response.data.messageId,
        success: true
      };
    } catch (error) {
      logger.error('Brevo API error with attachments', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw new Error(`Email sending failed: ${error.response?.data?.message || error.message}`);
      }

      throw error;
    }
  };

  return retryWithBackoff(
    sendEmailFn,
    this.retryConfig.maxRetries,
    this.retryConfig.initialDelay,
    this.retryConfig.maxDelay
  );
}
```

**Time**: 2 hours

#### 3.6 Main App Integration

File: `/controllers/capitalCallController.js` (Main App)

Update capital call send logic:

```javascript
// OLD
router.post('/capital-calls/:id/send', authMiddleware, async (req, res) => {
  // ... fetch capital call data ...

  // Send emails directly
  for (const lp of lps) {
    await emailService.sendCapitalCallEmail(lp, capitalCallData);
  }
});

// NEW
router.post('/capital-calls/:id/send', authMiddleware, async (req, res) => {
  // ... fetch capital call data ...

  // Prepare recipients
  const recipients = lps.map(lp => ({
    email: lp.email,
    name: lp.name
  }));

  // Call email service bulk endpoint
  const response = await axios.post(
    `${EMAIL_SERVICE_URL}/api/v1/emails/capital-calls/bulk`,
    {
      recipients,
      capitalCallData: {
        fundName: capitalCall.fund.name,
        callAmount: capitalCall.amount,
        callNumber: capitalCall.number,
        dueDate: capitalCall.dueDate,
        wireInstructions: capitalCall.wireInstructions
      },
      attachments: [{
        filename: `capital_call_${capitalCall.number}.pdf`,
        url: capitalCall.pdfUrl
      }]
    },
    {
      headers: {
        'Authorization': req.headers.authorization,
        'X-API-Key': process.env.EMAIL_SERVICE_API_KEY
      }
    }
  );

  // Return results
  res.json(response.data);
});
```

**Time**: 4 hours

#### 3.7 Testing

Integration tests + manual testing:
- Single capital call send
- Bulk send (10 recipients)
- Bulk send (100 recipients) - load test
- PDF attachment verification
- Rate limiting verification

**Time**: 6 hours

### Acceptance Criteria

- [ ] All 4 capital call methods implemented
- [ ] PDF attachments working
- [ ] Bulk send with rate limiting working
- [ ] Integration tests passing
- [ ] Main app integration complete
- [ ] Load test passed (100+ recipients)
- [ ] Email logs created for all sends
- [ ] No performance degradation

### Total Time: 28 hours (3.5 days)

---

## Phase 4: Document Email Controllers

**Duration**: 3 days (Week 2)
**Risk Level**: Medium
**Dependencies**: Phase 3 complete
**Completion Target**: 60%

### Objectives

1. Implement document email controllers
2. Support signature workflows
3. Test document upload notifications
4. Integrate with document management system

### Tasks

#### 4.1 Document Upload Notification

File: `/src/controllers/documentEmailController.js`

```javascript
exports.sendDocumentUploadNotification = async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      documentName,
      uploadedBy,
      viewLink,
      documentType
    } = req.body;

    // Validation
    if (!recipientEmail || !documentName || !viewLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Prepare variables
    const variables = {
      recipientName: recipientName || recipientEmail.split('@')[0],
      documentName,
      uploadedBy,
      viewLink,
      documentType: documentType || 'document',
      frontendUrl: process.env.FRONTEND_URL,
      currentYear: new Date().getFullYear()
    };

    // Render template
    const htmlContent = await templateService.renderTemplate(
      'documents/document-notification',
      variables
    );

    // Send email
    const result = await emailService.sendEmail({
      to: { email: recipientEmail, name: recipientName },
      subject: `New Document: ${documentName}`,
      htmlContent
    });

    // Log
    await auditService.logEmail({
      emailType: 'document_upload',
      recipient: recipientEmail,
      recipientName,
      subject: `New Document: ${documentName}`,
      metadata: { documentName, uploadedBy }
    });

    res.status(200).json({
      success: true,
      message: 'Document notification sent',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Document notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send document notification'
    });
  }
};
```

**Time**: 3 hours

#### 4.2 Signature Request

Similar pattern, signature-specific template.

**Time**: 4 hours

#### 4.3 Signature Complete

**Time**: 3 hours

#### 4.4 Signature Reminder

**Time**: 3 hours

#### 4.5 Main App Integration

Update document controllers to call email service.

**Time**: 3 hours

#### 4.6 Testing

**Time**: 4 hours

### Acceptance Criteria

- [ ] All 4 document email methods implemented
- [ ] Integration with document system working
- [ ] Signature workflow tested
- [ ] Tests passing
- [ ] Main app integrated

### Total Time: 20 hours (2.5 days)

---

## Phase 5: Invitation Request & System Email Controllers

**Duration**: 3 days (Week 2-3)
**Risk Level**: Low-Medium
**Dependencies**: Phase 4 complete
**Completion Target**: 75%

### Objectives

1. Implement 5-step invitation request workflow
2. Implement system email controllers
3. Test complete workflows

### Tasks

#### 5.1 Invitation Request Controllers (5 methods)

- Request Confirmation (Step 1)
- Admin Notification (Step 2)
- Approval Notification (Step 3)
- Denial Notification (Step 4)
- Follow-up Reminder (Step 5)

**Time**: 15 hours (3 hours each)

#### 5.2 System Email Controllers (3 methods)

- Maintenance Notification
- Announcement
- Bulk Emails

**Time**: 10 hours

#### 5.3 Testing

**Time**: 5 hours

### Acceptance Criteria

- [ ] All 8 methods implemented
- [ ] 5-step workflow tested end-to-end
- [ ] Bulk system emails working
- [ ] Tests passing

### Total Time: 30 hours (3.75 days)

---

## Phase 6: Gmail Integration (CRM Migration)

**Duration**: 5 days (Week 3-4)
**Risk Level**: High
**Dependencies**: Phase 5 complete
**Completion Target**: 85%

### Objectives

1. Migrate Gmail OAuth from main app
2. Implement Gmail polling service
3. Create background worker
4. Test CRM email receiving

### Tasks

#### 6.1 Create Models

**GmailConnection Model** - Already exists
**ReceivedEmail Model** - Create new

File: `/src/models/ReceivedEmail.js`

```javascript
const mongoose = require('mongoose');

const ReceivedEmailSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GmailConnection',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Gmail data
  gmailMessageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gmailThreadId: {
    type: String,
    required: true,
    index: true
  },
  historyId: {
    type: String,
    required: true
  },

  // Email content
  from: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  to: [{ type: String, lowercase: true }],
  cc: [{ type: String, lowercase: true }],
  subject: {
    type: String,
    required: true
  },
  snippet: {
    type: String,
    required: true
  },
  bodyText: String,
  bodyHtml: String,

  // Metadata
  receivedAt: {
    type: Date,
    required: true,
    index: true
  },
  labels: [String],
  attachments: [{
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String
  }],

  // CRM integration
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    sparse: true
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    sparse: true
  },
  tags: [String],

  // Flags
  isRead: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  isImportant: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
ReceivedEmailSchema.index({ connectionId: 1, receivedAt: -1 });
ReceivedEmailSchema.index({ userId: 1, receivedAt: -1 });
ReceivedEmailSchema.index({ from: 1, receivedAt: -1 });
ReceivedEmailSchema.index({ gmailThreadId: 1, receivedAt: -1 });

module.exports = mongoose.model('ReceivedEmail', ReceivedEmailSchema);
```

**Time**: 2 hours

#### 6.2 Gmail Polling Service

File: `/src/services/gmailPollingService.js`

```javascript
const { google } = require('googleapis');
const logger = require('../config/logger');
const GmailConnection = require('../models/GmailConnection');
const ReceivedEmail = require('../models/ReceivedEmail');

class GmailPollingService {
  constructor() {
    this.gmail = null;
  }

  // Get OAuth2 client for connection
  getOAuthClient(connection) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: this.decryptToken(connection.accessToken),
      refresh_token: this.decryptToken(connection.refreshToken),
      expiry_date: connection.tokenExpiresAt.getTime()
    });

    // Auto-refresh token
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        connection.refreshToken = this.encryptToken(tokens.refresh_token);
      }
      connection.accessToken = this.encryptToken(tokens.access_token);
      connection.tokenExpiresAt = new Date(tokens.expiry_date);
      await connection.save();
    });

    return oauth2Client;
  }

  // Poll Gmail for new messages
  async pollConnection(connection) {
    try {
      logger.info('Polling Gmail connection', {
        connectionId: connection._id,
        email: connection.email
      });

      const oauth2Client = this.getOAuthClient(connection);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Use history API for incremental sync
      let response;
      if (connection.lastHistoryId) {
        response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: connection.lastHistoryId,
          historyTypes: ['messageAdded']
        });
      } else {
        // Initial sync - get latest messages
        response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 50
        });
      }

      const newMessages = response.data.history
        ? response.data.history.flatMap(h => h.messagesAdded || [])
        : response.data.messages || [];

      logger.info('New messages found', {
        connectionId: connection._id,
        count: newMessages.length
      });

      // Process each new message
      for (const msg of newMessages) {
        await this.processMessage(gmail, connection, msg.message || msg);
      }

      // Update connection state
      connection.lastHistoryId = response.data.historyId;
      connection.lastSyncDate = new Date();
      connection.syncStatus = 'active';
      connection.stats.totalEmailsReceived += newMessages.length;
      await connection.save();

      logger.info('Gmail sync complete', {
        connectionId: connection._id,
        newMessages: newMessages.length
      });

    } catch (error) {
      logger.error('Gmail polling error', {
        connectionId: connection._id,
        error: error.message
      });

      // Update connection with error
      connection.syncStatus = 'error';
      connection.syncError = {
        message: error.message,
        code: error.code,
        timestamp: new Date()
      };
      await connection.save();

      throw error;
    }
  }

  // Process individual message
  async processMessage(gmail, connection, message) {
    try {
      // Fetch full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      const msg = fullMessage.data;
      const headers = this.parseHeaders(msg.payload.headers);

      // Check if already exists
      const existing = await ReceivedEmail.findOne({
        gmailMessageId: msg.id
      });

      if (existing) {
        return; // Already processed
      }

      // Extract body
      const { bodyText, bodyHtml } = this.extractBody(msg.payload);

      // Extract attachments
      const attachments = this.extractAttachments(msg.payload);

      // Create ReceivedEmail document
      const receivedEmail = new ReceivedEmail({
        connectionId: connection._id,
        userId: connection.userId,
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        historyId: msg.historyId,
        from: headers.from,
        to: headers.to ? headers.to.split(',').map(e => e.trim()) : [],
        cc: headers.cc ? headers.cc.split(',').map(e => e.trim()) : [],
        subject: headers.subject || '(no subject)',
        snippet: msg.snippet,
        bodyText,
        bodyHtml,
        receivedAt: new Date(parseInt(msg.internalDate)),
        labels: msg.labelIds || [],
        attachments,
        isRead: !msg.labelIds?.includes('UNREAD'),
        isStarred: msg.labelIds?.includes('STARRED'),
        isImportant: msg.labelIds?.includes('IMPORTANT')
      });

      await receivedEmail.save();

      logger.info('Email saved', {
        gmailMessageId: msg.id,
        from: headers.from,
        subject: headers.subject
      });

    } catch (error) {
      logger.error('Error processing message', {
        messageId: message.id,
        error: error.message
      });
    }
  }

  // Helper: Parse headers
  parseHeaders(headers) {
    const result = {};
    for (const header of headers) {
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  // Helper: Extract body
  extractBody(payload) {
    let bodyText = '';
    let bodyHtml = '';

    if (payload.body?.data) {
      bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return { bodyText, bodyHtml };
  }

  // Helper: Extract attachments
  extractAttachments(payload) {
    const attachments = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
      }
    }

    return attachments;
  }

  // Encrypt/decrypt helpers
  encryptToken(token) {
    // Use crypto module for encryption
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decryptToken(encryptedToken) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = new GmailPollingService();
```

**Time**: 8 hours

#### 6.3 Background Worker

File: `/src/workers/gmailPollWorker.js`

```javascript
const cron = require('node-cron');
const logger = require('../config/logger');
const GmailConnection = require('../models/GmailConnection');
const gmailPollingService = require('../services/gmailPollingService');

// Poll every 5 minutes
const POLL_SCHEDULE = '*/5 * * * *';

async function pollAllConnections() {
  try {
    logger.info('Starting Gmail poll worker');

    // Get all active connections
    const connections = await GmailConnection.find({
      isActive: true,
      autoSync: true
    });

    logger.info(`Found ${connections.length} connections to poll`);

    // Poll each connection
    for (const connection of connections) {
      try {
        await gmailPollingService.pollConnection(connection);
      } catch (error) {
        logger.error('Failed to poll connection', {
          connectionId: connection._id,
          error: error.message
        });
        // Continue with other connections
      }
    }

    logger.info('Gmail poll worker complete');

  } catch (error) {
    logger.error('Gmail poll worker error', {
      error: error.message
    });
  }
}

// Start worker
function startWorker() {
  logger.info('Starting Gmail poll worker', {
    schedule: POLL_SCHEDULE
  });

  cron.schedule(POLL_SCHEDULE, pollAllConnections);

  // Run immediately on startup
  pollAllConnections();
}

module.exports = { startWorker, pollAllConnections };
```

**Time**: 2 hours

#### 6.4 Gmail API Routes

File: `/src/routes/v1/gmail.js`

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const gmailController = require('../../controllers/gmailController');

// OAuth flow
router.get('/auth-url', authMiddleware, gmailController.getAuthUrl);
router.get('/callback', gmailController.handleCallback);

// Connections
router.get('/connections', authMiddleware, gmailController.listConnections);
router.get('/connections/:id', authMiddleware, gmailController.getConnection);
router.delete('/connections/:id', authMiddleware, gmailController.deleteConnection);
router.post('/connections/:id/sync', authMiddleware, gmailController.manualSync);

// Received emails
router.get('/emails', authMiddleware, gmailController.listEmails);
router.get('/emails/:id', authMiddleware, gmailController.getEmail);

module.exports = router;
```

**Time**: 4 hours (including controller implementation)

#### 6.5 Data Migration

Migrate existing GmailConnection data from main app:

```javascript
// Migration script
const MainAppConnection = require('../../models/GmailConnection'); // Main app
const EmailServiceConnection = require('./models/GmailConnection'); // Email service

async function migrateGmailConnections() {
  const connections = await MainAppConnection.find();

  for (const conn of connections) {
    const newConn = new EmailServiceConnection({
      userId: conn.userId,
      email: conn.email,
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken,
      tokenExpiresAt: conn.tokenExpiresAt,
      syncStatus: conn.syncStatus,
      lastSyncDate: conn.lastSyncDate,
      lastHistoryId: conn.lastHistoryId,
      stats: conn.stats,
      isActive: conn.isActive,
      autoSync: conn.autoSync
    });

    await newConn.save();
  }

  console.log(`Migrated ${connections.length} connections`);
}
```

**Time**: 3 hours

#### 6.6 Main App Update

Update main app to proxy Gmail requests:

File: `/routes/v1/gmail-proxy.js` (Main App)

```javascript
const express = require('express');
const router = express.Router();
const axios = require('axios');

const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL;

// Proxy all Gmail requests to email service
router.all('/gmail/*', async (req, res) => {
  const path = req.originalUrl.replace('/api/v1/gmail', '/api/v1/gmail');

  const response = await axios({
    method: req.method,
    url: `${EMAIL_SERVICE_URL}${path}`,
    headers: req.headers,
    data: req.body
  });

  res.status(response.status).json(response.data);
});

module.exports = router;
```

**Time**: 2 hours

#### 6.7 Testing

- OAuth flow testing
- Gmail sync testing
- Background worker testing
- Migration validation

**Time**: 8 hours

### Acceptance Criteria

- [ ] Models created
- [ ] Gmail polling service implemented
- [ ] Background worker running
- [ ] OAuth flow working
- [ ] Data migrated successfully
- [ ] Main app proxy working
- [ ] Tests passing

### Total Time: 29 hours (3.6 days)

---

## Phase 7: Testing & Quality Assurance

**Duration**: 5 days (Week 5)
**Risk Level**: Low
**Dependencies**: All previous phases complete
**Completion Target**: 95%

### Objectives

1. Comprehensive unit testing
2. Integration testing
3. Load testing
4. Security testing
5. Manual QA

### Tasks

#### 7.1 Unit Tests (All Controllers)

- Auth Email Controllers (4 tests)
- Capital Call Controllers (4 tests)
- Document Controllers (4 tests)
- Invitation Request Controllers (5 tests)
- System Controllers (3 tests)
- Gmail Controllers (6 tests)

**Time**: 16 hours

#### 7.2 Integration Tests

- Complete email flows (10 scenarios)
- Gmail sync integration (3 scenarios)
- Webhook handling (3 scenarios)

**Time**: 12 hours

#### 7.3 Load Testing

- Bulk email sending (1000 emails)
- Concurrent requests (100 req/s)
- Database performance

**Time**: 6 hours

#### 7.4 Security Testing

- RBAC enforcement
- OAuth token security
- Input validation
- SQL injection prevention

**Time**: 4 hours

#### 7.5 Manual QA

- Send test emails for all 27 types
- Verify email rendering
- Check delivery tracking
- Test Gmail sync

**Time**: 8 hours

### Acceptance Criteria

- [ ] 100% test coverage for controllers
- [ ] All integration tests passing
- [ ] Load tests passing (1000+ emails)
- [ ] Security tests passing
- [ ] Manual QA checklist complete

### Total Time: 46 hours (5.75 days)

---

## Phase 8: Production Deployment

**Duration**: 5 days (Week 6)
**Risk Level**: High
**Dependencies**: Phase 7 complete
**Completion Target**: 100%

### Objectives

1. Deploy to staging
2. Staging validation
3. Production rollout (canary)
4. Full production migration
5. Decommission old code

### Tasks

#### 8.1 Staging Deployment (Day 1)

- Deploy email service to Railway staging
- Update main app staging environment
- Run smoke tests

**Time**: 8 hours

#### 8.2 Staging Validation (Days 2-3)

- Monitor logs for 2 days
- Send test emails
- Verify Gmail sync
- Fix any issues

**Time**: 16 hours

#### 8.3 Production Canary (Day 4)

- Deploy email service to production
- Route 10% of traffic to new service
- Monitor for 24 hours

**Time**: 8 hours

#### 8.4 Production Rollout (Day 5)

- Increase to 25% (monitor 12 hours)
- Increase to 50% (monitor 12 hours)
- Increase to 100% (monitor 24 hours)

**Time**: 8 hours

#### 8.5 Decommission (Day 6)

- Remove old email code from main app
- Clean up unused dependencies
- Update documentation

**Time**: 4 hours

### Acceptance Criteria

- [ ] Staging deployment successful
- [ ] Staging validation passed
- [ ] Production canary successful (0 errors)
- [ ] Full production rollout (99.9% delivery)
- [ ] Old code removed

### Total Time: 44 hours (5.5 days)

---

## Summary

### Timeline

| Phase | Duration | Completion % | Total Hours |
|-------|----------|--------------|-------------|
| Phase 1: Service Renaming | 1 day | 20% | 2 |
| Phase 2: Auth Email Controllers | 3 days | 30% | 16 |
| Phase 3: Capital Call Controllers | 4 days | 45% | 28 |
| Phase 4: Document Controllers | 3 days | 60% | 20 |
| Phase 5: Request/System Controllers | 3 days | 75% | 30 |
| Phase 6: Gmail Integration | 5 days | 85% | 29 |
| Phase 7: Testing & QA | 5 days | 95% | 46 |
| Phase 8: Production Deployment | 5 days | 100% | 44 |
| **TOTAL** | **8 weeks** | **100%** | **215 hours** |

### Risk Mitigation

1. **Feature Flags**: Enable gradual rollout
2. **Blue-Green Deployment**: Zero downtime
3. **Rollback Plan**: Immediate rollback capability
4. **Monitoring**: Comprehensive logging and alerting
5. **Backup**: Regular backups with 30-day retention

### Dependencies

**External Dependencies**:
- Brevo API (email sending)
- Gmail API (email receiving)
- MongoDB (database)
- Railway (hosting)

**Internal Dependencies**:
- Main app (authentication, user data)
- Shared database (venturestudio)

### Success Metrics

**Functional**:
- ✓ All 27 email types sending
- ✓ Gmail sync operational
- ✓ Email logs created

**Performance**:
- ✓ 99.9% delivery rate
- ✓ < 2s send latency
- ✓ 1000+ emails/hour throughput

**Reliability**:
- ✓ Zero downtime deployment
- ✓ Automatic failover
- ✓ Error recovery

**Security**:
- ✓ RBAC enforced
- ✓ OAuth tokens encrypted
- ✓ Input validated

---

**END OF PHASED IMPLEMENTATION PLAN**
