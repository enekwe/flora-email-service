const { body, param, query, validationResult } = require('express-validator');
const { isValidEmail } = require('../utils/helpers');

/**
 * Validation Middleware
 * Input validation using express-validator
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

/**
 * Validation rules for creating invitation
 */
const validateCreateInvitation = [
  body('inviteeName')
    .trim()
    .notEmpty().withMessage('Invitee name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('inviteeEmail')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['gp', 'lp', 'admin', 'analyst', 'compliance', 'viewer', 'portfolio_company', 'fund_accountant', 'fund_attorney', 'operating_partner'])
    .withMessage('Invalid role'),

  body('invitationType')
    .notEmpty().withMessage('Invitation type is required')
    .isIn(['platform', 'fund_associated', 'company_associated'])
    .withMessage('Invalid invitation type'),

  body('investmentContext.fundId')
    .optional()
    .isMongoId().withMessage('Invalid fund ID'),

  body('investmentContext.companyId')
    .optional()
    .isMongoId().withMessage('Invalid company ID'),

  body('personalMessage')
    .optional()
    .isLength({ max: 500 }).withMessage('Personal message must not exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation rules for listing invitations
 */
const validateListInvitations = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['pending', 'sent', 'accepted', 'expired', 'revoked'])
    .withMessage('Invalid status'),

  query('role')
    .optional()
    .isIn(['gp', 'lp', 'admin', 'analyst', 'compliance', 'viewer', 'portfolio_company', 'fund_accountant', 'fund_attorney', 'operating_partner'])
    .withMessage('Invalid role'),

  handleValidationErrors
];

/**
 * Validation rules for invitation ID parameter
 */
const validateInvitationId = [
  param('id')
    .notEmpty().withMessage('Invitation ID is required')
    .isMongoId().withMessage('Invalid invitation ID'),

  handleValidationErrors
];

/**
 * Validation rules for resend invitation
 */
const validateResendInvitation = [
  param('id')
    .notEmpty().withMessage('Invitation ID is required')
    .isMongoId().withMessage('Invalid invitation ID'),

  handleValidationErrors
];

/**
 * Validation rules for revoke invitation
 */
const validateRevokeInvitation = [
  param('id')
    .notEmpty().withMessage('Invitation ID is required')
    .isMongoId().withMessage('Invalid invitation ID'),

  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation rules for accept invitation (by token)
 */
const validateAcceptInvitation = [
  body('token')
    .notEmpty().withMessage('Token is required')
    .isLength({ min: 32, max: 128 }).withMessage('Invalid token format'),

  body('userData.email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('userData.name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  handleValidationErrors
];

module.exports = {
  validateCreateInvitation,
  validateListInvitations,
  validateInvitationId,
  validateResendInvitation,
  validateRevokeInvitation,
  validateAcceptInvitation,
  handleValidationErrors
};
