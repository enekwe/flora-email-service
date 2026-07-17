const express = require('express');
const router = express.Router();
const authEmailController = require('../../controllers/authEmailController');
const { authenticate } = require('../../middleware/auth');
const { validateEmailRequest } = require('../../middleware/validation');

/**
 * Authentication Email Routes
 * Handles password reset, email verification, and welcome emails
 */

/**
 * @route   POST /api/v1/emails/auth/password-reset
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/password-reset', validateEmailRequest, authEmailController.sendPasswordResetEmail);

/**
 * @route   POST /api/v1/emails/auth/email-verification
 * @desc    Send email verification link
 * @access  Public
 */
router.post('/email-verification', validateEmailRequest, authEmailController.sendEmailVerification);

/**
 * @route   POST /api/v1/emails/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', validateEmailRequest, authEmailController.resendEmailVerification);

/**
 * @route   POST /api/v1/emails/auth/welcome
 * @desc    Send welcome email to new user
 * @access  Private (Internal API)
 */
router.post('/welcome', authenticate, validateEmailRequest, authEmailController.sendWelcomeEmail);

/**
 * @route   POST /api/v1/emails/auth/two-factor-code
 * @desc    Send two-factor authentication code
 * @access  Public
 */
router.post('/two-factor-code', validateEmailRequest, authEmailController.sendTwoFactorCode);

module.exports = router;
