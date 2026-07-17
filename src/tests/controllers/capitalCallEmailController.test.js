const capitalCallEmailController = require('../../controllers/capitalCallEmailController');
const emailService = require('../../services/emailService');
const templateService = require('../../services/templateService');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/emailService');
jest.mock('../../services/templateService');
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

  describe('sendCapitalCallNotice', () => {
    it('should send capital call notice successfully', async () => {
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

      await capitalCallEmailController.sendCapitalCallNotice(req, res);

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
        message: 'Capital call notice sent successfully',
        messageId: 'msg123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'investor@example.com'
        // Missing name, fundName, callAmount, dueDate
      };

      await capitalCallEmailController.sendCapitalCallNotice(req, res);

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

      await capitalCallEmailController.sendCapitalCallNotice(req, res);

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

      await capitalCallEmailController.sendCapitalCallNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send capital call notice',
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

      await capitalCallEmailController.sendCapitalCallNotice(req, res);

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
        'capital-calls/capital-call-notification',
        expect.objectContaining({
          callPurpose: expect.stringContaining('7 days overdue')
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
});
