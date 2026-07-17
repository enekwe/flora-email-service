const logger = require('../config/logger');
const templateService = require('../services/templateService');
const emailService = require('../services/emailService');

/**
 * Auth Email Controller
 * Handles authentication-related emails: password reset, email verification, welcome
 */

/**
 * Send password reset email
 * @route POST /api/v1/emails/auth/password-reset
 */
exports.sendPasswordResetEmail = async (req, res) => {
  try {
    const { email, name, resetToken, resetUrl } = req.body;

    // Validate required fields
    if (!email || !resetToken || !resetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, resetToken, resetUrl'
      });
    }

    logger.info('Password reset email requested', { email });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      resetLink: resetUrl,
      resetToken,
      expiresIn: '10 minutes',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render password reset template
    const htmlContent = await templateService.renderTemplate(
      'auth/password-reset',
      variables
    );

    // Send email via Brevo with EmailLog audit trail
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject: '🔐 Password Reset Request - Passbook Flora',
      htmlContent,
      emailType: 'password_reset',
      metadata: {
        resetToken: resetToken,
        expiresIn: '10 minutes'
      }
    });

    logger.info('Password reset email sent successfully', {
      email,
      messageId: result.messageId,
      emailId: result.emailId
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
      messageId: result.messageId,
      emailId: result.emailId
    });

  } catch (error) {
    logger.error('Password reset email error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send email verification
 * @route POST /api/v1/emails/auth/email-verification
 */
exports.sendEmailVerification = async (req, res) => {
  try {
    const { email, name, verificationToken, verificationUrl } = req.body;

    // Validate required fields
    if (!email || !verificationToken || !verificationUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, verificationToken, verificationUrl'
      });
    }

    logger.info('Email verification requested', { email });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      verificationLink: verificationUrl,
      verificationToken,
      expiresIn: '24 hours',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render email verification template
    const htmlContent = await templateService.renderTemplate(
      'auth/email-verification',
      variables
    );

    // Send email via Brevo with EmailLog audit trail
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject: '✉️ Verify Your Email - Passbook Flora',
      htmlContent,
      emailType: 'email_verification',
      metadata: {
        verificationToken: verificationToken,
        expiresIn: '24 hours'
      }
    });

    logger.info('Email verification sent successfully', {
      email,
      messageId: result.messageId,
      emailId: result.emailId
    });

    res.status(200).json({
      success: true,
      message: 'Email verification sent successfully',
      messageId: result.messageId,
      emailId: result.emailId
    });

  } catch (error) {
    logger.error('Email verification error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send email verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend email verification
 * @route POST /api/v1/emails/auth/resend-verification
 */
exports.resendEmailVerification = async (req, res) => {
  try {
    const { email, name, verificationToken, verificationUrl } = req.body;

    logger.info('Resend email verification requested', { email });

    // Use the same logic as sendEmailVerification
    return exports.sendEmailVerification(req, res);

  } catch (error) {
    logger.error('Resend verification error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send welcome email
 * @route POST /api/v1/emails/auth/welcome
 */
exports.sendWelcomeEmail = async (req, res) => {
  try {
    const { email, name, role, dashboardUrl } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name'
      });
    }

    logger.info('Welcome email requested', { email, role });

    // Prepare template variables
    const variables = {
      name,
      email,
      role: role || 'user',
      dashboardUrl: dashboardUrl || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/dashboard`,
      loginUrl: `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/login`,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear(),
      platformName: 'Passbook Flora'
    };

    // Render welcome email template
    const htmlContent = await templateService.renderTemplate(
      'auth/welcome',
      variables
    );

    // Send email via Brevo with EmailLog audit trail
    const result = await emailService.sendEmail({
      to: {
        email,
        name
      },
      subject: '🎉 Welcome to Passbook Flora!',
      htmlContent,
      emailType: 'welcome',
      metadata: { role: role || 'user' }
    });

    logger.info('Welcome email sent successfully', {
      email,
      messageId: result.messageId,
      emailId: result.emailId
    });

    res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      messageId: result.messageId,
      emailId: result.emailId
    });

  } catch (error) {
    logger.error('Welcome email error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send two-factor authentication code email
 * @route POST /api/v1/emails/auth/two-factor-code
 */
exports.sendTwoFactorCode = async (req, res) => {
  try {
    const { email, name, code, expiresIn } = req.body;

    // Validate required fields
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, code'
      });
    }

    logger.info('Two-factor code email requested', { email });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      code,
      expiresIn: expiresIn || '5 minutes',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render two-factor code template
    const htmlContent = await templateService.renderTemplate(
      'auth/two-factor-code',
      variables
    );

    // Send email via Brevo with EmailLog audit trail
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject: '🔒 Your Two-Factor Authentication Code - Passbook Flora',
      htmlContent,
      emailType: 'two_factor_code',
      metadata: {
        codeLength: code.length,
        expiresIn: expiresIn || '5 minutes'
      }
    });

    logger.info('Two-factor code email sent successfully', {
      email,
      messageId: result.messageId,
      emailId: result.emailId
    });

    res.status(200).json({
      success: true,
      message: 'Two-factor code email sent successfully',
      messageId: result.messageId,
      emailId: result.emailId
    });

  } catch (error) {
    logger.error('Two-factor code email error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send two-factor code email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
