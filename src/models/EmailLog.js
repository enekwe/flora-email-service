const mongoose = require('mongoose');

/**
 * EmailLog Model
 * Tracks all emails sent through the system for delivery monitoring and analytics
 * Provides email audit trail and delivery status tracking
 */
const EmailLogSchema = new mongoose.Schema({
  emailType: {
    type: String,
    required: true,
    enum: [
      'invitation',
      'invitation_reminder',
      'password_reset',
      'email_verification',
      'welcome',
      'two_factor_code',
      'capital_call',
      'distribution_notice',
      'capital_call_reminder',
      'document_upload',
      'signature_request',
      'signature_complete',
      'signature_reminder',
      'invitation_request_confirmation',
      'invitation_request_admin',
      'invitation_request_approved',
      'invitation_request_denied',
      'invitation_request_followup',
      'maintenance_notification',
      'announcement',
      'bulk_email',
      'other'
    ],
    index: true
  },

  recipient: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    index: true
  },

  recipientName: {
    type: String,
    trim: true
  },

  subject: {
    type: String,
    required: true,
    maxlength: 500
  },

  templateUsed: {
    type: String,
    trim: true
  },

  brevoMessageId: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },

  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'bounced', 'failed', 'pending'],
    default: 'sent',
    index: true
  },

  deliveryStatusUpdatedAt: {
    type: Date
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  retries: {
    type: Number,
    default: 0,
    min: 0
  },

  attachments: [{
    filename: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    url: {
      type: String
    }
  }],

  errorMessage: {
    type: String,
    maxlength: 2000
  },

  errorStack: {
    type: String
  },

  // Reference to related entities
  relatedInvitation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformInvitation'
  },

  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  relatedFund: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund'
  },

  relatedCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudioCompany'
  },

  // Sender information
  senderEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  senderName: {
    type: String,
    trim: true
  },

  // Email provider details
  provider: {
    type: String,
    default: 'brevo',
    enum: ['brevo', 'sendgrid', 'aws_ses', 'other']
  },

  // Rate limiting metadata
  rateLimitBucket: {
    type: String,
    index: true
  },

  // Cost tracking (if applicable)
  estimatedCost: {
    type: Number,
    min: 0
  }

}, {
  timestamps: true
});

// Indexes for performance and analytics
EmailLogSchema.index({ emailType: 1, sentAt: -1 });
EmailLogSchema.index({ recipient: 1, sentAt: -1 });
EmailLogSchema.index({ deliveryStatus: 1, sentAt: -1 });
EmailLogSchema.index({ brevoMessageId: 1 }, { sparse: true });
EmailLogSchema.index({ relatedInvitation: 1 }, { sparse: true });
EmailLogSchema.index({ relatedUser: 1 }, { sparse: true });
EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ emailType: 1, deliveryStatus: 1 });

// Instance method: Mark email as delivered
EmailLogSchema.methods.markDelivered = async function() {
  this.deliveryStatus = 'delivered';
  this.deliveryStatusUpdatedAt = new Date();
  await this.save();
  return this;
};

// Instance method: Mark email as bounced
EmailLogSchema.methods.markBounced = async function(errorMessage = null) {
  this.deliveryStatus = 'bounced';
  this.deliveryStatusUpdatedAt = new Date();
  if (errorMessage) {
    this.errorMessage = errorMessage;
  }
  await this.save();
  return this;
};

// Instance method: Mark email as failed
EmailLogSchema.methods.markFailed = async function(errorMessage = null, errorStack = null) {
  this.deliveryStatus = 'failed';
  this.deliveryStatusUpdatedAt = new Date();
  if (errorMessage) {
    this.errorMessage = errorMessage;
  }
  if (errorStack) {
    this.errorStack = errorStack;
  }
  await this.save();
  return this;
};

// Instance method: Increment retry count
EmailLogSchema.methods.incrementRetry = async function() {
  this.retries += 1;
  await this.save();
  return this;
};

// Static method: Get email statistics
EmailLogSchema.statics.getStats = async function(startDate = null, endDate = null) {
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.sentAt = {};
    if (startDate) matchStage.sentAt.$gte = new Date(startDate);
    if (endDate) matchStage.sentAt.$lte = new Date(endDate);
  }

  const [statusStats, typeStats, dailyStats] = await Promise.all([
    // Stats by delivery status
    this.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
    ]),

    // Stats by email type
    this.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: { _id: '$emailType', count: { $sum: 1 } } }
    ]),

    // Daily volume stats (last 30 days)
    this.aggregate([
      {
        $match: {
          sentAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$sentAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ])
  ]);

  return {
    byStatus: statusStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byType: typeStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    dailyVolume: dailyStats
  };
};

// Static method: Find emails by recipient
EmailLogSchema.statics.findByRecipient = function(email, limit = 50) {
  return this.find({ recipient: email.toLowerCase() })
    .sort({ sentAt: -1 })
    .limit(limit);
};

// Static method: Find failed emails for retry
EmailLogSchema.statics.findFailedForRetry = function(maxRetries = 3) {
  return this.find({
    deliveryStatus: 'failed',
    retries: { $lt: maxRetries }
  })
    .sort({ sentAt: 1 })
    .limit(100);
};

// Static method: Clean up old logs (retention policy)
EmailLogSchema.statics.cleanupOldLogs = async function(retentionDays = 90) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await this.deleteMany({
    sentAt: { $lt: cutoffDate },
    deliveryStatus: { $in: ['delivered', 'bounced'] }
  });

  return result;
};

module.exports = mongoose.model('EmailLog', EmailLogSchema);
