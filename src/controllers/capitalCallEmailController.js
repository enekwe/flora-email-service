const logger = require('../config/logger');
const templateService = require('../services/templateService');
const emailService = require('../services/emailService');
const EmailLog = require('../models/EmailLog');

/**
 * Capital Call Email Controller
 * Handles capital call and distribution notice emails to LPs
 * Implements 4 core methods with EmailLog tracking for audit trail
 *
 * Methods:
 * 1. sendCapitalCallNotification() - Initial capital call notice
 * 2. sendCapitalCallReminder() - Reminder before/after due date
 * 3. sendPaymentConfirmation() - Confirms payment received
 * 4. sendPaymentOverdueNotice() - Formal overdue notice
 */

/**
 * 1. Send capital call notification to LP(s)
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

    logger.info('Capital call notification requested', {
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
 * 2. Send capital call payment reminder
 * @route POST /api/v1/emails/capital-calls/reminder
 * @description Sends reminder for pending capital call payment (before or after due date)
 */
exports.sendCapitalCallReminder = async (req, res) => {
  try {
    const {
      email,
      name,
      fundName,
      callAmount,
      callNumber,
      dueDate,
      daysUntilDue,
      daysOverdue,
      callDetailsLink,
      fundManagerName,
      adminEmail,
      adminPhone
    } = req.body;

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
      daysOverdue,
      daysUntilDue
    });

    // Determine reminder urgency and messaging
    let urgencyLevel = 'standard';
    let reminderMessage = 'Payment due soon';

    if (daysOverdue && daysOverdue > 0) {
      urgencyLevel = 'overdue';
      reminderMessage = `Payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
    } else if (daysUntilDue && daysUntilDue <= 3) {
      urgencyLevel = 'urgent';
      reminderMessage = `Payment due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;
    } else if (daysUntilDue && daysUntilDue <= 7) {
      urgencyLevel = 'upcoming';
      reminderMessage = `Payment due in ${daysUntilDue} days`;
    }

    // Prepare template variables
    const variables = {
      name,
      email,
      fundName,
      callAmount: parseFloat(callAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      callNumber: callNumber || 'N/A',
      dueDate,
      reminderMessage,
      urgencyLevel,
      daysUntilDue: daysUntilDue || 0,
      daysOverdue: daysOverdue || 0,
      callDetailsLink: callDetailsLink || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/capital-calls`,
      adminEmail: adminEmail || process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      adminPhone: adminPhone || 'Contact via email',
      fundManagerName: fundManagerName || fundName,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render reminder template
    const htmlContent = await templateService.renderTemplate(
      'capital-calls/capital-call-reminder',
      variables
    );

    // Send email
    const emailData = {
      to: {
        email,
        name
      },
      subject: `⚠️ Capital Call Reminder - ${fundName}`,
      htmlContent
    };

    const result = await emailService.sendEmail(emailData);

    // Log email to database
    await EmailLog.create({
      emailType: 'capital_call_reminder',
      recipient: email,
      recipientName: name,
      subject: emailData.subject,
      templateUsed: 'capital-calls/capital-call-reminder',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        fundName,
        callAmount,
        callNumber,
        dueDate,
        daysOverdue,
        daysUntilDue,
        urgencyLevel
      },
      relatedFund: req.body.fundId || null,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Capital call reminder sent successfully', {
      email,
      fundName,
      urgencyLevel,
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

    // Log failed email attempt
    try {
      await EmailLog.create({
        emailType: 'capital_call_reminder',
        recipient: req.body.email,
        recipientName: req.body.name,
        subject: `⚠️ Capital Call Reminder - ${req.body.fundName}`,
        templateUsed: 'capital-calls/capital-call-reminder',
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
      error: 'Failed to send capital call reminder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 3. Send payment confirmation
 * @route POST /api/v1/emails/capital-calls/payment-confirmation
 * @description Confirms receipt of capital call payment
 */
exports.sendPaymentConfirmation = async (req, res) => {
  try {
    const {
      email,
      name,
      fundName,
      callAmount,
      callNumber,
      paymentAmount,
      paymentDate,
      paymentMethod,
      transactionReference,
      confirmationNumber,
      callDetailsLink,
      fundManagerName,
      adminEmail,
      adminPhone
    } = req.body;

    // Validate required fields
    if (!email || !name || !fundName || !paymentAmount || !paymentDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, fundName, paymentAmount, paymentDate'
      });
    }

    logger.info('Payment confirmation requested', {
      email,
      fundName,
      paymentAmount,
      paymentDate
    });

    // Prepare template variables
    const variables = {
      name,
      email,
      fundName,
      callAmount: callAmount ? parseFloat(callAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A',
      callNumber: callNumber || 'N/A',
      paymentAmount: parseFloat(paymentAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      paymentDate,
      paymentMethod: paymentMethod || 'Wire Transfer',
      transactionReference: transactionReference || 'N/A',
      confirmationNumber: confirmationNumber || `CONF-${Date.now()}`,
      callDetailsLink: callDetailsLink || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/capital-calls`,
      adminEmail: adminEmail || process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      adminPhone: adminPhone || 'Contact via email',
      fundManagerName: fundManagerName || fundName,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render payment confirmation template
    const htmlContent = await templateService.renderTemplate(
      'capital-calls/payment-confirmation',
      variables
    );

    // Send email
    const emailData = {
      to: {
        email,
        name
      },
      subject: `✅ Payment Received - ${fundName} Capital Call`,
      htmlContent
    };

    const result = await emailService.sendEmail(emailData);

    // Log email to database
    await EmailLog.create({
      emailType: 'capital_call',
      recipient: email,
      recipientName: name,
      subject: emailData.subject,
      templateUsed: 'capital-calls/payment-confirmation',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        fundName,
        callAmount,
        callNumber,
        paymentAmount,
        paymentDate,
        paymentMethod,
        transactionReference,
        confirmationNumber: variables.confirmationNumber
      },
      relatedFund: req.body.fundId || null,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Payment confirmation sent successfully', {
      email,
      fundName,
      paymentAmount,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmation sent successfully',
      messageId: result.messageId,
      confirmationNumber: variables.confirmationNumber
    });

  } catch (error) {
    logger.error('Payment confirmation error:', {
      error: error.message,
      stack: error.stack
    });

    // Log failed email attempt
    try {
      await EmailLog.create({
        emailType: 'capital_call',
        recipient: req.body.email,
        recipientName: req.body.name,
        subject: `✅ Payment Received - ${req.body.fundName} Capital Call`,
        templateUsed: 'capital-calls/payment-confirmation',
        sentAt: new Date(),
        deliveryStatus: 'failed',
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: { fundName: req.body.fundName, paymentAmount: req.body.paymentAmount },
        provider: 'brevo'
      });
    } catch (logError) {
      logger.error('Failed to log email error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send payment confirmation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 4. Send payment overdue notice
 * @route POST /api/v1/emails/capital-calls/payment-overdue
 * @description Sends formal overdue notice for missed capital call payment
 */
exports.sendPaymentOverdueNotice = async (req, res) => {
  try {
    const {
      email,
      name,
      fundName,
      callAmount,
      callNumber,
      originalDueDate,
      daysOverdue,
      totalOutstanding,
      lateFeeAmount,
      penaltyPercentage,
      newDueDate,
      escalationLevel,
      callDetailsLink,
      fundManagerName,
      adminEmail,
      adminPhone,
      legalNotice
    } = req.body;

    // Validate required fields
    if (!email || !name || !fundName || !callAmount || !originalDueDate || !daysOverdue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, fundName, callAmount, originalDueDate, daysOverdue'
      });
    }

    logger.info('Payment overdue notice requested', {
      email,
      fundName,
      daysOverdue,
      escalationLevel
    });

    // Determine escalation level messaging
    let escalationMessage = 'Immediate action required';
    const currentEscalationLevel = escalationLevel || 'first_notice';

    if (currentEscalationLevel === 'final_notice') {
      escalationMessage = 'FINAL NOTICE - Legal action may be pursued';
    } else if (currentEscalationLevel === 'second_notice') {
      escalationMessage = 'SECOND NOTICE - Additional penalties may apply';
    }

    // Calculate total amount due (including late fees if applicable)
    const totalAmount = lateFeeAmount
      ? parseFloat(callAmount) + parseFloat(lateFeeAmount)
      : parseFloat(callAmount);

    // Prepare template variables
    const variables = {
      name,
      email,
      fundName,
      callAmount: parseFloat(callAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      callNumber: callNumber || 'N/A',
      originalDueDate,
      daysOverdue,
      totalOutstanding: totalOutstanding ? parseFloat(totalOutstanding).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : parseFloat(totalAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      lateFeeAmount: lateFeeAmount ? parseFloat(lateFeeAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00',
      penaltyPercentage: penaltyPercentage || '0',
      hasLateFee: !!lateFeeAmount,
      newDueDate: newDueDate || 'Contact fund administrator immediately',
      escalationLevel: currentEscalationLevel,
      escalationMessage,
      isFinalNotice: currentEscalationLevel === 'final_notice',
      callDetailsLink: callDetailsLink || `${process.env.FRONTEND_URL || 'https://flora.passbook.vc'}/capital-calls`,
      adminEmail: adminEmail || process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      adminPhone: adminPhone || 'Contact via email',
      fundManagerName: fundManagerName || fundName,
      legalNotice: legalNotice || 'Failure to remit payment may result in legal action as outlined in your subscription agreement.',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render overdue notice template
    const htmlContent = await templateService.renderTemplate(
      'capital-calls/payment-overdue',
      variables
    );

    // Send email with high priority
    const emailData = {
      to: {
        email,
        name
      },
      subject: `🚨 OVERDUE: Capital Call Payment - ${fundName}${currentEscalationLevel === 'final_notice' ? ' [FINAL NOTICE]' : ''}`,
      htmlContent
    };

    const result = await emailService.sendEmail(emailData);

    // Log email to database with high priority metadata
    await EmailLog.create({
      emailType: 'capital_call_reminder',
      recipient: email,
      recipientName: name,
      subject: emailData.subject,
      templateUsed: 'capital-calls/payment-overdue',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        fundName,
        callAmount,
        callNumber,
        originalDueDate,
        daysOverdue,
        escalationLevel: currentEscalationLevel,
        lateFeeAmount,
        totalOutstanding: variables.totalOutstanding,
        priority: 'high'
      },
      relatedFund: req.body.fundId || null,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Payment overdue notice sent successfully', {
      email,
      fundName,
      daysOverdue,
      escalationLevel: currentEscalationLevel,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Payment overdue notice sent successfully',
      messageId: result.messageId,
      escalationLevel: currentEscalationLevel
    });

  } catch (error) {
    logger.error('Payment overdue notice error:', {
      error: error.message,
      stack: error.stack
    });

    // Log failed email attempt
    try {
      await EmailLog.create({
        emailType: 'capital_call_reminder',
        recipient: req.body.email,
        recipientName: req.body.name,
        subject: `🚨 OVERDUE: Capital Call Payment - ${req.body.fundName}`,
        templateUsed: 'capital-calls/payment-overdue',
        sentAt: new Date(),
        deliveryStatus: 'failed',
        errorMessage: error.message,
        errorStack: error.stack,
        metadata: {
          fundName: req.body.fundName,
          daysOverdue: req.body.daysOverdue,
          escalationLevel: req.body.escalationLevel
        },
        provider: 'brevo'
      });
    } catch (logError) {
      logger.error('Failed to log email error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send payment overdue notice',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send distribution notice
 * @route POST /api/v1/emails/capital-calls/distribution
 * @description Sends distribution notice to LPs
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

    // Prepare template variables
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

    const emailData = {
      to: {
        email,
        name
      },
      subject: `💸 Distribution Notice - ${fundName}`,
      htmlContent
    };

    const result = await emailService.sendEmail(emailData);

    // Log email to database
    await EmailLog.create({
      emailType: 'distribution_notice',
      recipient: email,
      recipientName: name,
      subject: emailData.subject,
      templateUsed: 'capital-calls/capital-call-notification',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        fundName,
        distributionAmount,
        distributionDate,
        distributionPurpose
      },
      relatedFund: req.body.fundId || null,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
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
 * @description Sends capital call notifications to multiple LPs
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

          exports.sendCapitalCallNotification(mockReq, mockRes);
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
