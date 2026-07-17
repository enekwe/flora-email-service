const express = require('express');
const router = express.Router();

// Controllers
const invitationController = require('../../controllers/invitationController');

// Middleware
const { authMiddleware } = require('../../middleware/auth');
const { requirePermissions, requireRole } = require('../../middleware/rbac');
const {
  validateCreateInvitation,
  validateListInvitations,
  validateInvitationId,
  validateResendInvitation,
  validateRevokeInvitation
} = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * Invitations API Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/invitations/create
 * @desc    Create new invitation
 * @access  Private (GP, Admin)
 */
router.post(
  '/create',
  authMiddleware,
  requirePermissions(['create:invitation']),
  validateCreateInvitation,
  asyncHandler(invitationController.createInvitation)
);

/**
 * @route   GET /api/v1/invitations
 * @desc    List invitations (paginated, filtered)
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  validateListInvitations,
  asyncHandler(invitationController.listInvitations)
);

/**
 * @route   GET /api/v1/invitations/stats
 * @desc    Get invitation statistics
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole('admin'),
  asyncHandler(invitationController.getInvitationStats)
);

/**
 * @route   GET /api/v1/invitations/:id
 * @desc    Get invitation details
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  validateInvitationId,
  asyncHandler(invitationController.getInvitation)
);

/**
 * @route   PATCH /api/v1/invitations/:id/resend
 * @desc    Resend invitation email
 * @access  Private
 */
router.patch(
  '/:id/resend',
  authMiddleware,
  requirePermissions(['resend:invitation']),
  validateResendInvitation,
  asyncHandler(invitationController.resendInvitation)
);

/**
 * @route   PATCH /api/v1/invitations/:id/revoke
 * @desc    Revoke invitation
 * @access  Private
 */
router.patch(
  '/:id/revoke',
  authMiddleware,
  requirePermissions(['revoke:invitation']),
  validateRevokeInvitation,
  asyncHandler(invitationController.revokeInvitation)
);

/**
 * @route   POST /api/v1/invitations/expire-old
 * @desc    Expire old invitations (cron job)
 * @access  Private (Admin only)
 */
router.post(
  '/expire-old',
  authMiddleware,
  requireRole('admin'),
  asyncHandler(invitationController.expireOldInvitations)
);

module.exports = router;
