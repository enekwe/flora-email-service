const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * PlatformInvitation Model (Enhanced for Microservice)
 * Manages invitations with sender context resolution:
 * - Tracks sender's context (GP fund, LP entity, Company, or Platform admin)
 * - Includes LP entity tracking (person vs institution)
 * - GDPR-compliant consent tracking
 * - Crypto-secure tokens
 * - Email delivery tracking
 */
const PlatformInvitationSchema = new mongoose.Schema({
  invitationId: {
    type: String,
    unique: true,
    required: true
  },

  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Sender Context Metadata (NEW)
  senderContext: {
    contextName: {
      type: String,
      trim: true
      // Examples: "Passbook Ventures I", "Smith Family Office", "Acme Inc"
    },
    contextType: {
      type: String,
      enum: ['fund', 'lp_entity', 'company', 'platform'],
      required: true
      // 'fund' = GP sending from their fund
      // 'lp_entity' = LP sending (person or institution)
      // 'company' = Founder sending from their company
      // 'platform' = Admin sending platform-wide
    },
    contextDescription: {
      type: String,
      trim: true
      // Additional context info for email personalization
    },
    entityType: {
      type: String,
      enum: ['person', 'institution', null],
      default: null
      // For LP entities: distinguishes between individual and institution
    }
  },

  // LP Entity Information (NEW)
  lpEntityInfo: {
    entityType: {
      type: String,
      enum: ['person', 'institution', null],
      default: null
    },
    entityName: {
      type: String,
      trim: true
      // For institutions: "Smith Family Office", "ABC Capital"
    },
    personalName: {
      type: String,
      trim: true
      // For persons: "Jane Smith"
    }
  },

  inviteeName: {
    type: String,
    required: true,
    trim: true
  },

  inviteeEmail: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },

  role: {
    type: String,
    required: true,
    enum: [
      'gp', 'lp', 'admin', 'analyst', 'compliance', 'viewer',
      'portfolio_company', 'fund_accountant', 'fund_attorney', 'operating_partner'
    ]
  },

  invitationType: {
    type: String,
    required: true,
    enum: ['platform', 'fund_associated', 'company_associated'],
    default: 'platform'
  },

  investmentContext: {
    fundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fund'
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudioCompany'
    },
    investmentRole: {
      type: String,
      enum: [
        'gp_partner', 'lp_investor', 'portfolio_founder',
        'portfolio_team_member', 'individual_investor'
      ]
    }
  },

  context: {
    type: String,
    enum: ['portfolio_company', 'lp_investor', 'gp_partner', 'advisor', 'service_provider', 'other'],
    default: 'other'
  },

  personalMessage: {
    type: String,
    maxlength: 500
  },

  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'accepted', 'expired', 'revoked'],
    default: 'pending'
  },

  token: {
    type: String,
    unique: true,
    required: true
  },

  tokenExpiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },

  consents: [{
    consentType: {
      type: String,
      required: true
    },
    consentGiven: {
      type: Boolean,
      required: true
    },
    consentDate: {
      type: Date,
      default: Date.now
    },
    consentLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConsentLog'
    }
  }],

  metadata: {
    ip: String,
    userAgent: String,
    deviceInfo: String,
    source: {
      type: String,
      default: 'admin_created'
    }
  },

  auditLogs: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],

  emailsSent: [{
    emailType: String,
    sentAt: Date,
    messageId: String,
    provider: {
      type: String,
      default: 'brevo'
    }
  }],

  acceptedAt: Date,

  acceptedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: Date,

  reviewReason: String
}, {
  timestamps: true
});

// Indexes for performance
PlatformInvitationSchema.index({ invitationId: 1 }, { unique: true });
PlatformInvitationSchema.index({ token: 1 }, { unique: true });
PlatformInvitationSchema.index({ inviteeEmail: 1 });
PlatformInvitationSchema.index({ status: 1 });
PlatformInvitationSchema.index({ invitedBy: 1 });
PlatformInvitationSchema.index({ 'investmentContext.fundId': 1 });
PlatformInvitationSchema.index({ 'investmentContext.companyId': 1 });
PlatformInvitationSchema.index({ invitationType: 1 });
PlatformInvitationSchema.index({ 'senderContext.contextType': 1 });
PlatformInvitationSchema.index({ inviteeEmail: 1, status: 1 });
PlatformInvitationSchema.index({ createdAt: -1 });

// Instance method: send — mark invitation as sent and record email dispatch
PlatformInvitationSchema.methods.send = async function(emailType, messageId, provider = 'brevo') {
  if (this.status !== 'pending') {
    throw new Error(`Cannot send invitation with status: ${this.status}`);
  }

  this.status = 'sent';
  this.emailsSent.push({
    emailType: emailType || 'invitation_sent',
    sentAt: new Date(),
    messageId: messageId || null,
    provider
  });

  this.auditLogs.push({
    action: 'invitation_sent',
    performedBy: this.invitedBy,
    timestamp: new Date(),
    details: { emailType, messageId, provider }
  });

  await this.save();
  return this;
};

// Instance method: accept — mark invitation as accepted, link to created user
PlatformInvitationSchema.methods.accept = async function(userData) {
  if (this.status !== 'sent' && this.status !== 'pending') {
    throw new Error(`Cannot accept invitation with status: ${this.status}`);
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.acceptedUserId = userData.userId;

  this.auditLogs.push({
    action: 'invitation_accepted',
    performedBy: userData.userId,
    timestamp: new Date(),
    details: {
      acceptedEmail: userData.email || this.inviteeEmail,
      acceptedName: userData.name || this.inviteeName
    }
  });

  await this.save();
  return this;
};

// Instance method: revoke — mark invitation as revoked with audit trail
PlatformInvitationSchema.methods.revoke = async function(revokedBy, reason) {
  if (this.status !== 'pending' && this.status !== 'sent') {
    throw new Error(`Cannot revoke invitation with status: ${this.status}`);
  }

  this.status = 'revoked';
  this.reviewedBy = revokedBy;
  this.reviewedAt = new Date();
  this.reviewReason = reason || 'No reason provided';

  this.auditLogs.push({
    action: 'invitation_revoked',
    performedBy: revokedBy,
    timestamp: new Date(),
    details: { reason }
  });

  await this.save();
  return this;
};

// Instance method: expire — mark invitation as expired
PlatformInvitationSchema.methods.expire = async function() {
  if (this.status !== 'pending' && this.status !== 'sent') {
    throw new Error(`Cannot expire invitation with status: ${this.status}`);
  }

  this.status = 'expired';

  this.auditLogs.push({
    action: 'invitation_expired',
    performedBy: null,
    timestamp: new Date(),
    details: { expiredAt: new Date(), originalExpiry: this.tokenExpiresAt }
  });

  await this.save();
  return this;
};

// Instance method: resend — generate new token, reset expiry, set status to pending
PlatformInvitationSchema.methods.resend = async function(resentBy) {
  if (this.status !== 'sent' && this.status !== 'expired') {
    throw new Error(`Cannot resend invitation with status: ${this.status}. Can only resend sent or expired invitations.`);
  }

  this.token = crypto.randomBytes(32).toString('hex');
  this.tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  this.status = 'pending';

  this.auditLogs.push({
    action: 'invitation_resend',
    performedBy: resentBy,
    timestamp: new Date(),
    details: { newTokenGenerated: true }
  });

  await this.save();
  return this;
};

// Static method: findPending — returns all pending invitations
PlatformInvitationSchema.statics.findPending = function(limit = 50, offset = 0) {
  return this.find({ status: { $in: ['pending', 'sent'] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method: findBySender — returns all invitations created by a specific sender
PlatformInvitationSchema.statics.findBySender = function(senderId) {
  return this.find({ invitedBy: senderId })
    .sort({ createdAt: -1 });
};

// Static method: findByInvestment — returns invitations tied to a specific investment
PlatformInvitationSchema.statics.findByInvestment = function(fundId, companyId) {
  const filter = {};
  if (fundId) {
    filter['investmentContext.fundId'] = fundId;
    filter.invitationType = 'fund_associated';
  }
  if (companyId) {
    filter['investmentContext.companyId'] = companyId;
    filter.invitationType = 'company_associated';
  }
  return this.find(filter)
    .sort({ createdAt: -1 });
};

// Static method: findByEmail — find invitation for a specific email
PlatformInvitationSchema.statics.findByEmail = function(email) {
  return this.find({ inviteeEmail: email.toLowerCase() })
    .sort({ createdAt: -1 });
};

// Static method: getStats — returns stats by status, role, and invitationType
PlatformInvitationSchema.statics.getStats = async function() {
  const statusStats = await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const roleStats = await this.aggregate([
    { $group: { _id: { role: '$role', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const typeStats = await this.aggregate([
    { $group: { _id: { invitationType: '$invitationType', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const contextStats = await this.aggregate([
    { $group: { _id: { contextType: '$senderContext.contextType', status: '$status' }, count: { $sum: 1 } } }
  ]);

  return {
    byStatus: statusStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byRole: roleStats,
    byInvitationType: typeStats,
    bySenderContext: contextStats
  };
};

// Static method: expireOldInvitations — expires invitations past tokenExpiresAt
PlatformInvitationSchema.statics.expireOldInvitations = async function() {
  const result = await this.updateMany(
    {
      status: { $in: ['pending', 'sent'] },
      tokenExpiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );

  return result;
};

// Pre-save: generate invitationId and token if not set
PlatformInvitationSchema.pre('save', function(next) {
  if (this.isNew && !this.invitationId) {
    this.invitationId = crypto.randomUUID();
  }

  if (this.isNew && !this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }

  next();
});

// Pre-save validation: investment context must match invitationType
PlatformInvitationSchema.pre('save', function(next) {
  if (this.invitationType === 'fund_associated' && !this.investmentContext.fundId) {
    return next(new Error('fund_associated invitations require investmentContext.fundId'));
  }

  if (this.invitationType === 'company_associated' && !this.investmentContext.companyId) {
    return next(new Error('company_associated invitations require investmentContext.companyId'));
  }

  if (this.invitationType === 'platform') {
    if (this.investmentContext && (this.investmentContext.fundId || this.investmentContext.companyId)) {
      return next(new Error('platform invitations must not have investment context (fundId or companyId)'));
    }
  }

  next();
});

module.exports = mongoose.model('PlatformInvitation', PlatformInvitationSchema);
