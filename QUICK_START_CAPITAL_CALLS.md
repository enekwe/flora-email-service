# Quick Start: Capital Call Emails

## Test the Implementation

```bash
cd /Users/cope/Passbook_Oracle/microservices/flora-email-service

# Run tests
npm test -- src/tests/controllers/capitalCallEmailController.test.js

# Expected: 18 tests passing, 78% coverage
```

## 4 Core Methods

### 1. Send Capital Call Notification
```bash
POST /api/v1/emails/capital-calls/notification
```
**Required**: email, name, fundName, callAmount, dueDate
**Purpose**: Initial capital call notice with wire instructions

### 2. Send Reminder
```bash
POST /api/v1/emails/capital-calls/reminder
```
**Required**: email, name, fundName, callAmount, dueDate
**Optional**: daysOverdue OR daysUntilDue
**Purpose**: Reminder before/after due date with urgency levels

### 3. Send Payment Confirmation
```bash
POST /api/v1/emails/capital-calls/payment-confirmation
```
**Required**: email, name, fundName, paymentAmount, paymentDate
**Purpose**: Confirm payment received

### 4. Send Overdue Notice
```bash
POST /api/v1/emails/capital-calls/payment-overdue
```
**Required**: email, name, fundName, callAmount, originalDueDate, daysOverdue
**Optional**: escalationLevel (first_notice, second_notice, final_notice)
**Purpose**: Formal overdue notice with escalation

## Key Files

- Controller: `src/controllers/capitalCallEmailController.js`
- Routes: `src/routes/v1/capital-call-emails.js`
- Templates: `src/templates/emails/capital-calls/*.html`
- Tests: `src/tests/controllers/capitalCallEmailController.test.js`
- Docs: `CAPITAL_CALL_EMAIL_VARIABLES.md`

## EmailLog Integration

All emails are automatically logged to `EmailLog` collection with:
- Email type & template used
- Delivery status (sent/failed)
- Brevo message ID
- Rich metadata for analytics

## Test Example

```javascript
const response = await request(app)
  .post('/api/v1/emails/capital-calls/notification')
  .set('Authorization', `Bearer ${token}`)
  .send({
    email: 'investor@example.com',
    name: 'John Investor',
    fundName: 'Test Fund I',
    callAmount: 50000,
    dueDate: '2026-08-15'
  });

expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
```

## Urgency Levels (Reminder)

- **overdue**: daysOverdue > 0
- **urgent**: daysUntilDue <= 3
- **upcoming**: daysUntilDue <= 7
- **standard**: default

## Escalation Levels (Overdue)

- **first_notice**: Standard overdue
- **second_notice**: Enhanced penalties warning  
- **final_notice**: Legal action warning (adds [FINAL NOTICE] to subject)

---
**Status**: ✅ Complete | **Tests**: 18/18 Passing | **Coverage**: 78%
