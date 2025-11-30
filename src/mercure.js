const EventSource = require('eventsource');
const config = require('./config');
const logger = require('./logger');

class MercureListener {
  constructor() {
    this.listeners = new Map();
    this.mercureUrl = config.mailtm.mercureUrl;
  }

  subscribe(accountId, token, callback) {
    if (this.listeners.has(accountId)) {
      logger.warn(`Listener already exists for account: ${accountId}`);
      return;
    }

    try {
      const topic = `/accounts/${accountId}`;
      const url = new URL(this.mercureUrl);
      url.searchParams.append('topic', topic);

      const eventSource = new EventSource(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info(`Mercure event received for account: ${accountId}`);
          callback(data);
        } catch (error) {
          logger.error('Error parsing Mercure event:', error);
        }
      };

      eventSource.onerror = (error) => {
        logger.error(`Mercure connection error for ${accountId}:`, error);
        this.reconnect(accountId, token, callback);
      };

      eventSource.onopen = () => {
        logger.info(`Mercure listener connected for account: ${accountId}`);
      };

      this.listeners.set(accountId, {
        eventSource,
        token,
        callback,
        reconnectAttempts: 0
      });

    } catch (error) {
      logger.error(`Error subscribing to Mercure for ${accountId}:`, error);
    }
  }

  reconnect(accountId, token, callback) {
    const listener = this.listeners.get(accountId);
    if (!listener) return;

    listener.reconnectAttempts++;
    
    if (listener.reconnectAttempts > config.mailtm.maxRetries) {
      logger.error(`Max reconnection attempts reached for ${accountId}`);
      this.unsubscribe(accountId);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, listener.reconnectAttempts), 30000);
    logger.info(`Reconnecting to Mercure for ${accountId} in ${delay}ms (attempt ${listener.reconnectAttempts})`);

    setTimeout(() => {
      this.unsubscribe(accountId);
      this.subscribe(accountId, token, callback);
    }, delay);
  }

  unsubscribe(accountId) {
    const listener = this.listeners.get(accountId);
    if (listener) {
      try {
        listener.eventSource.close();
        this.listeners.delete(accountId);
        logger.info(`Mercure listener closed for account: ${accountId}`);
      } catch (error) {
        logger.error(`Error closing Mercure listener for ${accountId}:`, error);
      }
    }
  }

  unsubscribeAll() {
    logger.info('Closing all Mercure listeners');
    for (const accountId of this.listeners.keys()) {
      this.unsubscribe(accountId);
    }
  }

  isSubscribed(accountId) {
    return this.listeners.has(accountId);
  }

  getActiveListeners() {
    return Array.from(this.listeners.keys());
  }
}

module.exports = new MercureListener();
