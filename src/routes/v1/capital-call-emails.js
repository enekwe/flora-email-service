const express = require('express');
const router = express.Router();
const capitalCallEmailController = require('../../controllers/capitalCallEmailController');
const { authenticate } = require('../../middleware/auth');
const { validateEmailRequest } = require('../../middleware/validation');

/**
 * Capital Call Email Routes
 * Handles capital call and distribution notice emails to LPs
 */

/**
 * @route   POST /api/v1/emails/capital-calls/notification
 * @desc    Send initial capital call notification to LP(s)
 * @access  Private (GP/Admin only)
 */
router.post('/notification', authenticate, validateEmailRequest, capitalCallEmailController.sendCapitalCallNotification);

/**
 * @route   POST /api/v1/emails/capital-calls/reminder
 * @desc    Send capital call payment reminder
 * @access  Private (GP/Admin only)
 */
router.post('/reminder', authenticate, validateEmailRequest, capitalCallEmailController.sendCapitalCallReminder);

/**
 * @route   POST /api/v1/emails/capital-calls/payment-confirmation
 * @desc    Send payment confirmation to LP(s)
 * @access  Private (GP/Admin only)
 */
router.post('/payment-confirmation', authenticate, validateEmailRequest, capitalCallEmailController.sendPaymentConfirmation);

/**
 * @route   POST /api/v1/emails/capital-calls/payment-overdue
 * @desc    Send payment overdue notice to LP(s)
 * @access  Private (GP/Admin only)
 */
router.post('/payment-overdue', authenticate, validateEmailRequest, capitalCallEmailController.sendPaymentOverdueNotice);

/**
 * @route   POST /api/v1/emails/capital-calls/distribution
 * @desc    Send distribution notice to LP(s)
 * @access  Private (GP/Admin only)
 */
router.post('/distribution', authenticate, validateEmailRequest, capitalCallEmailController.sendDistributionNotice);

/**
 * @route   POST /api/v1/emails/capital-calls/bulk
 * @desc    Send capital call to multiple LPs
 * @access  Private (GP/Admin only)
 */
router.post('/bulk', authenticate, validateEmailRequest, capitalCallEmailController.sendBulkCapitalCalls);

module.exports = router;
