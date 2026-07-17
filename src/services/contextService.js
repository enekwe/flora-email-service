const axios = require('axios');
const logger = require('../config/logger');
const { SENDER_CONTEXT_TYPE, LP_ENTITY_TYPE } = require('../utils/constants');

/**
 * Context Resolution Service
 * Resolves sender context by fetching data from main Flora application
 * Implements caching to reduce API calls
 */

// In-memory cache (can be replaced with Redis in production)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ContextService {
  constructor() {
    this.mainAppApiUrl = process.env.MAIN_APP_API_URL;
    this.mainAppApiKey = process.env.MAIN_APP_API_KEY;

    if (!this.mainAppApiUrl || !this.mainAppApiKey) {
      logger.warn('Main app API configuration missing. Context resolution may fail.');
    }
  }

  /**
   * Main entry point: Resolve sender context
   */
  async resolveSenderContext(invitedBy, investmentContext) {
    try {
      logger.info('Resolving sender context', {
        invitedBy,
        investmentContext
      });

      // Fetch user details from main app
      const user = await this.fetchUser(invitedBy);

      if (!user) {
        throw new Error(`User not found: ${invitedBy}`);
      }

      // Determine context based on user role and investment context
      if (investmentContext?.fundId) {
        return await this.resolveGPContext(user, investmentContext.fundId);
      }

      if (investmentContext?.companyId) {
        return await this.resolveFounderContext(user, investmentContext.companyId);
      }

      // Check if user is an LP
      if (user.role === 'lp' || user.stakeholder) {
        return await this.resolveLPContext(user);
      }

      // Default to platform admin context
      return this.resolvePlatformContext(user);
    } catch (error) {
      logger.error('Error resolving sender context', {
        error: error.message,
        invitedBy,
        investmentContext
      });
      throw error;
    }
  }

  /**
   * Resolve GP (General Partner) context
   */
  async resolveGPContext(user, fundId) {
    try {
      const fund = await this.fetchFund(fundId);

      if (!fund) {
        throw new Error(`Fund not found: ${fundId}`);
      }

      return {
        contextName: fund.name || fund.fundName || 'Unknown Fund',
        contextType: SENDER_CONTEXT_TYPE.FUND,
        contextDescription: `${fund.name} - ${fund.vintage || 'N/A'}`,
        entityType: null
      };
    } catch (error) {
      logger.error('Error resolving GP context', {
        error: error.message,
        fundId
      });
      throw error;
    }
  }

  /**
   * Resolve LP (Limited Partner) context
   */
  async resolveLPContext(user) {
    try {
      // Fetch stakeholder data from main app
      const stakeholder = await this.fetchStakeholder(user._id || user.id);

      if (!stakeholder) {
        // Fallback: Use user name as LP context
        return {
          contextName: user.name || user.email,
          contextType: SENDER_CONTEXT_TYPE.LP_ENTITY,
          contextDescription: 'Individual Investor',
          entityType: LP_ENTITY_TYPE.PERSON
        };
      }

      // Determine if person or institution
      const isInstitution = stakeholder.entityType === 'institution' ||
                           stakeholder.investorType === 'institutional' ||
                           stakeholder.organizationName;

      if (isInstitution) {
        return {
          contextName: stakeholder.organizationName || stakeholder.name,
          contextType: SENDER_CONTEXT_TYPE.LP_ENTITY,
          contextDescription: `${stakeholder.organizationName || stakeholder.name} - Institutional Investor`,
          entityType: LP_ENTITY_TYPE.INSTITUTION
        };
      }

      // Person (individual LP)
      return {
        contextName: stakeholder.name || user.name,
        contextType: SENDER_CONTEXT_TYPE.LP_ENTITY,
        contextDescription: 'Individual Investor',
        entityType: LP_ENTITY_TYPE.PERSON
      };
    } catch (error) {
      logger.error('Error resolving LP context', {
        error: error.message,
        userId: user._id || user.id
      });

      // Fallback to user name
      return {
        contextName: user.name || user.email,
        contextType: SENDER_CONTEXT_TYPE.LP_ENTITY,
        contextDescription: 'Individual Investor',
        entityType: LP_ENTITY_TYPE.PERSON
      };
    }
  }

  /**
   * Resolve Founder/Company context
   */
  async resolveFounderContext(user, companyId) {
    try {
      const company = await this.fetchCompany(companyId);

      if (!company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      return {
        contextName: company.name || company.companyName || 'Unknown Company',
        contextType: SENDER_CONTEXT_TYPE.COMPANY,
        contextDescription: `${company.name} - ${company.industry || 'Portfolio Company'}`,
        entityType: null
      };
    } catch (error) {
      logger.error('Error resolving founder context', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }

  /**
   * Resolve Platform Admin context
   */
  resolvePlatformContext(user) {
    return {
      contextName: 'Passbook Flora',
      contextType: SENDER_CONTEXT_TYPE.PLATFORM,
      contextDescription: 'Platform Administrator',
      entityType: null
    };
  }

  /**
   * Fetch user from main app API
   */
  async fetchUser(userId) {
    const cacheKey = `user:${userId}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.mainAppApiUrl}/api/v1/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mainAppApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const user = response.data.data || response.data;
      this.setCache(cacheKey, user);

      return user;
    } catch (error) {
      logger.error('Error fetching user from main app', {
        error: error.message,
        userId
      });
      return null;
    }
  }

  /**
   * Fetch fund from main app API
   */
  async fetchFund(fundId) {
    const cacheKey = `fund:${fundId}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.mainAppApiUrl}/api/v1/funds/${fundId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mainAppApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const fund = response.data.data || response.data;
      this.setCache(cacheKey, fund);

      return fund;
    } catch (error) {
      logger.error('Error fetching fund from main app', {
        error: error.message,
        fundId
      });
      return null;
    }
  }

  /**
   * Fetch stakeholder from main app API
   */
  async fetchStakeholder(userId) {
    const cacheKey = `stakeholder:${userId}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.mainAppApiUrl}/api/v1/stakeholders/user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mainAppApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const stakeholder = response.data.data || response.data;
      this.setCache(cacheKey, stakeholder);

      return stakeholder;
    } catch (error) {
      logger.error('Error fetching stakeholder from main app', {
        error: error.message,
        userId
      });
      return null;
    }
  }

  /**
   * Fetch company from main app API
   */
  async fetchCompany(companyId) {
    const cacheKey = `company:${companyId}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.mainAppApiUrl}/api/v1/studio/companies/${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mainAppApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const company = response.data.data || response.data;
      this.setCache(cacheKey, company);

      return company;
    } catch (error) {
      logger.error('Error fetching company from main app', {
        error: error.message,
        companyId
      });
      return null;
    }
  }

  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiry) {
      logger.debug('Cache hit', { key });
      return cached.data;
    }

    if (cached) {
      cache.delete(key);
    }

    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    cache.set(key, {
      data,
      expiry: Date.now() + CACHE_TTL
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.clear();
    logger.info('Context cache cleared');
  }
}

module.exports = new ContextService();
