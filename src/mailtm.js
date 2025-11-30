const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

class MailTMClient {
  constructor() {
    this.baseUrl = config.mailtm.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.mailtm.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.rateLimitQueue = [];
    this.rateLimitTimer = null;
  }

  async rateLimit(fn) {
    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  processQueue() {
    if (this.rateLimitTimer) return;
    
    this.rateLimitTimer = setInterval(() => {
      const batch = this.rateLimitQueue.splice(0, config.rateLimit.requests);
      
      batch.forEach(async ({ fn, resolve, reject }) => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (this.rateLimitQueue.length === 0) {
        clearInterval(this.rateLimitTimer);
        this.rateLimitTimer = null;
      }
    }, config.rateLimit.window);
  }

  async getDomains() {
    try {
      const response = await this.rateLimit(() => 
        this.client.get('/domains')
      );
      
      const domains = response.data['hydra:member'];
      const activeDomains = domains.filter(d => d.isActive && !d.isPrivate);
      
      logger.info(`Fetched ${activeDomains.length} active domains`);
      return activeDomains;
    } catch (error) {
      logger.error('Error fetching domains:', error.message);
      throw error;
    }
  }

  async getRandomDomain() {
    const domains = await this.getDomains();
    if (domains.length === 0) {
      throw new Error('No active domains available');
    }
    return domains[Math.floor(Math.random() * domains.length)];
  }

  generateRandomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createAccount(username = null, password = null) {
    try {
      const domain = await this.getRandomDomain();
      const finalUsername = username || this.generateRandomString(8);
      const finalPassword = password || this.generateRandomString(12);
      const address = `${finalUsername}@${domain.domain}`;

      const response = await this.rateLimit(() =>
        this.client.post('/accounts', {
          address,
          password: finalPassword
        })
      );

      logger.info(`Account created: ${address}`);
      
      return {
        id: response.data.id,
        address: response.data.address,
        password: finalPassword
      };
    } catch (error) {
      logger.error('Error creating account:', error.response?.data || error.message);
      throw error;
    }
  }

  async getToken(address, password) {
    try {
      const response = await this.rateLimit(() =>
        this.client.post('/token', { address, password })
      );

      logger.info(`Token obtained for: ${address}`);
      return response.data.token;
    } catch (error) {
      logger.error('Error getting token:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAccount(token) {
    try {
      const response = await this.rateLimit(() =>
        this.client.get('/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting account:', error.message);
      throw error;
    }
  }

  async getMessages(token, page = 1) {
    try {
      const response = await this.rateLimit(() =>
        this.client.get('/messages', {
          params: { page },
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      return {
        messages: response.data['hydra:member'],
        totalItems: response.data['hydra:totalItems']
      };
    } catch (error) {
      logger.error('Error fetching messages:', error.message);
      throw error;
    }
  }

  async getMessage(token, messageId) {
    try {
      const response = await this.rateLimit(() =>
        this.client.get(`/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching message:', error.message);
      throw error;
    }
  }

  async deleteMessage(token, messageId) {
    try {
      await this.rateLimit(() =>
        this.client.delete(`/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      logger.info(`Message deleted: ${messageId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting message:', error.message);
      throw error;
    }
  }

  async markAsRead(token, messageId) {
    try {
      await this.rateLimit(() =>
        this.client.patch(`/messages/${messageId}`, 
          { seen: true },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      logger.info(`Message marked as read: ${messageId}`);
      return true;
    } catch (error) {
      logger.error('Error marking message as read:', error.message);
      throw error;
    }
  }

  async deleteAccount(token, accountId) {
    try {
      await this.rateLimit(() =>
        this.client.delete(`/accounts/${accountId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      logger.info(`Account deleted: ${accountId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting account:', error.message);
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      await this.getAccount(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(address, password) {
    try {
      return await this.getToken(address, password);
    } catch (error) {
      logger.error('Error refreshing token:', error.message);
      throw error;
    }
  }
}

module.exports = new MailTMClient();
