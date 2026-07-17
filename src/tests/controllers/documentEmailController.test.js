const documentEmailController = require('../../controllers/documentEmailController');
const emailService = require('../../services/emailService');
const templateService = require('../../services/templateService');
const EmailLog = require('../../models/EmailLog');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/emailService');
jest.mock('../../services/templateService');
jest.mock('../../models/EmailLog');
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

    // Setup default EmailLog mock
    EmailLog.create = jest.fn().mockResolvedValue({ _id: 'log-id-123' });
  });

  describe('sendDocumentNotification', () => {
    it('should send document notification successfully', async () => {
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

      await documentEmailController.sendDocumentNotification(req, res);

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

      expect(EmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'document_upload',
          recipient: 'user@example.com',
          recipientName: 'John User',
          brevoMessageId: 'msg123',
          deliveryStatus: 'sent'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document notification sent successfully',
        messageId: 'msg123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        email: 'user@example.com'
        // Missing documentName, uploadedBy, viewLink
      };

      await documentEmailController.sendDocumentNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
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

      await documentEmailController.sendDocumentNotification(req, res);

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

      await documentEmailController.sendDocumentNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send document notification',
        details: undefined
      });
    });
  });

  describe('sendDocumentReviewRequest', () => {
    it('should send review request successfully with urgent priority', async () => {
      req.body = {
        email: 'reviewer@example.com',
        name: 'Jane Reviewer',
        documentName: 'Legal Agreement.pdf',
        requestedBy: 'Legal Team',
        reviewLink: 'https://flora.passbook.vc/review/456',
        dueDate: 'December 31, 2026',
        priority: 'urgent'
      };

      const mockHtml = '<html>Review Request</html>';
      const mockResult = { messageId: 'msg456', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentReviewRequest(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-review-request',
        expect.objectContaining({
          name: 'Jane Reviewer',
          email: 'reviewer@example.com',
          documentName: 'Legal Agreement.pdf',
          requestedBy: 'Legal Team',
          priority: 'urgent',
          isUrgent: true
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('URGENT')
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should use normal priority by default', async () => {
      req.body = {
        email: 'reviewer@example.com',
        documentName: 'Document.pdf',
        requestedBy: 'Admin',
        reviewLink: 'https://flora.passbook.vc/review/456'
      };

      const mockHtml = '<html>Review Request</html>';
      const mockResult = { messageId: 'msg456', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentReviewRequest(req, res);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '📋 Review Requested: Document.pdf'
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        email: 'reviewer@example.com',
        documentName: 'Document.pdf'
      };

      await documentEmailController.sendDocumentReviewRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, documentName, requestedBy, reviewLink'
      });
    });
  });

  describe('sendSignatureRequest', () => {
    it('should send signature request successfully with tracking', async () => {
      req.body = {
        email: 'signer@example.com',
        name: 'Bob Signer',
        documentName: 'Investment Agreement.pdf',
        requestedBy: 'Fund Manager',
        signatureLink: 'https://flora.passbook.vc/sign/789',
        urgency: 'urgent',
        trackOpens: true
      };

      const mockHtml = '<html>Signature Request</html>';
      const mockResult = { messageId: 'msg789', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendSignatureRequest(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/signature-request',
        expect.objectContaining({
          urgency: 'urgent',
          isUrgent: true
        })
      );

      expect(EmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'signature_request',
          metadata: expect.objectContaining({
            trackOpens: true,
            urgency: 'urgent'
          })
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signature request sent successfully',
        messageId: 'msg789',
        trackingEnabled: true
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

    it('should send normal priority signature request', async () => {
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

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '✍️ Signature Required: Contract.pdf'
        })
      );
    });
  });

  describe('sendDocumentShared', () => {
    it('should send document shared notification successfully', async () => {
      req.body = {
        email: 'recipient@example.com',
        name: 'Alice Recipient',
        documentName: 'Shared Document.pdf',
        sharedBy: 'Bob Sharer',
        accessLink: 'https://flora.passbook.vc/shared/xyz',
        permissions: 'edit',
        expiresAt: 'January 30, 2027'
      };

      const mockHtml = '<html>Document Shared</html>';
      const mockResult = { messageId: 'msgxyz', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentShared(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-shared',
        expect.objectContaining({
          name: 'Alice Recipient',
          documentName: 'Shared Document.pdf',
          sharedBy: 'Bob Sharer',
          permissions: 'edit',
          canEdit: true,
          expiresAt: 'January 30, 2027',
          hasExpiration: true
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '🔗 Bob Sharer shared a document with you: Shared Document.pdf'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Document shared notification sent successfully',
        messageId: 'msgxyz'
      });
    });

    it('should handle view-only permissions', async () => {
      req.body = {
        email: 'recipient@example.com',
        documentName: 'Document.pdf',
        sharedBy: 'Sharer',
        accessLink: 'https://flora.passbook.vc/shared/xyz',
        permissions: 'view'
      };

      const mockHtml = '<html>Document Shared</html>';
      const mockResult = { messageId: 'msgxyz', success: true };

      templateService.renderTemplate.mockResolvedValue(mockHtml);
      emailService.sendEmail.mockResolvedValue(mockResult);

      await documentEmailController.sendDocumentShared(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'documents/document-shared',
        expect.objectContaining({
          permissions: 'view',
          canEdit: false,
          hasExpiration: false
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        email: 'recipient@example.com',
        documentName: 'Document.pdf'
      };

      await documentEmailController.sendDocumentShared(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, documentName, sharedBy, accessLink'
      });
    });

    it('should handle errors gracefully', async () => {
      req.body = {
        email: 'recipient@example.com',
        documentName: 'Document.pdf',
        sharedBy: 'Sharer',
        accessLink: 'https://flora.passbook.vc/shared/xyz'
      };

      templateService.renderTemplate.mockRejectedValue(new Error('Template not found'));

      await documentEmailController.sendDocumentShared(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send document shared notification',
        details: undefined
      });
    });
  });
});
