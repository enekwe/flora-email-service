# Document Email Template Variables

This document describes all available template variables for document-related email templates in the Flora Email Service.

## Common Variables

These variables are available in all document email templates:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `name` | String | Recipient's name (defaults to email username if not provided) | "John Doe" |
| `email` | String | Recipient's email address | "john@example.com" |
| `frontendUrl` | String | Base URL for the Flora frontend application | "https://flora.passbook.vc" |
| `supportEmail` | String | Support email address for Flora | "flora@passbook.vc" |
| `currentYear` | Number | Current year for copyright notices | 2026 |

---

## Document Notification Template

**Template Path:** `documents/document-notification.html`

**Controller Method:** `sendDocumentNotification()`

**Route:** `POST /api/v1/emails/documents/notification`

### Required Fields

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `documentName` | String | Name of the document | "Q4 Financial Report.pdf" |
| `uploadedBy` | String | Name of person who uploaded the document | "Jane Smith" |
| `viewLink` | String | Direct link to view the document | "https://flora.passbook.vc/documents/123" |

### Optional Fields

| Variable | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `documentTitle` | String | `documentName` | Display title for the document | "Q4 2026 Financial Report" |
| `documentDescription` | String | "A new document has been uploaded for your review." | Description of the document | "Quarterly financial statements and analysis" |
| `documentCategory` | String | "General" | Category/type of the document | "Financial Report" |
| `uploadedAt` | String | Current date/time (formatted) | When the document was uploaded | "December 15, 2026 at 2:30 PM" |
| `uploadDate` | String | Current date (formatted) | Upload date (shorter format) | "December 15, 2026" |
| `documentLink` | String | `viewLink` | Alternative link to the document | "https://flora.passbook.vc/documents/123" |
| `documentType` | String | "Document" | Type of document | "Financial Report" |
| `fileSize` | String | "N/A" | Size of the document file | "2.5 MB" |
| `fundName` | String | "Your Fund" | Name of the associated fund | "Passbook Ventures I" |
| `isImportant` | Boolean | `false` | Whether to display urgent/important notice | `true` |

### Example Usage

```javascript
{
  email: "investor@example.com",
  name: "John Investor",
  documentName: "Q4 Report.pdf",
  documentTitle: "Q4 2026 Financial Report",
  documentDescription: "Quarterly performance update",
  documentCategory: "Financial",
  uploadedBy: "Fund Manager",
  uploadDate: "December 15, 2026",
  viewLink: "https://flora.passbook.vc/documents/123",
  documentType: "Financial Report",
  fileSize: "2.5 MB",
  fundName: "Passbook Ventures I",
  isImportant: true
}
```

---

## Document Review Request Template

**Template Path:** `documents/document-review-request.html`

**Controller Method:** `sendDocumentReviewRequest()`

**Route:** `POST /api/v1/emails/documents/review-request`

### Required Fields

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `documentName` | String | Name of the document to review | "Legal Agreement.pdf" |
| `requestedBy` | String | Name of person requesting the review | "Legal Team" |
| `reviewLink` | String | Link to review the document | "https://flora.passbook.vc/review/456" |

### Optional Fields

| Variable | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `dueDate` | String | "At your earliest convenience" | When the review is due | "December 31, 2026" |
| `documentType` | String | "Document" | Type of document | "Legal Agreement" |
| `reviewPurpose` | String | "Please review this document and provide your feedback." | Purpose of the review | "Review for legal compliance" |
| `priority` | String | "normal" | Priority level: "normal", "high", "urgent" | "urgent" |
| `isUrgent` | Boolean | Computed from `priority` | Whether the request is urgent | `true` |

### Priority Levels

- **normal**: Standard review request
- **high** or **urgent**: Urgent review request (triggers red urgent banner in email)

### Example Usage

```javascript
{
  email: "reviewer@example.com",
  name: "Jane Reviewer",
  documentName: "Investor Agreement.pdf",
  requestedBy: "Legal Department",
  reviewLink: "https://flora.passbook.vc/review/456",
  dueDate: "January 15, 2027",
  documentType: "Legal Agreement",
  reviewPurpose: "Review for accuracy and compliance before investor signature",
  priority: "urgent"
}
```

---

## Signature Request Template

**Template Path:** `documents/signature-request.html`

**Controller Method:** `sendSignatureRequest()`

**Route:** `POST /api/v1/emails/documents/signature-request`

### Required Fields

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `documentName` | String | Name of the document requiring signature | "Investment Agreement.pdf" |
| `requestedBy` | String | Name of person requesting the signature | "Fund Manager" |
| `signatureLink` | String | Link to sign the document | "https://flora.passbook.vc/sign/789" |

### Optional Fields

| Variable | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `dueDate` | String | "At your earliest convenience" | When the signature is due | "January 20, 2027" |
| `documentType` | String | "Document" | Type of document | "Investment Agreement" |
| `description` | String | "Your signature is required on the following document." | Description of the signature request | "Please review and sign the investment agreement" |
| `urgency` | String | "normal" | Urgency level: "normal", "high", "urgent" | "urgent" |
| `isUrgent` | Boolean | Computed from `urgency` | Whether the request is urgent | `true` |
| `trackOpens` | Boolean | `false` | Enable email open/click tracking | `true` |

### Special Features

- **Email Tracking**: When `trackOpens: true`, the system logs email opens and clicks in EmailLog for analytics
- **Urgency Display**: High/urgent priority shows red urgent banner in the email
- **Audit Trail**: All signature requests are logged in EmailLog with metadata

### Example Usage

```javascript
{
  email: "investor@example.com",
  name: "Bob Investor",
  documentName: "Series A Investment Agreement.pdf",
  requestedBy: "Passbook Ventures Fund Manager",
  signatureLink: "https://flora.passbook.vc/sign/789",
  dueDate: "January 30, 2027",
  documentType: "Investment Agreement",
  description: "Please review and sign the Series A investment agreement",
  urgency: "urgent",
  trackOpens: true
}
```

---

## Document Shared Template

**Template Path:** `documents/document-shared.html`

**Controller Method:** `sendDocumentShared()`

**Route:** `POST /api/v1/emails/documents/shared`

### Required Fields

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `documentName` | String | Name of the shared document | "Board Meeting Notes.pdf" |
| `sharedBy` | String | Name of person who shared the document | "Alice Manager" |
| `accessLink` | String | Link to access the shared document | "https://flora.passbook.vc/shared/xyz" |

### Optional Fields

| Variable | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `sharedAt` | String | Current date (formatted) | When the document was shared | "December 20, 2026" |
| `documentType` | String | "Document" | Type of document | "Meeting Notes" |
| `message` | String | "{sharedBy} has shared a document with you." | Custom message from the sharer | "Here are the notes from yesterday's board meeting" |
| `permissions` | String | "view" | Access level: "view", "edit", "full" | "edit" |
| `canEdit` | Boolean | Computed from `permissions` | Whether recipient can edit the document | `true` |
| `expiresAt` | String | `null` | When access expires (optional) | "January 30, 2027" |
| `hasExpiration` | Boolean | Computed from `expiresAt` | Whether access has an expiration | `true` |

### Permission Levels

- **view**: Read-only access (download allowed)
- **edit**: Can make changes to the document
- **full**: Full access including sharing with others

### Example Usage

```javascript
{
  email: "teammate@example.com",
  name: "Charlie Teammate",
  documentName: "Q4 Strategy Presentation.pdf",
  sharedBy: "Alice Manager",
  accessLink: "https://flora.passbook.vc/shared/xyz",
  sharedAt: "December 20, 2026",
  documentType: "Presentation",
  message: "Please review this presentation before our strategy meeting next week",
  permissions: "edit",
  expiresAt: "January 15, 2027"
}
```

---

## Email Logging

All document emails are logged to the `EmailLog` collection with the following metadata:

### Standard Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `emailType` | String | Type of email: "document_upload", "signature_request", etc. |
| `recipient` | String | Recipient email address |
| `recipientName` | String | Recipient name |
| `subject` | String | Email subject line |
| `templateUsed` | String | Template path that was used |
| `brevoMessageId` | String | Brevo API message ID |
| `sentAt` | Date | When the email was sent |
| `deliveryStatus` | String | Delivery status: "sent", "delivered", "bounced", "failed" |
| `provider` | String | Email provider (always "brevo") |
| `senderEmail` | String | Sender email address |
| `senderName` | String | Sender name |

### Document Email Metadata

Additional metadata stored in the `metadata` field:

```javascript
{
  documentName: "Document.pdf",
  documentType: "Report",
  uploadedBy: "John Smith",  // For notifications
  requestedBy: "Jane Doe",    // For review/signature requests
  sharedBy: "Bob Manager",    // For shared documents
  dueDate: "2027-01-30",
  priority: "urgent",
  trackOpens: true,           // For signature requests
  permissions: "edit",        // For shared documents
  urgency: "urgent"
}
```

---

## Best Practices

1. **Always provide descriptive documentName**: Use clear, meaningful names that help recipients understand the document purpose

2. **Include due dates when applicable**: Help recipients prioritize by providing clear deadlines

3. **Use urgency flags appropriately**: Only mark truly urgent items as urgent to avoid alert fatigue

4. **Provide context in descriptions**: Brief descriptions help recipients understand why they're receiving the document

5. **Track important signature requests**: Enable `trackOpens` for legally binding signatures to monitor engagement

6. **Set appropriate permissions**: Use minimum necessary permissions when sharing documents (principle of least privilege)

7. **Use expiration dates for sensitive documents**: Set `expiresAt` for documents that should only be accessible temporarily

---

## Template Customization

To customize email templates:

1. Templates are located in `/src/templates/emails/documents/`
2. Use Handlebars syntax for variables: `{{variableName}}`
3. Use Handlebars conditionals for optional content: `{{#if variableName}}...{{/if}}`
4. Maintain consistent branding with Flora colors and styles
5. Test templates with all variable combinations before deploying

---

## Support

For questions or issues with document email templates:

- Email: support@passbook.vc
- Documentation: `/docs/technical-reference/`
- Source Code: `/src/controllers/documentEmailController.js`

**Version**: 2.0.0
**Last Updated**: July 17, 2026
**Maintained By**: Passbook Development Team
