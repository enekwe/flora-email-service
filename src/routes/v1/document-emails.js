const express = require('express');
const router = express.Router();
const documentEmailController = require('../../controllers/documentEmailController');
const { authenticate } = require('../../middleware/auth');
const { validateEmailRequest } = require('../../middleware/validation');

/**
 * Document Email Routes
 * Handles document notifications, review requests, signature requests, and document sharing
 */

/**
 * @route   POST /api/v1/emails/documents/notification
 * @desc    Send document upload notification
 * @access  Private
 */
router.post('/notification', authenticate, validateEmailRequest, documentEmailController.sendDocumentNotification);

/**
 * @route   POST /api/v1/emails/documents/review-request
 * @desc    Send document review request
 * @access  Private
 */
router.post('/review-request', authenticate, validateEmailRequest, documentEmailController.sendDocumentReviewRequest);

/**
 * @route   POST /api/v1/emails/documents/signature-request
 * @desc    Send document signature request with tracking
 * @access  Private
 */
router.post('/signature-request', authenticate, validateEmailRequest, documentEmailController.sendSignatureRequest);

/**
 * @route   POST /api/v1/emails/documents/shared
 * @desc    Send document shared notification
 * @access  Private
 */
router.post('/shared', authenticate, validateEmailRequest, documentEmailController.sendDocumentShared);

module.exports = router;
