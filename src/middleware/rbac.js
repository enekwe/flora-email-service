const logger = require('../config/logger');
const auditService = require('../services/auditService');

/**
 * RBAC (Role-Based Access Control) Middleware
 * Enforces permission checks for invitation operations
 */

/**
 * Check if user has required permissions
 */
const hasPermission = (userPermissions, requiredPermissions) => {
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check if user has all required permissions
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

/**
 * Require specific permissions
 */
const requirePermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];

      // Check admin role
      if (req.user.role === 'admin') {
        return next();
      }

      // Check permissions
      if (!hasPermission(userPermissions, permissions)) {
        await auditService.logUnauthorizedAccess(
          req.user.id,
          permissions,
          req.originalUrl
        );

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: permissions
        });
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error', {
        error: error.message,
        userId: req.user?.id
      });

      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

/**
 * Require specific role
 */
const requireRole = (roles) => {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role privileges',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user can access invitation
 * Users can only access invitations they created or that belong to their fund/company
 */
const canAccessInvitation = async (req, res, next) => {
  try {
    const invitation = req.invitation; // Set by previous middleware

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    // Admin can access all
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user created this invitation
    if (invitation.invitedBy.toString() === req.user.id) {
      return next();
    }

    // Check if user has access to the fund/company
    // This would require additional user data - simplified for now
    // In production, you'd fetch user's funds/companies and verify access

    logger.warn('Access denied to invitation', {
      userId: req.user.id,
      invitationId: invitation.invitationId
    });

    await auditService.logUnauthorizedAccess(
      req.user.id,
      'access_invitation',
      invitation.invitationId
    );

    return res.status(403).json({
      success: false,
      error: 'You do not have access to this invitation'
    });
  } catch (error) {
    logger.error('Error in canAccessInvitation middleware', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Access check failed'
    });
  }
};

module.exports = {
  requirePermissions,
  requireRole,
  canAccessInvitation,
  hasPermission
};
