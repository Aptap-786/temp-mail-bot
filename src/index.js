const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const logger = require('./logger');
const db = require('./database');
const mailtm = require('./mailtm');
const mercure = require('./mercure');
const polling = require('./polling');
const Handlers = require('./handlers');

class TempMailBot {
  constructor() {
    this.bot = null;
    this.handlers = null;
  }

  async init() {
    try {
      logger.info('Initializing Temp Mail Bot...');

      if (!config.telegram.token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
      }

      db.init();
      logger.info('Database initialized');

      this.bot = new TelegramBot(config.telegram.token, { polling: true });
      logger.info('Telegram bot connected');

      this.handlers = new Handlers(this.bot);

      this.setupEventHandlers();
      this.setupCommandHandlers();
      this.setupPolling();
      this.restoreListeners();

      logger.info('Temp Mail Bot is running successfully! 🚀');
      
    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  setupEventHandlers() {
    this.bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    this.bot.on('error', (error) => {
      logger.error('Bot error:', error);
    });
  }

  setupCommandHandlers() {
    this.bot.onText(/\/start/, (msg) => {
      this.handlers.handleStart(msg);
    });

    this.bot.on('message', async (msg) => {
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const userId = msg.from.id;
      const userState = this.handlers.userStates.get(userId);

      if (userState && userState.state === 'waiting_recover_email') {
        await this.handlers.handleRecoverEmailInput(msg);
        return;
      }

      if (!msg.text) return;

      const text = msg.text.trim();

      switch (text) {
        case '✉️ ᴍʏ ᴇᴍᴀɪʟ':
          await this.handlers.handleMyEmail(msg);
          break;
        
        case '🌀 ɢᴇɴᴇʀᴀᴛᴇ ɴᴇᴡ':
          await this.handlers.handleGenerateNew(msg);
          break;
        
        case '📥 ɪɴʙᴏx':
          await this.handlers.handleInbox(msg);
          break;
        
        case '♻️ ʀᴇᴄᴏᴠᴇʀ ᴇᴍᴀɪʟ':
          await this.handlers.handleRecoverEmail(msg);
          break;
        
        case '🏠 ʙᴀᴄᴋ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ':
          await this.handlers.handleStart(msg);
          break;
        
        default:
          break;
      }
    });

    this.bot.on('callback_query', (query) => {
      this.handlers.handleCallbackQuery(query);
    });

    logger.info('Command handlers registered');
  }

  setupPolling() {
    polling.start(async (data) => {
      const { email, telegramId, message } = data;
      const emailData = db.getEmail(email);
      
      if (!emailData) return;

      const user = db.getUser(telegramId);
      const shouldNotify = emailData.notify_enabled === 1 && 
                          (user.global_notify === 1 || emailData.is_primary === 1);

      if (shouldNotify) {
        try {
          const Messages = require('./messages');
          const Keyboards = require('./keyboards');

          await this.bot.sendMessage(
            telegramId,
            Messages.newMailReceived(email, message),
            {
              parse_mode: 'HTML',
              reply_markup: Keyboards.messageActions(message.id, emailData.id)
            }
          );
        } catch (error) {
          logger.error(`Error sending notification to ${telegramId}:`, error);
        }
      }
    });

    logger.info('Polling service started');
  }

  async restoreListeners() {
    try {
      const listeners = db.getActiveListeners();
      
      logger.info(`Restoring ${listeners.length} active listeners...`);

      for (const listener of listeners) {
        try {
          let token = listener.token;
          
          const isValid = await mailtm.verifyToken(token);
          if (!isValid) {
            logger.info(`Refreshing token for ${listener.email_address}`);
            token = await mailtm.refreshToken(listener.email_address, listener.password);
            db.updateToken(listener.id, token);
          }

          this.handlers.startListening(
            listener.id,
            listener.account_id,
            token,
            listener.telegram_id,
            listener.email_address
          );

          logger.info(`Listener restored: ${listener.email_address}`);
          
        } catch (error) {
          logger.error(`Failed to restore listener for ${listener.email_address}:`, error.message);
          
          if (error.response && error.response.status === 401) {
            db.markEmailExpired(listener.id);
            db.removeListener(listener.id);
          }
        }
      }

      logger.info('All listeners restored successfully');
      
    } catch (error) {
      logger.error('Error restoring listeners:', error);
    }
  }

  async shutdown() {
    logger.info('Shutting down bot...');

    try {
      if (polling.isActive()) {
        polling.stop();
      }

      mercure.unsubscribeAll();

      if (this.bot) {
        await this.bot.stopPolling();
      }

      db.close();

      logger.info('Bot shutdown complete');
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const bot = new TempMailBot();

bot.init();

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  bot.shutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  bot.shutdown();
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  bot.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

module.exports = bot;
