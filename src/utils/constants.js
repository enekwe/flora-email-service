/**
 * Application Constants
 */

const INVITATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

const INVITATION_TYPE = {
  PLATFORM: 'platform',
  FUND_ASSOCIATED: 'fund_associated',
  COMPANY_ASSOCIATED: 'company_associated'
};

const SENDER_CONTEXT_TYPE = {
  FUND: 'fund',
  LP_ENTITY: 'lp_entity',
  COMPANY: 'company',
  PLATFORM: 'platform'
};

const LP_ENTITY_TYPE = {
  PERSON: 'person',
  INSTITUTION: 'institution'
};

const ROLES = {
  GP: 'gp',
  LP: 'lp',
  ADMIN: 'admin',
  ANALYST: 'analyst',
  COMPLIANCE: 'compliance',
  VIEWER: 'viewer',
  PORTFOLIO_COMPANY: 'portfolio_company',
  FUND_ACCOUNTANT: 'fund_accountant',
  FUND_ATTORNEY: 'fund_attorney',
  OPERATING_PARTNER: 'operating_partner'
};

const PERMISSIONS = {
  CREATE_INVITATION: 'create:invitation',
  READ_INVITATION: 'read:invitation',
  UPDATE_INVITATION: 'update:invitation',
  DELETE_INVITATION: 'delete:invitation',
  RESEND_INVITATION: 'resend:invitation',
  REVOKE_INVITATION: 'revoke:invitation',
  VIEW_ALL_INVITATIONS: 'view:all-invitations'
};

const CACHE_TTL = {
  CONTEXT: 300, // 5 minutes
  USER: 600, // 10 minutes
  FUND: 600, // 10 minutes
  COMPANY: 600 // 10 minutes
};

const EMAIL_TEMPLATES = {
  GP_INVITATION: 'gp-invitation',
  LP_PERSON_INVITATION: 'lp-person-invitation',
  LP_INSTITUTION_INVITATION: 'lp-institution-invitation',
  FOUNDER_INVITATION: 'founder-invitation',
  ADMIN_INVITATION: 'admin-invitation'
};

const AUDIT_ACTIONS = {
  INVITATION_CREATED: 'invitation_created',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_RESENT: 'invitation_resent',
  INVITATION_ACCEPTED: 'invitation_accepted',
  INVITATION_REVOKED: 'invitation_revoked',
  INVITATION_EXPIRED: 'invitation_expired'
};

module.exports = {
  INVITATION_STATUS,
  INVITATION_TYPE,
  SENDER_CONTEXT_TYPE,
  LP_ENTITY_TYPE,
  ROLES,
  PERMISSIONS,
  CACHE_TTL,
  EMAIL_TEMPLATES,
  AUDIT_ACTIONS
};
