const logger = require('../config/logger');
const templateService = require('../services/templateService');
const emailService = require('../services/emailService');
const EmailLog = require('../models/EmailLog');

/**
 * Capital Call Email Controller
 * Handles capital call and distribution notice emails to LPs
 * Implements 4 core methods with EmailLog tracking for audit trail
 */

/**
 * Send capital call notification to LP(s)
 * @route POST /api/v1/emails/capital-calls/notification
 * @description Sends initial capital call notice with wire instructions
 */
exports.sendCapitalCallNotification = async (req, res) => {
  try {
    const {
      email,
      name,
      fundName,
      callAmount,
      callNumber,
      totalCommitment,
      ownershipPercentage,
      dueDate,
      callPurpose,
      callDetailsLink,
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      wireReference,
      adminEmail,
      adminPhone,
      fundManagerName,
      attachments
    } = req.body;

    // Validate required fields
    if (!email || !name || !fundName || !callAmount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, fundName, callAmount, dueDate'
      });
    }

    logger.info('Capital call notice requested', {
      email,
      fundName,
      callAmount
    });

    // Prepare template variables
    const variables = {
      name,
      email,
      fundName,
      callAmount: parseFloat(callAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      callNumber: callNumber || 'N/A',
      totalCommitment: totalCommitment ? parseFloat(totalCommitment).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A',
      ownershipPercentage: ownershipPercentage || 'N/A',
      dueDate,
      callPurpose: callPurpose || 'Fund investment opportunities',
      callDetailsLink: callDetailsLink || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/capital-calls`,
      bankName: bankName || 'TBD',
      accountName: accountName || 'TBD',
      accountNumber: accountNumber || 'TBD',
      routingNumber: routingNumber || 'TBD',
      wireReference: wireReference || `CC-${fundName}-${Date.now()}`,
      adminEmail: adminEmail || process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      adminPhone: adminPhone || 'Contact via email',
      fundManagerName: fundManagerName || fundName,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render capital call template
    const htmlContent = await templateService.renderTemplate(
      'capital-calls/capital-call-notification',
      variables
    );

    // Prepare email data
    const emailData = {
      to: {
        email,
        name
      },
      subject: `💰 Capital Call Notice - ${fundName}`,
      htmlContent
    };

    // TODO: Add attachment support when implementing full email service
    // if (attachments && attachments.length > 0) {
    //   emailData.attachments = attachments;
    // }

    // Send email via Brevo
    const result = await emailService.sendEmail(emailData);

    // Log email to database for tracking
    await EmailLog.create({
      emailType: 'capital_call',
      recipient: email,
      recipientName: name,
      subject: emailData.subject,
      templateUsed: 'capital-calls/capital-call-notification',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        fundName,
        callAmount,
        callNumber,
        dueDate,
        callPurpose
      },
      relatedFund: req.body.fundId || null,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Capital call notification sent successfully', {
      email,
      fundName,
      callAmount,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Capital call notification sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Capital call notification error:', {
      error: error.message,
      stack: error.stack
    });

    // Log failed email attempt
    try {
      await EmailLog.create({
        emailType: 'capital_call',
        recipient: req.body.email,
        recipientName: req.body.name,
        subject: `💰 Capital Call Notice - ${req.body.fundName}`,
        templateUsed: 'capital-calls/capital-call-notification',
        sentAt: new Date(),
        deliveryStatus: 'failed',
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { fundName: req.body.fundName },
        provider: 'brevo'
      });
    } catch (logError) {
      logger.error('Failed to log email error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send capital call notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send distribution notice
 * @route POST /api/v1/emails/capital-calls/distribution
 */
exports.sendDistributionNotice = async (req, res) => {
  try {
    const {
      email,
      name,
      fundName,
      distributionAmount,
      distributionDate,
      distributionPurpose,
      detailsLink
    } = req.body;

    // Validate required fields
    if (!email || !name || !fundName || !distributionAmount || !distributionDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, fundName, distributionAmount, distributionDate'
      });
    }

    logger.info('Distribution notice requested', {
      email,
      fundName,
      distributionAmount
    });

    // For now, use capital call template with modified variables
    // TODO: Create dedicated distribution notice template
    const variables = {
      name,
      email,
      fundName,
      callAmount: parseFloat(distributionAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      dueDate: distributionDate,
      callPurpose: distributionPurpose || 'Distribution from fund returns',
      callDetailsLink: detailsLink || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/distributions`,
      callNumber: 'Distribution',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    const htmlContent = await templateService.renderTemplate(
      'capital-calls/capital-call-notification',
      variables
    );

    const result = await emailService.sendEmail({
      to: {
        email,
        name
      },
      subject: `💸 Distribution Notice - ${fundName}`,
      htmlContent
    });

    logger.info('Distribution notice sent successfully', {
      email,
      fundName,
      distributionAmount,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Distribution notice sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Distribution notice error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send distribution notice',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send bulk capital calls
 * @route POST /api/v1/emails/capital-calls/bulk
 */
exports.sendBulkCapitalCalls = async (req, res) => {
  try {
    const { recipients, capitalCallData } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid recipients array'
      });
    }

    if (!capitalCallData || !capitalCallData.fundName || !capitalCallData.callAmount || !capitalCallData.dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required capital call data: fundName, callAmount, dueDate'
      });
    }

    logger.info('Bulk capital call requested', {
      recipientCount: recipients.length,
      fundName: capitalCallData.fundName
    });

    const results = [];
    const errors = [];

    // Send to each recipient
    // TODO: Implement proper bulk sending with rate limiting
    for (const recipient of recipients) {
      try {
        const emailData = {
          ...capitalCallData,
          email: recipient.email,
          name: recipient.name,
          totalCommitment: recipient.totalCommitment,
          ownershipPercentage: recipient.ownershipPercentage
        };

        // Use the single send method
        await new Promise((resolve, reject) => {
          const mockReq = { body: emailData };
          const mockRes = {
            status: (code) => ({
              json: (data) => {
                if (code === 200) {
                  results.push({ email: recipient.email, success: true, messageId: data.messageId });
                  resolve();
                } else {
                  errors.push({ email: recipient.email, error: data.error });
                  reject(new Error(data.error));
                }
              }
            })
          };

          exports.sendCapitalCallNotice(mockReq, mockRes);
        });

      } catch (error) {
        logger.error('Bulk send error for recipient', {
          email: recipient.email,
          error: error.message
        });
        errors.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    logger.info('Bulk capital call completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length
    });

    res.status(200).json({
      success: true,
      message: 'Bulk capital call processing completed',
      summary: {
        total: recipients.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    logger.error('Bulk capital call error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send bulk capital calls',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send capital call reminder
 * @route POST /api/v1/emails/capital-calls/reminder
 */
exports.sendCapitalCallReminder = async (req, res) => {
  try {
    const { email, name, fundName, callAmount, dueDate, daysOverdue } = req.body;

    // Validate required fields
    if (!email || !name || !fundName || !callAmount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, fundName, callAmount, dueDate'
      });
    }

    logger.info('Capital call reminder requested', {
      email,
      fundName,
      daysOverdue
    });

    // Use capital call template with reminder messaging
    const variables = {
      name,
      email,
      fundName,
      callAmount: parseFloat(callAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      dueDate,
      callPurpose: daysOverdue > 0
        ? `REMINDER: Payment is ${daysOverdue} days overdue`
        : `REMINDER: Payment due soon`,
      callDetailsLink: `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/capital-calls`,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    const htmlContent = await templateService.renderTemplate(
      'capital-calls/capital-call-notification',
      variables
    );

    const result = await emailService.sendEmail({
      to: {
        email,
        name
      },
      subject: `⚠️ Capital Call Reminder - ${fundName}`,
      htmlContent
    });

    logger.info('Capital call reminder sent successfully', {
      email,
      fundName,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Capital call reminder sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Capital call reminder error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send capital call reminder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
