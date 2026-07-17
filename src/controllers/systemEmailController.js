const logger = require('../config/logger');
const templateService = require('../services/templateService');
const emailService = require('../services/emailService');

/**
 * System Email Controller
 * Handles system-wide emails: maintenance notifications, announcements, bulk sends
 */

/**
 * Send system maintenance notification
 * @route POST /api/v1/emails/system/maintenance
 */
exports.sendMaintenanceNotification = async (req, res) => {
  try {
    const {
      recipients,
      maintenanceDate,
      maintenanceTime,
      duration,
      affectedServices,
      description,
      contactEmail
    } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recipients array'
      });
    }

    if (!maintenanceDate || !maintenanceTime || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: maintenanceDate, maintenanceTime, duration'
      });
    }

    logger.info('Maintenance notification requested', {
      recipientCount: recipients.length,
      maintenanceDate,
      maintenanceTime
    });

    const results = [];
    const errors = [];

    // Prepare template variables (common for all recipients)
    const commonVariables = {
      maintenanceDate,
      maintenanceTime,
      duration,
      affectedServices: affectedServices || ['All Flora services'],
      description: description || 'We will be performing scheduled maintenance to improve our services.',
      contactEmail: contactEmail || process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        const variables = {
          ...commonVariables,
          name: recipient.name || recipient.email.split('@')[0],
          email: recipient.email
        };

        const htmlContent = await templateService.renderTemplate(
          'system/system-maintenance',
          variables
        );

        const result = await emailService.sendEmail({
          to: {
            email: recipient.email,
            name: variables.name
          },
          subject: `🔧 Scheduled Maintenance Notice - ${maintenanceDate}`,
          htmlContent
        });

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });

        logger.info('Maintenance notification sent', {
          email: recipient.email,
          messageId: result.messageId
        });

        // Rate limiting: small delay between sends to avoid Brevo throttling
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('Maintenance notification error for recipient', {
          email: recipient.email,
          error: error.message
        });
        errors.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    logger.info('Maintenance notification batch completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length
    });

    res.status(200).json({
      success: true,
      message: 'Maintenance notification batch completed',
      summary: {
        total: recipients.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    logger.error('Maintenance notification error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send maintenance notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send system announcement
 * @route POST /api/v1/emails/system/announcement
 */
exports.sendAnnouncement = async (req, res) => {
  try {
    const {
      recipients,
      subject,
      announcementTitle,
      announcementBody,
      ctaText,
      ctaLink,
      priority
    } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recipients array'
      });
    }

    if (!subject || !announcementTitle || !announcementBody) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, announcementTitle, announcementBody'
      });
    }

    logger.info('System announcement requested', {
      recipientCount: recipients.length,
      subject,
      priority: priority || 'normal'
    });

    const results = [];
    const errors = [];

    // Prepare template variables (common for all recipients)
    const commonVariables = {
      announcementTitle,
      announcementBody,
      ctaText: ctaText || 'Learn More',
      ctaLink: ctaLink || process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      priority: priority || 'normal',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        const variables = {
          ...commonVariables,
          name: recipient.name || recipient.email.split('@')[0],
          email: recipient.email
        };

        // Use system maintenance template for now (can create dedicated announcement template later)
        const htmlContent = await templateService.renderTemplate(
          'system/system-maintenance',
          variables
        );

        const result = await emailService.sendEmail({
          to: {
            email: recipient.email,
            name: variables.name
          },
          subject: priority === 'urgent' ? `⚠️ URGENT: ${subject}` : `📢 ${subject}`,
          htmlContent
        });

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });

        logger.info('Announcement sent', {
          email: recipient.email,
          messageId: result.messageId
        });

        // Rate limiting: small delay between sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('Announcement error for recipient', {
          email: recipient.email,
          error: error.message
        });
        errors.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    logger.info('Announcement batch completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length
    });

    res.status(200).json({
      success: true,
      message: 'Announcement batch completed',
      summary: {
        total: recipients.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    logger.error('Announcement error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send announcement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send bulk emails with custom template
 * @route POST /api/v1/emails/system/bulk
 */
exports.sendBulkEmails = async (req, res) => {
  try {
    const {
      recipients,
      subject,
      templateName,
      templateVariables,
      rateLimitDelay
    } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recipients array'
      });
    }

    if (!subject || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, templateName'
      });
    }

    logger.info('Bulk email send requested', {
      recipientCount: recipients.length,
      subject,
      templateName
    });

    const results = [];
    const errors = [];
    const delay = rateLimitDelay || 100; // Default 100ms between sends

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Merge common variables with recipient-specific data
        const variables = {
          ...templateVariables,
          name: recipient.name || recipient.email.split('@')[0],
          email: recipient.email,
          frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
          supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
          currentYear: new Date().getFullYear(),
          // Allow recipient-specific overrides
          ...(recipient.variables || {})
        };

        const htmlContent = await templateService.renderTemplate(
          templateName,
          variables
        );

        const result = await emailService.sendEmail({
          to: {
            email: recipient.email,
            name: variables.name
          },
          subject,
          htmlContent
        });

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });

        logger.info('Bulk email sent', {
          email: recipient.email,
          messageId: result.messageId
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        logger.error('Bulk email error for recipient', {
          email: recipient.email,
          error: error.message
        });
        errors.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    logger.info('Bulk email batch completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
      templateName
    });

    res.status(200).json({
      success: true,
      message: 'Bulk email batch completed',
      summary: {
        total: recipients.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    logger.error('Bulk email error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
