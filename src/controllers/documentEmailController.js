const logger = require('../config/logger');
const templateService = require('../services/templateService');
const emailService = require('../services/emailService');
const EmailLog = require('../models/EmailLog');

/**
 * Document Email Controller
 * Handles document-related emails: upload notifications, signature requests, review requests, and shared documents
 * Implements EmailLog audit trail for all document-related emails
 */

/**
 * Send document notification (generic document upload)
 * @route POST /api/v1/emails/documents/notification
 */
exports.sendDocumentNotification = async (req, res) => {
  try {
    const {
      email,
      name,
      documentName,
      documentTitle,
      documentDescription,
      documentCategory,
      uploadedBy,
      uploadedAt,
      uploadDate,
      viewLink,
      documentLink,
      documentType,
      fileSize,
      fundName,
      isImportant,
      metadata
    } = req.body;

    // Validate required fields
    if (!email || !documentName || !uploadedBy || !viewLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, documentName, uploadedBy, viewLink'
      });
    }

    logger.info('Document notification requested', {
      email,
      documentName,
      uploadedBy
    });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      documentName,
      documentTitle: documentTitle || documentName,
      documentDescription: documentDescription || 'A new document has been uploaded for your review.',
      documentCategory: documentCategory || 'General',
      uploadedBy,
      uploadedAt: uploadedAt || new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      uploadDate: uploadDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      viewLink,
      documentLink: documentLink || viewLink,
      documentType: documentType || 'Document',
      fileSize: fileSize || 'N/A',
      fundName: fundName || 'Your Fund',
      isImportant: isImportant || false,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render document notification template
    const htmlContent = await templateService.renderTemplate(
      'documents/document-notification',
      variables
    );

    // Send email via Brevo
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject: `📄 New Document: ${documentName}`,
      htmlContent
    });

    // Log email to EmailLog for audit trail
    await EmailLog.create({
      emailType: 'document_upload',
      recipient: email,
      recipientName: variables.name,
      subject: `📄 New Document: ${documentName}`,
      templateUsed: 'documents/document-notification',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        documentName,
        documentType,
        uploadedBy,
        ...metadata
      },
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Document notification sent successfully', {
      email,
      documentName,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Document notification sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Document notification error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send document notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send document review request
 * @route POST /api/v1/emails/documents/review-request
 */
exports.sendDocumentReviewRequest = async (req, res) => {
  try {
    const {
      email,
      name,
      documentName,
      requestedBy,
      reviewLink,
      dueDate,
      documentType,
      reviewPurpose,
      priority,
      metadata
    } = req.body;

    // Validate required fields
    if (!email || !documentName || !requestedBy || !reviewLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, documentName, requestedBy, reviewLink'
      });
    }

    logger.info('Document review request requested', {
      email,
      documentName,
      requestedBy
    });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      documentName,
      requestedBy,
      reviewLink,
      dueDate: dueDate || 'At your earliest convenience',
      documentType: documentType || 'Document',
      reviewPurpose: reviewPurpose || 'Please review this document and provide your feedback.',
      priority: priority || 'normal',
      isUrgent: priority === 'urgent' || priority === 'high',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render document review request template
    const htmlContent = await templateService.renderTemplate(
      'documents/document-review-request',
      variables
    );

    const subject = priority === 'urgent'
      ? `🔴 URGENT: Review Required - ${documentName}`
      : `📋 Review Requested: ${documentName}`;

    // Send email via Brevo
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject,
      htmlContent
    });

    // Log email to EmailLog for audit trail
    await EmailLog.create({
      emailType: 'document_upload',
      recipient: email,
      recipientName: variables.name,
      subject,
      templateUsed: 'documents/document-review-request',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        documentName,
        documentType,
        requestedBy,
        dueDate,
        priority,
        ...metadata
      },
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Document review request sent successfully', {
      email,
      documentName,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Document review request sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Document review request error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send document review request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send signature request
 * @route POST /api/v1/emails/documents/signature-request
 */
exports.sendSignatureRequest = async (req, res) => {
  try {
    const {
      email,
      name,
      documentName,
      requestedBy,
      signatureLink,
      dueDate,
      documentType,
      description,
      urgency,
      trackOpens,
      metadata
    } = req.body;

    // Validate required fields
    if (!email || !documentName || !requestedBy || !signatureLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, documentName, requestedBy, signatureLink'
      });
    }

    logger.info('Signature request email requested', {
      email,
      documentName,
      requestedBy,
      trackOpens: trackOpens || false
    });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      documentName,
      requestedBy,
      signatureLink,
      dueDate: dueDate || 'At your earliest convenience',
      documentType: documentType || 'Document',
      description: description || 'Your signature is required on the following document.',
      urgency: urgency || 'normal',
      isUrgent: urgency === 'urgent' || urgency === 'high',
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render signature request template
    const htmlContent = await templateService.renderTemplate(
      'documents/signature-request',
      variables
    );

    const subject = urgency === 'urgent'
      ? `🔴 URGENT: Signature Required - ${documentName}`
      : `✍️ Signature Required: ${documentName}`;

    // Send email via Brevo (with tracking for signature requests)
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject,
      htmlContent
    });

    // Log email to EmailLog for audit trail with tracking metadata
    await EmailLog.create({
      emailType: 'signature_request',
      recipient: email,
      recipientName: variables.name,
      subject,
      templateUsed: 'documents/signature-request',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        documentName,
        documentType,
        requestedBy,
        dueDate,
        urgency,
        trackOpens: trackOpens || false,
        ...metadata
      },
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Signature request sent successfully', {
      email,
      documentName,
      messageId: result.messageId,
      trackingEnabled: trackOpens || false
    });

    res.status(200).json({
      success: true,
      message: 'Signature request sent successfully',
      messageId: result.messageId,
      trackingEnabled: trackOpens || false
    });

  } catch (error) {
    logger.error('Signature request error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send signature request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send document shared notification
 * @route POST /api/v1/emails/documents/shared
 */
exports.sendDocumentShared = async (req, res) => {
  try {
    const {
      email,
      name,
      documentName,
      sharedBy,
      sharedAt,
      accessLink,
      documentType,
      message,
      permissions,
      expiresAt,
      metadata
    } = req.body;

    // Validate required fields
    if (!email || !documentName || !sharedBy || !accessLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, documentName, sharedBy, accessLink'
      });
    }

    logger.info('Document shared notification requested', {
      email,
      documentName,
      sharedBy
    });

    // Prepare template variables
    const variables = {
      name: name || email.split('@')[0],
      email,
      documentName,
      sharedBy,
      sharedAt: sharedAt || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      accessLink,
      documentType: documentType || 'Document',
      message: message || `${sharedBy} has shared a document with you.`,
      permissions: permissions || 'view',
      canEdit: permissions === 'edit' || permissions === 'full',
      expiresAt: expiresAt || null,
      hasExpiration: !!expiresAt,
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      supportEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
      currentYear: new Date().getFullYear()
    };

    // Render document shared template
    const htmlContent = await templateService.renderTemplate(
      'documents/document-shared',
      variables
    );

    const subject = `🔗 ${sharedBy} shared a document with you: ${documentName}`;

    // Send email via Brevo
    const result = await emailService.sendEmail({
      to: {
        email,
        name: variables.name
      },
      subject,
      htmlContent
    });

    // Log email to EmailLog for audit trail
    await EmailLog.create({
      emailType: 'document_upload',
      recipient: email,
      recipientName: variables.name,
      subject,
      templateUsed: 'documents/document-shared',
      brevoMessageId: result.messageId,
      sentAt: new Date(),
      deliveryStatus: 'sent',
      metadata: {
        documentName,
        documentType,
        sharedBy,
        permissions,
        expiresAt,
        ...metadata
      },
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
      provider: 'brevo'
    });

    logger.info('Document shared notification sent successfully', {
      email,
      documentName,
      sharedBy,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Document shared notification sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Document shared notification error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send document shared notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
