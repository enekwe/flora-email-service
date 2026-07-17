const capitalCallEmailController = require('../../controllers/capitalCallEmailController');
const emailService = require('../../services/emailService');
const templateService = require('../../services/templateService');
const EmailLog = require('../../models/EmailLog');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/emailService');
jest.mock('../../services/templateService');
jest.mock('../../models/EmailLog');
jest.mock('../../config/logger');

describe('Capital Call Email Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('sendCapitalCallNotification', () => {
    beforeEach(() => {
      EmailLog.create = jest.fn().mockResolvedValue({ _id: 'log-id-123' });
    });

    it('should send capital call notification successfully', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 100000,
        dueDate: '2026-08-15'
      };

      const mockHtml = '<html>Capital Call Notice</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendCapitalCallNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/capital-call-notification',
        expect.objectContaining({
          email: 'investor@example.com',
          name: 'John Investor',
          fundName: 'Test Fund'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'investor@example.com',
          name: 'John Investor'
        },
        subject: expect.stringContaining('Test Fund'),
        htmlContent: mockHtml
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Capital call notification sent successfully',
        messageId: 'msg123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'investor@example.com'
        // Missing name, fundName, callAmount, dueDate
      };

      await capitalCallEmailController.sendCapitalCallNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });

    it('should format call amount with currency formatting', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 1234567.89,
        dueDate: '2026-08-15'
      };

      const mockHtml = '<html>Capital Call Notice</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendCapitalCallNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/capital-call-notification',
        expect.objectContaining({
          callAmount: expect.stringContaining('1,234,567.89')
        })
      );
    });

    it('should handle email service errors', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 100000,
        dueDate: '2026-08-15'
      };

      const mockError = new Error('Brevo API error');
      templateService.renderTemplate.mockResolvedValue('<html></html>');
      emailService.sendEmail.mockRejectedValue(mockError);

      await capitalCallEmailController.sendCapitalCallNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send capital call notification',
        details: undefined
      });
    });

    it('should include all optional banking details when provided', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 100000,
        dueDate: '2026-08-15',
        bankName: 'Test Bank',
        accountName: 'Fund Account',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        wireReference: 'CC-TEST-001'
      };

      const mockHtml = '<html>Capital Call Notice</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendCapitalCallNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/capital-call-notification',
        expect.objectContaining({
          bankName: 'Test Bank',
          accountName: 'Fund Account',
          accountNumber: '1234567890',
          routingNumber: '987654321',
          wireReference: 'CC-TEST-001'
        })
      );
    });
  });

  describe('sendDistributionNotice', () => {
    it('should send distribution notice successfully', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        distributionAmount: 50000,
        distributionDate: '2026-09-01'
      };

      const mockHtml = '<html>Distribution Notice</html>';
      const mockResult = { messageId: 'msg456', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendDistributionNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Distribution notice sent successfully',
        messageId: 'msg456'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'investor@example.com'
      };

      await capitalCallEmailController.sendDistributionNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });
  });

  describe('sendBulkCapitalCalls', () => {
    it('should send bulk capital calls successfully', async () => {
      req.body = {
        recipients: [
          { email: 'investor1@example.com', name: 'Investor 1' },
          { email: 'investor2@example.com', name: 'Investor 2' }
        ],
        capitalCallData: {
          fundName: 'Test Fund',
          callAmount: 100000,
          dueDate: '2026-08-15'
        }
      };

      const mockHtml = '<html>Capital Call Notice</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendBulkCapitalCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk capital call processing completed',
        summary: expect.objectContaining({
          total: 2
        }),
        results: expect.any(Array),
        errors: expect.any(Array)
      });
    });

    it('should return 400 if recipients array is missing or empty', async () => {
      req.body = {
        capitalCallData: {
          fundName: 'Test Fund',
          callAmount: 100000,
          dueDate: '2026-08-15'
        }
      };

      await capitalCallEmailController.sendBulkCapitalCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing or invalid recipients array')
      });
    });

    it('should continue processing even if some sends fail', async () => {
      req.body = {
        recipients: [
          { email: 'investor1@example.com', name: 'Investor 1' },
          { email: 'investor2@example.com', name: 'Investor 2' },
          { email: 'investor3@example.com', name: 'Investor 3' }
        ],
        capitalCallData: {
          fundName: 'Test Fund',
          callAmount: 100000,
          dueDate: '2026-08-15'
        }
      };

      const mockHtml = '<html>Capital Call Notice</html>';
      templateService.renderTemplate.mockResolvedValue(mockHtml);

      // Mock one successful and one failed send
      emailService.sendEmail
        .mockResolvedValueOnce({ messageId: 'msg1', success: true })
        .mockRejectedValueOnce(new Error('Email send failed'))
        .mockResolvedValueOnce({ messageId: 'msg3', success: true });

      await capitalCallEmailController.sendBulkCapitalCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.summary.total).toBe(3);
    });
  });

  describe('sendCapitalCallReminder', () => {
    it('should send reminder successfully', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 100000,
        dueDate: '2026-08-01',
        daysOverdue: 5
      };

      const mockHtml = '<html>Capital Call Reminder</html>';
      const mockResult = { messageId: 'msg789', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendCapitalCallReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Capital call reminder sent successfully',
        messageId: 'msg789'
      });
    });

    it('should include overdue messaging when daysOverdue > 0', async () => {
      EmailLog.create = jest.fn().mockResolvedValue({ _id: 'log-id-reminder' });

      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund',
        callAmount: 100000,
        dueDate: '2026-07-10',
        daysOverdue: 7
      };

      const mockHtml = '<html>Capital Call Reminder</html>';
      const mockResult = { messageId: 'msg789', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await capitalCallEmailController.sendCapitalCallReminder(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/capital-call-reminder',
        expect.objectContaining({
          urgencyLevel: 'overdue',
          reminderMessage: expect.stringContaining('7 days overdue')
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'investor@example.com',
          name: 'John Investor'
        },
        subject: expect.stringContaining('Reminder'),
        htmlContent: mockHtml
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'investor@example.com'
      };

      await capitalCallEmailController.sendCapitalCallReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });
  });

  describe('sendPaymentConfirmation (new method)', () => {
    beforeEach(() => {
      EmailLog.create = jest.fn().mockResolvedValue({ _id: 'log-id-456' });
    });

    it('should send payment confirmation with all details', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund I',
        paymentAmount: 50000,
        paymentDate: '2026-07-15',
        paymentMethod: 'Wire Transfer',
        transactionReference: 'WIRE-123456',
        confirmationNumber: 'CONF-2026-001'
      };

      templateService.renderTemplate.mockResolvedValue('<html>Confirmation</html>');
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-456' });

      await capitalCallEmailController.sendPaymentConfirmation(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/payment-confirmation',
        expect.objectContaining({
          paymentAmount: '50,000.00',
          paymentDate: '2026-07-15',
          paymentMethod: 'Wire Transfer',
          confirmationNumber: 'CONF-2026-001'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Payment confirmation sent successfully',
          confirmationNumber: 'CONF-2026-001'
        })
      );
    });

    it('should auto-generate confirmation number if not provided', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund I',
        paymentAmount: 50000,
        paymentDate: '2026-07-15'
      };

      templateService.renderTemplate.mockResolvedValue('<html>Confirmation</html>');
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-456' });

      await capitalCallEmailController.sendPaymentConfirmation(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/payment-confirmation',
        expect.objectContaining({
          confirmationNumber: expect.stringMatching(/^CONF-\d+$/)
        })
      );
    });
  });

  describe('sendPaymentOverdueNotice (new method)', () => {
    beforeEach(() => {
      EmailLog.create = jest.fn().mockResolvedValue({ _id: 'log-id-789' });
    });

    it('should send first notice with correct escalation level', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund I',
        callAmount: 50000,
        originalDueDate: '2026-07-01',
        daysOverdue: 10,
        escalationLevel: 'first_notice'
      };

      templateService.renderTemplate.mockResolvedValue('<html>Overdue</html>');
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-789' });

      await capitalCallEmailController.sendPaymentOverdueNotice(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/payment-overdue',
        expect.objectContaining({
          escalationLevel: 'first_notice',
          escalationMessage: 'Immediate action required',
          isFinalNotice: false
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '🚨 OVERDUE: Capital Call Payment - Test Fund I'
        })
      );
    });

    it('should send final notice with FINAL NOTICE tag in subject', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund I',
        callAmount: 50000,
        originalDueDate: '2026-06-01',
        daysOverdue: 45,
        escalationLevel: 'final_notice'
      };

      templateService.renderTemplate.mockResolvedValue('<html>Final Notice</html>');
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-final' });

      await capitalCallEmailController.sendPaymentOverdueNotice(req, res);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('[FINAL NOTICE]')
        })
      );

      expect(EmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            priority: 'high',
            escalationLevel: 'final_notice'
          })
        })
      );
    });

    it('should calculate total with late fees', async () => {
      req.body = {
        email: 'investor@example.com',
        name: 'John Investor',
        fundName: 'Test Fund I',
        callAmount: 50000,
        originalDueDate: '2026-06-01',
        daysOverdue: 30,
        lateFeeAmount: 2500,
        penaltyPercentage: 5
      };

      templateService.renderTemplate.mockResolvedValue('<html>Overdue</html>');
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-789' });

      await capitalCallEmailController.sendPaymentOverdueNotice(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'capital-calls/payment-overdue',
        expect.objectContaining({
          hasLateFee: true,
          lateFeeAmount: '2,500.00',
          penaltyPercentage: 5,
          totalOutstanding: expect.stringMatching(/52,500\.00/)
        })
      );
    });
  });
});
