/**
 * Auth Email Controller Tests
 * Tests for authentication-related email methods
 */

const authEmailController = require('../../controllers/authEmailController');
const templateService = require('../../services/templateService');
const emailService = require('../../services/emailService');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/templateService');
jest.mock('../../services/emailService');
jest.mock('../../config/logger');

describe('Auth Email Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup request and response mocks
    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup default mock implementations
    templateService.renderTemplate.mockResolvedValue('<html>Email Content</html>');
    emailService.sendEmail.mockResolvedValue({ messageId: 'test-message-id-123' });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password?token=reset-token-123'
      };

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/password-reset',
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          resetLink: 'https://flora.passbook.vc/reset-password?token=reset-token-123',
          resetToken: 'reset-token-123',
          expiresIn: '10 minutes'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: {
            email: 'test@example.com',
            name: 'Test User'
          },
          subject: '🔐 Password Reset Request - Passbook Flora',
          htmlContent: '<html>Email Content</html>'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully',
        messageId: 'test-message-id-123'
      });
    });

    it('should use default name from email when name not provided', async () => {
      req.body = {
        email: 'testuser@example.com',
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password?token=reset-token-123'
      };

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/password-reset',
        expect.objectContaining({
          name: 'testuser',
          email: 'testuser@example.com'
        })
      );
    });

    it('should return 400 when email is missing', async () => {
      req.body = {
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password'
      };

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, resetToken, resetUrl'
      });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when resetToken is missing', async () => {
      req.body = {
        email: 'test@example.com',
        resetUrl: 'https://flora.passbook.vc/reset-password'
      };

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, resetToken, resetUrl'
      });
    });

    it('should return 400 when resetUrl is missing', async () => {
      req.body = {
        email: 'test@example.com',
        resetToken: 'reset-token-123'
      };

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, resetToken, resetUrl'
      });
    });

    it('should handle template service errors', async () => {
      req.body = {
        email: 'test@example.com',
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password'
      };

      templateService.renderTemplate.mockRejectedValue(new Error('Template not found'));

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send password reset email',
        details: undefined
      });
    });

    it('should handle email service errors', async () => {
      req.body = {
        email: 'test@example.com',
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password'
      };

      emailService.sendEmail.mockRejectedValue(new Error('Email sending failed'));

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send password reset email',
        details: undefined
      });
    });

    it('should include error details in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      req.body = {
        email: 'test@example.com',
        resetToken: 'reset-token-123',
        resetUrl: 'https://flora.passbook.vc/reset-password'
      };

      emailService.sendEmail.mockRejectedValue(new Error('Email sending failed'));

      await authEmailController.sendPasswordResetEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send password reset email',
        details: 'Email sending failed'
      });

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('sendEmailVerification', () => {
    it('should send email verification successfully', async () => {
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        verificationToken: 'verify-token-123',
        verificationUrl: 'https://flora.passbook.vc/verify?token=verify-token-123'
      };

      await authEmailController.sendEmailVerification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/email-verification',
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          verificationLink: 'https://flora.passbook.vc/verify?token=verify-token-123',
          verificationToken: 'verify-token-123',
          expiresIn: '24 hours'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: {
            email: 'test@example.com',
            name: 'Test User'
          },
          subject: '✉️ Verify Your Email - Passbook Flora'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verification sent successfully',
        messageId: 'test-message-id-123'
      });
    });

    it('should use default name from email when name not provided', async () => {
      req.body = {
        email: 'john.doe@example.com',
        verificationToken: 'verify-token-123',
        verificationUrl: 'https://flora.passbook.vc/verify'
      };

      await authEmailController.sendEmailVerification(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/email-verification',
        expect.objectContaining({
          name: 'john.doe'
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        email: 'test@example.com'
      };

      await authEmailController.sendEmailVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, verificationToken, verificationUrl'
      });
    });

    it('should handle errors gracefully', async () => {
      req.body = {
        email: 'test@example.com',
        verificationToken: 'verify-token-123',
        verificationUrl: 'https://flora.passbook.vc/verify'
      };

      emailService.sendEmail.mockRejectedValue(new Error('Service unavailable'));

      await authEmailController.sendEmailVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send email verification',
        details: undefined
      });
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification by delegating to sendEmailVerification', async () => {
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        verificationToken: 'verify-token-123',
        verificationUrl: 'https://flora.passbook.vc/verify?token=verify-token-123'
      };

      await authEmailController.resendEmailVerification(req, res);

      // Should use the same logic as sendEmailVerification
      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/email-verification',
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verification sent successfully',
        messageId: 'test-message-id-123'
      });
    });

    it('should handle errors in resend flow', async () => {
      req.body = {
        email: 'test@example.com',
        verificationToken: 'verify-token-123',
        verificationUrl: 'https://flora.passbook.vc/verify'
      };

      emailService.sendEmail.mockRejectedValue(new Error('Network error'));

      await authEmailController.resendEmailVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'investor',
        dashboardUrl: 'https://flora.passbook.vc/dashboard'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/welcome',
        expect.objectContaining({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'investor',
          dashboardUrl: 'https://flora.passbook.vc/dashboard',
          platformName: 'Passbook Flora'
        })
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: {
            email: 'newuser@example.com',
            name: 'New User'
          },
          subject: '🎉 Welcome to Passbook Flora!'
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: 'test-message-id-123'
      });
    });

    it('should use default role when not provided', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/welcome',
        expect.objectContaining({
          role: 'user'
        })
      );
    });

    it('should use default dashboardUrl when not provided', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/welcome',
        expect.objectContaining({
          dashboardUrl: 'http://localhost:5173/dashboard',
          loginUrl: 'http://localhost:5173/login'
        })
      );
    });

    it('should return 400 when email is missing', async () => {
      req.body = {
        name: 'New User'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, name'
      });
    });

    it('should return 400 when name is missing', async () => {
      req.body = {
        email: 'newuser@example.com'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: email, name'
      });
    });

    it('should handle errors gracefully', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      templateService.renderTemplate.mockRejectedValue(new Error('Template error'));

      await authEmailController.sendWelcomeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send welcome email',
        details: undefined
      });
    });

    it('should include currentYear in template variables', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      await authEmailController.sendWelcomeEmail(req, res);

      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'auth/welcome',
        expect.objectContaining({
          currentYear: new Date().getFullYear()
        })
      );
    });
  });
});
