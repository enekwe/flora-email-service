const logger = require('../config/logger');
const { AUDIT_ACTIONS } = require('../utils/constants');

/**
 * Audit Service
 * Logs all invitation-related operations for compliance and auditing
 */

class AuditService {
  /**
   * Log invitation creation
   */
  async logInvitationCreated(invitation, createdBy) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_CREATED,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        role: invitation.role,
        invitationType: invitation.invitationType,
        createdBy: createdBy?._id || createdBy,
        senderContext: invitation.senderContext,
        timestamp: new Date(),
        metadata: {
          fundId: invitation.investmentContext?.fundId,
          companyId: invitation.investmentContext?.companyId,
          personalMessage: !!invitation.personalMessage
        }
      };

      logger.info('Audit: Invitation Created', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation creation', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log invitation sent
   */
  async logInvitationSent(invitation, emailResult) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_SENT,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        messageId: emailResult.messageId,
        timestamp: new Date(),
        metadata: {
          senderContext: invitation.senderContext.contextType,
          emailProvider: 'brevo'
        }
      };

      logger.info('Audit: Invitation Sent', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation sent', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log invitation resent
   */
  async logInvitationResent(invitation, resentBy) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_RESENT,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        resentBy: resentBy?._id || resentBy,
        timestamp: new Date(),
        metadata: {
          previousStatus: invitation.status,
          emailCount: invitation.emailsSent.length
        }
      };

      logger.info('Audit: Invitation Resent', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation resent', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log invitation accepted
   */
  async logInvitationAccepted(invitation, acceptedUser) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_ACCEPTED,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        acceptedUserId: acceptedUser._id || acceptedUser,
        timestamp: new Date(),
        metadata: {
          acceptedAt: invitation.acceptedAt,
          timeSinceCreation: Date.now() - invitation.createdAt.getTime(),
          role: invitation.role
        }
      };

      logger.info('Audit: Invitation Accepted', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation accepted', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log invitation revoked
   */
  async logInvitationRevoked(invitation, revokedBy, reason) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_REVOKED,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        revokedBy: revokedBy?._id || revokedBy,
        reason,
        timestamp: new Date(),
        metadata: {
          previousStatus: invitation.status,
          revokedAt: invitation.reviewedAt
        }
      };

      logger.warn('Audit: Invitation Revoked', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation revoked', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log invitation expired
   */
  async logInvitationExpired(invitation) {
    try {
      const logEntry = {
        action: AUDIT_ACTIONS.INVITATION_EXPIRED,
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        timestamp: new Date(),
        metadata: {
          expiredAt: invitation.tokenExpiresAt,
          timeSinceCreation: Date.now() - invitation.createdAt.getTime()
        }
      };

      logger.warn('Audit: Invitation Expired', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging invitation expired', {
        error: error.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log failed email delivery
   */
  async logEmailDeliveryFailed(invitation, error) {
    try {
      const logEntry = {
        action: 'email_delivery_failed',
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        error: error.message,
        timestamp: new Date(),
        metadata: {
          senderContext: invitation.senderContext.contextType
        }
      };

      logger.error('Audit: Email Delivery Failed', logEntry);

      return logEntry;
    } catch (err) {
      logger.error('Error logging email delivery failure', {
        error: err.message,
        invitationId: invitation.invitationId
      });
    }
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(userId, action, resource) {
    try {
      const logEntry = {
        action: 'unauthorized_access_attempt',
        userId,
        attemptedAction: action,
        resource,
        timestamp: new Date()
      };

      logger.warn('Audit: Unauthorized Access Attempt', logEntry);

      return logEntry;
    } catch (error) {
      logger.error('Error logging unauthorized access', {
        error: error.message
      });
    }
  }
}

module.exports = new AuditService();
