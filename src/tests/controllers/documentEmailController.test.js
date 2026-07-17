const documentEmailController = require('../../controllers/documentEmailController');
const emailService = require('../../services/emailService');
const templateService = require('../../services/templateService');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/emailService');
jest.mock('../../services/templateService');
jest.mock('../../config/logger');

describe('Document Email Controller', () => {
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

  describe('sendDocumentUploadNotification', () => {
    it('should send document upload notification successfully', async () => {
      req.body = {
        email: 'user@example.com',
        name: 'John User',
        documentName: 'Subscription Agreement.pdf',
        uploadedBy: 'Admin User',
        viewLink: 'https://flora.passbook.vc/documents/123'
      };

      const mockHtml = '<html>Document Upload Notification</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentUploadNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          email: 'user@example.com',
          name: 'John User',
          documentName: 'Subscription Agreement.pdf',
          uploadedBy: 'Admin User',
          viewLink: 'https://flora.passbook.vc/documents/123'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'user@example.com',
          name: 'John User'
        },
        subject: expect.stringContaining('Subscription Agreement.pdf'),
        htmlContent: mockHtml
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document upload notification sent successfully',
        messageId: 'msg123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'user@example.com'
        // Missing documentName, uploadedBy, viewLink
      };

      await documentEmailController.sendDocumentUploadNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });

    it('should include optional fields when provided', async () => {
      req.body = {
        email: 'user@example.com',
        name: 'John User',
        documentName: 'Agreement.pdf',
        uploadedBy: 'Admin',
        viewLink: 'https://flora.passbook.vc/documents/123',
        documentType: 'Legal Document',
        fileSize: '2.5 MB',
        description: 'Important agreement for review'
      };

      const mockHtml = '<html>Document Upload Notification</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentUploadNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          documentType: 'Legal Document',
          fileSize: '2.5 MB',
          description: 'Important agreement for review'
        })
      );
    });

    it('should default name from email if not provided', async () => {
      req.body = {
        email: 'john.doe@example.com',
        documentName: 'Agreement.pdf',
        uploadedBy: 'Admin',
        viewLink: 'https://flora.passbook.vc/documents/123'
      };

      const mockHtml = '<html>Document Upload Notification</html>';
      const mockResult = { messageId: 'msg123', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentUploadNotification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          name: 'john.doe',
          email: 'john.doe@example.com'
        })
      );
    });

    it('should handle email service errors', async () => {
      req.body = {
        email: 'user@example.com',
        documentName: 'Agreement.pdf',
        uploadedBy: 'Admin',
        viewLink: 'https://flora.passbook.vc/documents/123'
      };

      const mockError = new Error('Email service error');
      templateService.renderTemplate.mockResolvedValue('<html></html>');
      emailService.sendEmail.mockRejectedValue(mockError);

      await documentEmailController.sendDocumentUploadNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send document upload notification',
        details: undefined
      });
    });
  });

  describe('sendSignatureRequest', () => {
    it('should send signature request successfully', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Jane Signer',
        documentName: 'Contract.pdf',
        requestedBy: 'Fund Manager',
        signatureLink: 'https://flora.passbook.vc/sign/abc123'
      };

      const mockHtml = '<html>Signature Request</html>';
      const mockResult = { messageId: 'msg456', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signature request sent successfully',
        messageId: 'msg456'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'signer@example.com'
      };

      await documentEmailController.sendSignatureRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });

    it('should include urgency and due date when provided', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Jane Signer',
        documentName: 'Contract.pdf',
        requestedBy: 'Fund Manager',
        signatureLink: 'https://flora.passbook.vc/sign/abc123',
        dueDate: '2026-08-01',
        urgency: 'urgent'
      };

      const mockHtml = '<html>Signature Request</html>';
      const mockResult = { messageId: 'msg456', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureRequest(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          dueDate: '2026-08-01',
          urgency: 'urgent'
        })
      );
    });
  });

  describe('sendSignatureComplete', () => {
    it('should send signature complete notification when all parties signed', async () => {
      req.body = {
        email: 'admin@example.com',
        name: 'Admin User',
        documentName: 'Contract.pdf',
        signedBy: 'Jane Signer',
        viewLink: 'https://flora.passbook.vc/documents/123',
        allPartiesSigned: true
      };

      const mockHtml = '<html>Signature Complete</html>';
      const mockResult = { messageId: 'msg789', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureComplete(req, res);

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'admin@example.com',
          name: 'Admin User'
        },
        subject: expect.stringContaining('Fully Executed'),
        htmlContent: mockHtml
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signature complete notification sent successfully',
        messageId: 'msg789'
      });
    });

    it('should send partial signature notification when not all parties signed', async () => {
      req.body = {
        email: 'admin@example.com',
        name: 'Admin User',
        documentName: 'Contract.pdf',
        signedBy: 'Jane Signer',
        viewLink: 'https://flora.passbook.vc/documents/123',
        allPartiesSigned: false
      };

      const mockHtml = '<html>Signature Added</html>';
      const mockResult = { messageId: 'msg789', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureComplete(req, res);

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'admin@example.com',
          name: 'Admin User'
        },
        subject: expect.stringContaining('Signature Added'),
        htmlContent: mockHtml
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'admin@example.com'
      };

      await documentEmailController.sendSignatureComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });
  });

  describe('sendSignatureReminder', () => {
    it('should send signature reminder successfully', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Jane Signer',
        documentName: 'Contract.pdf',
        signatureLink: 'https://flora.passbook.vc/sign/abc123'
      };

      const mockHtml = '<html>Signature Reminder</html>';
      const mockResult = { messageId: 'msg999', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signature reminder sent successfully',
        messageId: 'msg999'
      });
    });

    it('should send urgent reminder when signature is overdue', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Jane Signer',
        documentName: 'Contract.pdf',
        signatureLink: 'https://flora.passbook.vc/sign/abc123',
        daysOverdue: 3
      };

      const mockHtml = '<html>Signature Reminder</html>';
      const mockResult = { messageId: 'msg999', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureReminder(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          daysOverdue: 3,
          reminderMessage: expect.stringContaining('3 days overdue'),
          urgency: 'urgent'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'signer@example.com',
          name: 'Jane Signer'
        },
        subject: expect.stringContaining('OVERDUE'),
        htmlContent: mockHtml
      });
    });

    it('should send normal reminder when not overdue', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Jane Signer',
        documentName: 'Contract.pdf',
        signatureLink: 'https://flora.passbook.vc/sign/abc123',
        daysOverdue: 0
      };

      const mockHtml = '<html>Signature Reminder</html>';
      const mockResult = { messageId: 'msg999', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureReminder(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-notification',
        expect.objectContaining({
          urgency: 'normal'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: {
          email: 'signer@example.com',
          name: 'Jane Signer'
        },
        subject: expect.stringContaining('Reminder'),
        htmlContent: mockHtml
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'signer@example.com'
      };

      await documentEmailController.sendSignatureReminder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });
  });
});
