/**
 * Email Configuration
 * Brevo (formerly Sendinblue) configuration
 */

module.exports = {
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'flora@passbook.vc',
    senderName: process.env.BREVO_SENDER_NAME || 'Passbook Flora',
    apiUrl: 'https://api.brevo.com/v3'
  },

  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  },

  templates: {
    // Template names for different sender contexts
    gpInvitation: 'gp-invitation',
    lpInvitation: 'lp-invitation',
    founderInvitation: 'founder-invitation',
    adminInvitation: 'admin-invitation',
    lpPersonInvitation: 'lp-person-invitation',
    lpInstitutionInvitation: 'lp-institution-invitation'
  }
};
