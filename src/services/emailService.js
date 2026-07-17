const axios = require('axios');
const logger = require('../config/logger');
const emailConfig = require('../config/email');
const templateService = require('./templateService');
const { retryWithBackoff } = require('../utils/helpers');
const EmailLog = require('../models/EmailLog');

/**
 * Email Service
 * Handles email delivery via Brevo (formerly Sendinblue) API
 * Implements retry logic with exponential backoff
 */

class EmailService {
  constructor() {
    this.apiKey = emailConfig.brevo.apiKey;
    this.apiUrl = emailConfig.brevo.apiUrl;
    this.senderEmail = emailConfig.brevo.senderEmail;
    this.senderName = emailConfig.brevo.senderName;
    this.retryConfig = emailConfig.retryConfig;

    if (!this.apiKey) {
      logger.warn('Brevo API key not configured. Email sending will fail.');
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitation, senderContext) {
    try {
      logger.info('Preparing to send invitation email', {
        invitationId: invitation.invitationId,
        recipientEmail: invitation.inviteeEmail,
        contextType: senderContext.contextType
      });

      // Select appropriate template
      const templateName = templateService.selectTemplate({
        senderContext,
        lpEntityInfo: invitation.lpEntityInfo
      });

      logger.debug('Selected email template', { templateName });

      // Prepare template variables
      const variables = this.prepareTemplateVariables(invitation, senderContext);

      // Render HTML content
      const htmlContent = await templateService.renderTemplate(templateName, variables);

      // Send email via Brevo
      const result = await this.sendEmail({
        to: {
          email: invitation.inviteeEmail,
          name: invitation.inviteeName
        },
        subject: this.getEmailSubject(senderContext),
        htmlContent
      });

      logger.info('Invitation email sent successfully', {
        invitationId: invitation.invitationId,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send invitation email', {
        invitationId: invitation.invitationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send email via Brevo API with retry logic and EmailLog audit trail
   */
  async sendEmail({ to, subject, htmlContent, emailType = 'other', metadata = {}, templateUsed = null, attachments = [] }) {
    const emailLog = new EmailLog({
      emailType,
      recipient: to.email,
      recipientName: to.name,
      subject,
      templateUsed,
      senderEmail: this.senderEmail,
      senderName: this.senderName,
      provider: 'brevo',
      metadata,
      attachments: attachments.map(att => ({
        filename: att.name || att.filename,
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        url: att.url
      })),
      deliveryStatus: 'pending',
      retries: 0
    });

    const sendEmailFn = async () => {
      try {
        const payload = {
          sender: {
            email: this.senderEmail,
            name: this.senderName
          },
          to: [
            {
              email: to.email,
              name: to.name
            }
          ],
          subject,
          htmlContent
        };

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
          payload.attachment = attachments.map(att => ({
            name: att.name || att.filename,
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

        // Update EmailLog with success
        emailLog.brevoMessageId = response.data.messageId;
        emailLog.deliveryStatus = 'sent';
        emailLog.sentAt = new Date();
        await emailLog.save();

        logger.info('Email sent and logged successfully', {
          emailId: emailLog._id,
          messageId: response.data.messageId,
          recipient: to.email,
          emailType
        });

        return {
          messageId: response.data.messageId,
          emailId: emailLog._id.toString(),
          success: true
        };
      } catch (error) {
        logger.error('Brevo API error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          recipient: to.email
        });

        // Update EmailLog with failure
        emailLog.deliveryStatus = 'failed';
        emailLog.errorMessage = error.message;
        emailLog.errorStack = error.stack;
        await emailLog.save();

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw new Error(`Email sending failed: ${error.response?.data?.message || error.message}`);
        }

        throw error;
      }
    };

    // Execute with retry logic
    try {
      return await retryWithBackoff(
        sendEmailFn,
        this.retryConfig.maxRetries,
        this.retryConfig.initialDelay,
        this.retryConfig.maxDelay
      );
    } catch (error) {
      // Final failure - increment retry count
      emailLog.retries += 1;
      await emailLog.save();
      throw error;
    }
  }

  /**
   * Prepare template variables from invitation and context
   */
  prepareTemplateVariables(invitation, senderContext) {
    const inviteLink = `${process.env.FRONTEND_URL}/invitations/accept?token=${invitation.token}`;
    const unsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(invitation.inviteeEmail)}`;

    return {
      inviteeName: invitation.inviteeName,
      inviteeEmail: invitation.inviteeEmail,
      role: invitation.role,
      token: invitation.token,
      tokenExpiresAt: invitation.tokenExpiresAt,
      personalMessage: invitation.personalMessage,
      contextName: senderContext.contextName,
      contextType: senderContext.contextType,
      contextDescription: senderContext.contextDescription,
      inviteLink,
      unsubscribeLink
    };
  }

  /**
   * Get email subject based on sender context
   */
  getEmailSubject(senderContext) {
    const { contextName, contextType } = senderContext;

    const subjects = {
      fund: `Invitation to join ${contextName} on Passbook Flora`,
      lp_entity: `${contextName} has invited you to Passbook Flora`,
      company: `Invitation to join ${contextName} on Passbook Flora`,
      platform: 'Welcome to Passbook Flora'
    };

    return subjects[contextType] || 'Invitation to Passbook Flora';
  }

  /**
   * Send invitation reminder email
   */
  async sendReminderEmail(invitation, senderContext) {
    try {
      logger.info('Sending invitation reminder', {
        invitationId: invitation.invitationId,
        recipientEmail: invitation.inviteeEmail
      });

      const variables = this.prepareTemplateVariables(invitation, senderContext);
      variables.isReminder = true;

      const templateName = templateService.selectTemplate({
        senderContext,
        lpEntityInfo: invitation.lpEntityInfo
      });

      const htmlContent = await templateService.renderTemplate(templateName, variables);

      const result = await this.sendEmail({
        to: {
          email: invitation.inviteeEmail,
          name: invitation.inviteeName
        },
        subject: `Reminder: ${this.getEmailSubject(senderContext)}`,
        htmlContent
      });

      logger.info('Reminder email sent successfully', {
        invitationId: invitation.invitationId,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send reminder email', {
        invitationId: invitation.invitationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate Brevo configuration
   */
  validateConfiguration() {
    if (!this.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    if (!this.senderEmail) {
      throw new Error('Sender email not configured');
    }

    return true;
  }
}

module.exports = new EmailService();
