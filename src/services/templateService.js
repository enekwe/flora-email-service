const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const logger = require('../config/logger');
const { EMAIL_TEMPLATES, SENDER_CONTEXT_TYPE, LP_ENTITY_TYPE } = require('../utils/constants');

/**
 * Template Service
 * Handles email template selection and rendering using Handlebars
 */

class TemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.compiledTemplates = new Map();
  }

  /**
   * Select appropriate template based on invitation context
   */
  selectTemplate(invitation) {
    const { senderContext, lpEntityInfo } = invitation;

    // Platform admin invitation
    if (senderContext.contextType === SENDER_CONTEXT_TYPE.PLATFORM) {
      return EMAIL_TEMPLATES.ADMIN_INVITATION;
    }

    // GP (General Partner) invitation
    if (senderContext.contextType === SENDER_CONTEXT_TYPE.FUND) {
      return EMAIL_TEMPLATES.GP_INVITATION;
    }

    // Founder/Company invitation
    if (senderContext.contextType === SENDER_CONTEXT_TYPE.COMPANY) {
      return EMAIL_TEMPLATES.FOUNDER_INVITATION;
    }

    // LP (Limited Partner) invitation
    if (senderContext.contextType === SENDER_CONTEXT_TYPE.LP_ENTITY) {
      if (senderContext.entityType === LP_ENTITY_TYPE.INSTITUTION) {
        return EMAIL_TEMPLATES.LP_INSTITUTION_INVITATION;
      }
      return EMAIL_TEMPLATES.LP_PERSON_INVITATION;
    }

    // Default fallback
    logger.warn('No matching template found, using admin invitation template', {
      contextType: senderContext.contextType
    });
    return EMAIL_TEMPLATES.ADMIN_INVITATION;
  }

  /**
   * Render template with variables
   */
  async renderTemplate(templateName, variables) {
    try {
      logger.debug('Rendering template', { templateName, variables });

      // Get compiled template
      const template = await this.getCompiledTemplate(templateName);

      // Merge default variables
      const mergedVariables = this.getMergedVariables(variables);

      // Render
      const html = template(mergedVariables);

      return html;
    } catch (error) {
      logger.error('Error rendering template', {
        templateName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get compiled template (with caching)
   */
  async getCompiledTemplate(templateName) {
    // Check cache
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName);
    }

    // Load and compile
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    const templateContent = await this.loadTemplate(templatePath);
    const compiled = Handlebars.compile(templateContent);

    // Cache
    this.compiledTemplates.set(templateName, compiled);

    return compiled;
  }

  /**
   * Load template from filesystem
   */
  async loadTemplate(templatePath) {
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('Error loading template', {
        templatePath,
        error: error.message
      });
      throw new Error(`Failed to load template: ${templatePath}`);
    }
  }

  /**
   * Merge default variables with provided variables
   */
  getMergedVariables(variables) {
    const defaults = {
      frontendUrl: process.env.FRONTEND_URL || 'https://flora.passbook.vc',
      currentYear: new Date().getFullYear(),
      platformName: 'Passbook Flora',
      supportEmail: 'support@passbook.vc'
    };

    return { ...defaults, ...variables };
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    this.compiledTemplates.clear();
    logger.info('Template cache cleared');
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // URL encode helper
    Handlebars.registerHelper('urlEncode', (str) => {
      if (!str) return '';
      return encodeURIComponent(str);
    });

    logger.info('Handlebars helpers registered');
  }
}

// Initialize and register helpers
const templateService = new TemplateService();
templateService.registerHelpers();

module.exports = templateService;
