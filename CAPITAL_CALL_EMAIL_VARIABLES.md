# Capital Call Email Template Variables

This document provides comprehensive documentation for all template variables used in the capital call email system.

## Overview

The flora-email-service includes 4 specialized capital call email templates:

1. **capital-call-notification.html** - Initial capital call notice
2. **capital-call-reminder.html** - Payment reminder (before/after due date)
3. **payment-confirmation.html** - Payment received confirmation
4. **payment-overdue.html** - Formal overdue notice with escalation levels

## Template Variables by Type

### 1. Capital Call Notification Template

**Route**: `POST /api/v1/emails/capital-calls/notification`
**Template**: `capital-calls/capital-call-notification.html`

#### Required Variables:
- `email` (string) - Recipient email address
- `name` (string) - Recipient full name
- `fundName` (string) - Name of the fund
- `callAmount` (number) - Amount being called (formatted as currency)
- `dueDate` (string) - Payment due date (e.g., "2026-08-15")

#### Optional Variables:
- `callNumber` (string/number) - Capital call number (default: "N/A")
- `totalCommitment` (number) - LP's total commitment amount (formatted as currency)
- `ownershipPercentage` (number) - LP's ownership percentage
- `callPurpose` (string) - Purpose of the capital call (default: "Fund investment opportunities")
- `callDetailsLink` (string) - URL to capital call details page
- `bankName` (string) - Bank name for wire transfer (default: "TBD")
- `accountName` (string) - Account name for wire transfer (default: "TBD")
- `accountNumber` (string) - Account number for wire transfer (default: "TBD")
- `routingNumber` (string) - Routing number for wire transfer (default: "TBD")
- `wireReference` (string) - Wire reference code (auto-generated if not provided)
- `adminEmail` (string) - Fund administrator email
- `adminPhone` (string) - Fund administrator phone
- `fundManagerName` (string) - Fund manager name
- `fundId` (ObjectId) - MongoDB fund ID for tracking

#### Auto-Generated Variables:
- `frontendUrl` (string) - Frontend URL from environment
- `supportEmail` (string) - Support email from environment
- `currentYear` (number) - Current year for footer

#### Example Request:
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "callNumber": 1,
  "totalCommitment": 500000,
  "ownershipPercentage": 10,
  "dueDate": "2026-08-15",
  "callPurpose": "New portfolio investments in Q3",
  "bankName": "Silicon Valley Bank",
  "accountName": "Passbook Ventures I LP",
  "accountNumber": "1234567890",
  "routingNumber": "121000248",
  "wireReference": "CC-PV1-Q3-2026",
  "adminEmail": "admin@passbook.vc",
  "adminPhone": "+1-555-0100",
  "fundManagerName": "Sarah Chen",
  "fundId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

---

### 2. Capital Call Reminder Template

**Route**: `POST /api/v1/emails/capital-calls/reminder`
**Template**: `capital-calls/capital-call-reminder.html`

#### Required Variables:
- `email` (string) - Recipient email address
- `name` (string) - Recipient full name
- `fundName` (string) - Name of the fund
- `callAmount` (number) - Amount due (formatted as currency)
- `dueDate` (string) - Original due date

#### Optional Variables:
- `callNumber` (string/number) - Capital call number
- `daysUntilDue` (number) - Days until payment is due (for upcoming reminders)
- `daysOverdue` (number) - Days payment is overdue (for overdue reminders)
- `callDetailsLink` (string) - URL to capital call details
- `fundManagerName` (string) - Fund manager name
- `adminEmail` (string) - Admin contact email
- `adminPhone` (string) - Admin contact phone
- `fundId` (ObjectId) - Fund ID for tracking

#### Auto-Calculated Variables:
- `urgencyLevel` (string) - Urgency level based on timing:
  - `"overdue"` - Payment is past due date
  - `"urgent"` - Due within 3 days
  - `"upcoming"` - Due within 7 days
  - `"standard"` - Default
- `reminderMessage` (string) - Dynamic message based on urgency:
  - "Payment is X days overdue"
  - "Payment due in X days"
  - "Payment due soon"

#### Example Request (Overdue):
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "callNumber": 1,
  "dueDate": "2026-07-01",
  "daysOverdue": 15,
  "fundManagerName": "Sarah Chen",
  "adminEmail": "admin@passbook.vc",
  "adminPhone": "+1-555-0100"
}
```

#### Example Request (Upcoming):
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "dueDate": "2026-07-20",
  "daysUntilDue": 3
}
```

---

### 3. Payment Confirmation Template

**Route**: `POST /api/v1/emails/capital-calls/payment-confirmation`
**Template**: `capital-calls/payment-confirmation.html`

#### Required Variables:
- `email` (string) - Recipient email address
- `name` (string) - Recipient full name
- `fundName` (string) - Name of the fund
- `paymentAmount` (number) - Amount paid (formatted as currency)
- `paymentDate` (string) - Date payment was received

#### Optional Variables:
- `callAmount` (number) - Original capital call amount
- `callNumber` (string/number) - Capital call number
- `paymentMethod` (string) - Payment method (default: "Wire Transfer")
- `transactionReference` (string) - Bank transaction reference
- `confirmationNumber` (string) - Payment confirmation number (auto-generated if not provided)
- `callDetailsLink` (string) - URL to capital call details
- `fundManagerName` (string) - Fund manager name
- `adminEmail` (string) - Admin contact email
- `adminPhone` (string) - Admin contact phone
- `fundId` (ObjectId) - Fund ID for tracking

#### Auto-Generated Variables:
- `confirmationNumber` (string) - Format: `CONF-{timestamp}` (if not provided)

#### Example Request:
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "callNumber": 1,
  "paymentAmount": 50000,
  "paymentDate": "2026-07-15",
  "paymentMethod": "Wire Transfer",
  "transactionReference": "WIRE-SVB-20260715-001",
  "confirmationNumber": "CONF-PV1-2026-001",
  "fundManagerName": "Sarah Chen",
  "adminEmail": "admin@passbook.vc",
  "adminPhone": "+1-555-0100"
}
```

---

### 4. Payment Overdue Notice Template

**Route**: `POST /api/v1/emails/capital-calls/payment-overdue`
**Template**: `capital-calls/payment-overdue.html`

#### Required Variables:
- `email` (string) - Recipient email address
- `name` (string) - Recipient full name
- `fundName` (string) - Name of the fund
- `callAmount` (number) - Original call amount
- `originalDueDate` (string) - Original payment due date
- `daysOverdue` (number) - Days payment is overdue

#### Optional Variables:
- `callNumber` (string/number) - Capital call number
- `totalOutstanding` (number) - Total amount owed including fees (auto-calculated if not provided)
- `lateFeeAmount` (number) - Late fee amount charged
- `penaltyPercentage` (number) - Late fee percentage applied
- `newDueDate` (string) - New deadline for payment
- `escalationLevel` (string) - Escalation level:
  - `"first_notice"` (default)
  - `"second_notice"`
  - `"final_notice"`
- `callDetailsLink` (string) - URL to capital call details
- `fundManagerName` (string) - Fund manager name
- `adminEmail` (string) - Admin contact email
- `adminPhone` (string) - Admin contact phone
- `legalNotice` (string) - Custom legal notice text
- `fundId` (ObjectId) - Fund ID for tracking

#### Auto-Calculated Variables:
- `escalationMessage` (string) - Dynamic message based on escalation level:
  - `"Immediate action required"` (first_notice)
  - `"SECOND NOTICE - Additional penalties may apply"` (second_notice)
  - `"FINAL NOTICE - Legal action may be pursued"` (final_notice)
- `isFinalNotice` (boolean) - True if escalationLevel is "final_notice"
- `hasLateFee` (boolean) - True if lateFeeAmount is provided
- `totalOutstanding` (number) - Calculated as callAmount + lateFeeAmount

#### Example Request (First Notice):
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "callNumber": 1,
  "originalDueDate": "2026-07-01",
  "daysOverdue": 10,
  "escalationLevel": "first_notice",
  "newDueDate": "2026-07-20",
  "fundManagerName": "Sarah Chen",
  "adminEmail": "admin@passbook.vc",
  "adminPhone": "+1-555-0100"
}
```

#### Example Request (Final Notice with Late Fees):
```json
{
  "email": "investor@example.com",
  "name": "John Investor",
  "fundName": "Passbook Ventures I",
  "callAmount": 50000,
  "callNumber": 1,
  "originalDueDate": "2026-06-01",
  "daysOverdue": 45,
  "lateFeeAmount": 2500,
  "penaltyPercentage": 5,
  "escalationLevel": "final_notice",
  "newDueDate": "Immediate payment required",
  "legalNotice": "Failure to remit payment within 5 business days will result in legal proceedings and forfeiture of capital interests as outlined in your subscription agreement.",
  "fundManagerName": "Sarah Chen",
  "adminEmail": "legal@passbook.vc",
  "adminPhone": "+1-555-0100"
}
```

---

## EmailLog Metadata

All emails are logged to the `EmailLog` collection with the following metadata structure:

### Common Fields:
- `emailType` - Type of email sent
- `recipient` - Recipient email address
- `recipientName` - Recipient name
- `subject` - Email subject line
- `templateUsed` - Template path
- `brevoMessageId` - Brevo API message ID
- `sentAt` - Timestamp when email was sent
- `deliveryStatus` - Status: 'sent', 'failed', 'delivered', 'bounced'
- `provider` - Email provider: 'brevo'
- `relatedFund` - Fund ObjectId (if provided)
- `senderEmail` - Sender email from config
- `senderName` - Sender name from config

### Email-Specific Metadata:

#### capital_call:
```json
{
  "fundName": "Fund name",
  "callAmount": 50000,
  "callNumber": 1,
  "dueDate": "2026-08-15",
  "callPurpose": "Purpose text"
}
```

#### capital_call_reminder:
```json
{
  "fundName": "Fund name",
  "callAmount": 50000,
  "callNumber": 1,
  "dueDate": "2026-08-15",
  "daysOverdue": 15,
  "daysUntilDue": 0,
  "urgencyLevel": "overdue"
}
```

#### Payment Confirmation:
```json
{
  "fundName": "Fund name",
  "callAmount": 50000,
  "callNumber": 1,
  "paymentAmount": 50000,
  "paymentDate": "2026-07-15",
  "paymentMethod": "Wire Transfer",
  "transactionReference": "WIRE-123",
  "confirmationNumber": "CONF-001"
}
```

#### Payment Overdue (High Priority):
```json
{
  "fundName": "Fund name",
  "callAmount": 50000,
  "callNumber": 1,
  "originalDueDate": "2026-06-01",
  "daysOverdue": 45,
  "escalationLevel": "final_notice",
  "lateFeeAmount": 2500,
  "totalOutstanding": "52,500.00",
  "priority": "high"
}
```

---

## Testing

Run the comprehensive test suite:

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service
npm test -- src/tests/controllers/capitalCallEmailController.test.js
```

**Test Coverage**: 78% (18 passing tests)

---

## API Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Capital call notification sent successfully",
  "messageId": "brevo-message-id-123"
}
```

### Payment Confirmation Success Response:
```json
{
  "success": true,
  "message": "Payment confirmation sent successfully",
  "messageId": "brevo-message-id-456",
  "confirmationNumber": "CONF-2026-001"
}
```

### Overdue Notice Success Response:
```json
{
  "success": true,
  "message": "Payment overdue notice sent successfully",
  "messageId": "brevo-message-id-789",
  "escalationLevel": "final_notice"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Missing required fields: email, name, fundName, callAmount, dueDate"
}
```

---

## Implementation Summary

### Files Created/Modified:
1. **Controller**: `/src/controllers/capitalCallEmailController.js`
   - 4 methods with EmailLog integration
   - Comprehensive error handling
   - Input validation

2. **Templates**:
   - `/src/templates/emails/capital-calls/capital-call-notification.html`
   - `/src/templates/emails/capital-calls/capital-call-reminder.html` (NEW)
   - `/src/templates/emails/capital-calls/payment-confirmation.html` (NEW)
   - `/src/templates/emails/capital-calls/payment-overdue.html` (NEW)

3. **Routes**: `/src/routes/v1/capital-call-emails.js`
   - 6 endpoints with authentication and validation

4. **Tests**: `/src/tests/controllers/capitalCallEmailController.test.js`
   - 18 comprehensive unit tests
   - EmailLog mock integration
   - Edge case coverage

5. **Models**: `/src/models/EmailLog.js`
   - Audit trail for all emails
   - Delivery status tracking
   - Rich metadata storage

---

## Best Practices

1. **Always include LP-specific data** (totalCommitment, ownershipPercentage) for personalization
2. **Use descriptive callPurpose** to provide context
3. **Include complete wire transfer details** to minimize payment delays
4. **Track fundId** for analytics and reporting
5. **Set appropriate escalationLevel** for overdue notices
6. **Auto-generate confirmationNumber** for payment tracking
7. **Monitor EmailLog** for delivery failures and retry as needed

---

**Last Updated**: July 17, 2026
**Version**: 2.0.0
**Maintained By**: Passbook Development Team
