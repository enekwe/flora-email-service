const PlatformInvitation = require('../models/PlatformInvitation');
const contextService = require('../services/contextService');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');
const logger = require('../config/logger');
const { getPaginationMetadata, formatSuccess, formatError } = require('../utils/helpers');

/**
 * Invitation Controller
 * Handles all invitation-related operations
 * Routes → Controllers → Services → Models (Flora pattern)
 */

/**
 * Create new invitation
 * POST /api/v1/invitations/create
 */
exports.createInvitation = async (req, res, next) => {
  try {
    const {
      inviteeName,
      inviteeEmail,
      role,
      invitationType,
      investmentContext,
      personalMessage
    } = req.body;

    logger.info('Creating invitation', {
      inviteeEmail,
      role,
      invitationType,
      invitedBy: req.user.id
    });

    // Resolve sender context
    const senderContext = await contextService.resolveSenderContext(
      req.user.id,
      investmentContext
    );

    // Create invitation document
    const invitation = new PlatformInvitation({
      invitedBy: req.user.id,
      inviteeName,
      inviteeEmail,
      role,
      invitationType,
      investmentContext,
      personalMessage,
      senderContext,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        source: 'api_created'
      }
    });

    // Save to database
    await invitation.save();

    // Log audit
    await auditService.logInvitationCreated(invitation, req.user);

    // Send invitation email
    try {
      const emailResult = await emailService.sendInvitationEmail(invitation, senderContext);

      // Mark as sent
      await invitation.send('invitation_sent', emailResult.messageId);

      // Log email sent
      await auditService.logInvitationSent(invitation, emailResult);

      logger.info('Invitation created and sent successfully', {
        invitationId: invitation.invitationId,
        messageId: emailResult.messageId
      });
    } catch (emailError) {
      logger.error('Failed to send invitation email', {
        invitationId: invitation.invitationId,
        error: emailError.message
      });

      // Log failed email
      await auditService.logEmailDeliveryFailed(invitation, emailError);

      // Return success but note email failure
      return res.status(201).json({
        success: true,
        data: invitation,
        warning: 'Invitation created but email delivery failed. You can resend it later.'
      });
    }

    res.status(201).json(formatSuccess(invitation, 'Invitation created and sent successfully'));
  } catch (error) {
    logger.error('Error creating invitation', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * List invitations
 * GET /api/v1/invitations
 */
exports.listInvitations = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      role,
      invitationType,
      fundId,
      companyId
    } = req.query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Non-admin users can only see invitations they created
    if (req.user.role !== 'admin') {
      filter.invitedBy = req.user.id;
    }

    if (status) filter.status = status;
    if (role) filter.role = role;
    if (invitationType) filter.invitationType = invitationType;
    if (fundId) filter['investmentContext.fundId'] = fundId;
    if (companyId) filter['investmentContext.companyId'] = companyId;

    // Execute query
    const [invitations, totalCount] = await Promise.all([
      PlatformInvitation.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-token') // Don't expose tokens in list
        .lean(),
      PlatformInvitation.countDocuments(filter)
    ]);

    const pagination = getPaginationMetadata(parseInt(page), parseInt(limit), totalCount);

    res.json({
      success: true,
      data: invitations,
      pagination
    });
  } catch (error) {
    logger.error('Error listing invitations', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Get invitation by ID
 * GET /api/v1/invitations/:id
 */
exports.getInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invitation = await PlatformInvitation.findById(id)
      .populate('invitedBy', 'name email')
      .lean();

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    // Check access
    if (req.user.role !== 'admin' && invitation.invitedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this invitation'
      });
    }

    res.json(formatSuccess(invitation));
  } catch (error) {
    logger.error('Error fetching invitation', {
      error: error.message,
      id: req.params.id
    });
    next(error);
  }
};

/**
 * Resend invitation
 * PATCH /api/v1/invitations/:id/resend
 */
exports.resendInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invitation = await PlatformInvitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    // Check access
    if (req.user.role !== 'admin' && invitation.invitedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this invitation'
      });
    }

    // Resend (generates new token)
    await invitation.resend(req.user.id);

    // Resolve context for email
    const senderContext = invitation.senderContext || await contextService.resolveSenderContext(
      invitation.invitedBy,
      invitation.investmentContext
    );

    // Send email
    const emailResult = await emailService.sendInvitationEmail(invitation, senderContext);

    // Mark as sent
    await invitation.send('invitation_resent', emailResult.messageId);

    // Log audit
    await auditService.logInvitationResent(invitation, req.user);

    logger.info('Invitation resent successfully', {
      invitationId: invitation.invitationId,
      messageId: emailResult.messageId
    });

    res.json(formatSuccess(invitation, 'Invitation resent successfully'));
  } catch (error) {
    logger.error('Error resending invitation', {
      error: error.message,
      id: req.params.id
    });
    next(error);
  }
};

/**
 * Revoke invitation
 * PATCH /api/v1/invitations/:id/revoke
 */
exports.revokeInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invitation = await PlatformInvitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    // Check access
    if (req.user.role !== 'admin' && invitation.invitedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this invitation'
      });
    }

    // Revoke
    await invitation.revoke(req.user.id, reason);

    // Log audit
    await auditService.logInvitationRevoked(invitation, req.user, reason);

    logger.info('Invitation revoked', {
      invitationId: invitation.invitationId,
      reason
    });

    res.json(formatSuccess(invitation, 'Invitation revoked successfully'));
  } catch (error) {
    logger.error('Error revoking invitation', {
      error: error.message,
      id: req.params.id
    });
    next(error);
  }
};

/**
 * Get invitation statistics
 * GET /api/v1/invitations/stats
 */
exports.getInvitationStats = async (req, res, next) => {
  try {
    // Only admin can view stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await PlatformInvitation.getStats();

    res.json(formatSuccess(stats));
  } catch (error) {
    logger.error('Error fetching invitation stats', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Expire old invitations (cron job endpoint)
 * POST /api/v1/invitations/expire-old
 */
exports.expireOldInvitations = async (req, res, next) => {
  try {
    // Only admin or internal API key
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await PlatformInvitation.expireOldInvitations();

    logger.info('Old invitations expired', {
      count: result.modifiedCount
    });

    res.json(formatSuccess({
      expiredCount: result.modifiedCount
    }, 'Old invitations expired successfully'));
  } catch (error) {
    logger.error('Error expiring old invitations', {
      error: error.message
    });
    next(error);
  }
};
