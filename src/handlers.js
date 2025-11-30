const db = require('./database');
const mailtm = require('./mailtm');
const mercure = require('./mercure');
const polling = require('./polling');
const Messages = require('./messages');
const Keyboards = require('./keyboards');
const logger = require('./logger');
const config = require('./config');

class Handlers {
  constructor(bot) {
    this.bot = bot;
    this.userStates = new Map();
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    const username = msg.from.username;

    try {
      db.createOrUpdateUser(userId, firstName, username);
      
      await this.bot.sendMessage(
        chatId,
        Messages.welcome(firstName, userId),
        {
          parse_mode: 'HTML',
          reply_markup: Keyboards.mainMenu()
        }
      );
      
      logger.info(`User ${userId} started the bot`);
    } catch (error) {
      logger.error('Error in handleStart:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async handleMyEmail(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const emails = db.getUserEmails(userId);
      
      if (emails.length === 0) {
        await this.bot.sendMessage(chatId, Messages.noEmails(), { parse_mode: 'HTML' });
        return;
      }

      const primaryEmail = emails.find(e => e.is_primary);
      const user = db.getUser(userId);
      
      await this.bot.sendMessage(
        chatId,
        Messages.primaryEmail(primaryEmail.email_address, emails.length, primaryEmail.notify_enabled),
        {
          parse_mode: 'HTML',
          reply_markup: Keyboards.myEmailButtons(user.global_notify)
        }
      );
      
    } catch (error) {
      logger.error('Error in handleMyEmail:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async handleGenerateNew(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const count = db.countUserEmails(userId);
      if (count >= config.bot.maxEmailsPerUser) {
        await this.bot.sendMessage(
          chatId, 
          Messages.maxEmailsReached(config.bot.maxEmailsPerUser),
          { parse_mode: 'HTML' }
        );
        return;
      }

      const processingMsg = await this.bot.sendMessage(chatId, Messages.processing(), { parse_mode: 'HTML' });

      const account = await mailtm.createAccount();
      const token = await mailtm.getToken(account.address, account.password);

      const result = db.createEmail(
        userId,
        account.address,
        account.id,
        account.password,
        token
      );

      const emailId = result.lastInsertRowid;
      
      db.createListener(emailId);
      
      this.startListening(emailId, account.id, token, userId, account.address);

      await this.bot.deleteMessage(chatId, processingMsg.message_id);
      
      await this.bot.sendMessage(
        chatId,
        Messages.emailGenerated(account.address),
        { parse_mode: 'HTML' }
      );

      logger.info(`New email generated for user ${userId}: ${account.address}`);
      
    } catch (error) {
      logger.error('Error in handleGenerateNew:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async handleInbox(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const emails = db.getActiveEmails(userId);
      
      if (emails.length === 0) {
        await this.bot.sendMessage(chatId, Messages.noEmails(), { parse_mode: 'HTML' });
        return;
      }

      const processingMsg = await this.bot.sendMessage(chatId, Messages.processing(), { parse_mode: 'HTML' });

      let totalNewMessages = 0;
      
      for (const email of emails) {
        try {
          let token = email.token;
          const isValid = await mailtm.verifyToken(token);
          
          if (!isValid) {
            token = await mailtm.refreshToken(email.email_address, email.password);
            db.updateToken(email.id, token);
          }

          const { messages } = await mailtm.getMessages(token);
          
          const listener = db.getListener(email.id);
          const lastCheck = listener?.last_check || 0;
          
          const newMessages = messages.filter(msg => {
            const msgTime = Math.floor(new Date(msg.createdAt).getTime() / 1000);
            return msgTime > lastCheck;
          });

          for (const message of newMessages) {
            db.saveMessage(message.id, email.id, message);
            
            const fullMessage = await mailtm.getMessage(token, message.id);
            
            await this.bot.sendMessage(
              chatId,
              Messages.newMailReceived(email.email_address, fullMessage),
              {
                parse_mode: 'HTML',
                reply_markup: Keyboards.messageActions(message.id, email.id)
              }
            );
            
            totalNewMessages++;
            await this.delay(config.bot.messageBatchDelay);
          }

          db.updateListenerCheck(email.id);
          
        } catch (error) {
          logger.error(`Error checking inbox for ${email.email_address}:`, error.message);
        }
      }

      await this.bot.deleteMessage(chatId, processingMsg.message_id);

      if (totalNewMessages === 0) {
        await this.bot.sendMessage(chatId, Messages.noNewMails(), { parse_mode: 'HTML' });
      } else {
        await this.bot.sendMessage(
          chatId,
          Messages.allMailsForwarded(totalNewMessages),
          { parse_mode: 'HTML' }
        );
      }
      
    } catch (error) {
      logger.error('Error in handleInbox:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async handleRecoverEmail(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      await this.bot.sendMessage(
        chatId,
        Messages.recoverEmailPrompt(),
        {
          parse_mode: 'HTML',
          reply_markup: Keyboards.backToMain()
        }
      );

      this.userStates.set(userId, { state: 'waiting_recover_email' });
      
    } catch (error) {
      logger.error('Error in handleRecoverEmail:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async handleRecoverEmailInput(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const emailAddress = msg.text.trim();

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        await this.bot.sendMessage(chatId, '❌ Invalid email format. Please try again.');
        return;
      }

      const email = db.getEmail(emailAddress);
      
      if (!email) {
        await this.bot.sendMessage(chatId, Messages.emailNotFound(), { parse_mode: 'HTML' });
        this.userStates.delete(userId);
        return;
      }

      if (email.telegram_id !== userId) {
        await this.bot.sendMessage(chatId, Messages.emailBelongsToOther(), { parse_mode: 'HTML' });
        this.userStates.delete(userId);
        return;
      }

      try {
        const token = await mailtm.refreshToken(email.email_address, email.password);
        db.updateToken(email.id, token);
        
        if (!email.is_active) {
          db.db.prepare('UPDATE emails SET is_active = 1 WHERE id = ?').run(email.id);
        }
        
        db.createListener(email.id);
        this.startListening(email.id, email.account_id, token, userId, email.email_address);
        
      } catch (error) {
        logger.warn(`Could not refresh token for ${emailAddress}, may be expired`);
      }

      const updatedEmail = db.getEmailById(email.id);
      
      await this.bot.sendMessage(
        chatId,
        Messages.emailRecovered(updatedEmail),
        { parse_mode: 'HTML' }
      );

      this.userStates.delete(userId);
      logger.info(`Email recovered for user ${userId}: ${emailAddress}`);
      
    } catch (error) {
      logger.error('Error in handleRecoverEmailInput:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
      this.userStates.delete(userId);
    }
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const data = query.data;

    try {
      await this.bot.answerCallbackQuery(query.id);

      if (data === 'all_emails') {
        await this.showAllEmails(chatId, messageId, userId);
      } else if (data === 'toggle_global_notify') {
        await this.toggleGlobalNotify(chatId, messageId, userId);
      } else if (data.startsWith('toggle_notify_')) {
        const emailId = parseInt(data.split('_')[2]);
        await this.toggleEmailNotify(chatId, messageId, emailId);
      } else if (data.startsWith('set_primary_')) {
        const emailId = parseInt(data.split('_')[2]);
        await this.setPrimaryEmail(chatId, messageId, userId, emailId);
      } else if (data.startsWith('delete_email_')) {
        const emailId = parseInt(data.split('_')[2]);
        await this.confirmDeleteEmail(chatId, messageId, emailId);
      } else if (data.startsWith('confirm_delete_')) {
        const emailId = parseInt(data.split('_')[2]);
        await this.deleteEmail(chatId, messageId, userId, emailId);
      } else if (data.startsWith('view_inbox_')) {
        const emailId = parseInt(data.split('_')[2]);
        await this.viewEmailInbox(chatId, userId, emailId);
      } else if (data.startsWith('open_message_')) {
        const messageIdStr = data.split('_')[2];
        await this.openFullMessage(chatId, userId, messageIdStr);
      } else if (data.startsWith('delete_message_')) {
        const parts = data.split('_');
        const messageIdStr = parts[2];
        const emailId = parseInt(parts[3]);
        await this.deleteMessage(chatId, messageId, userId, messageIdStr, emailId);
      }
      
    } catch (error) {
      logger.error('Error in handleCallbackQuery:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  async showAllEmails(chatId, messageId, userId) {
    const emails = db.getUserEmails(userId);
    
    if (emails.length === 0) {
      await this.bot.editMessageText(Messages.noEmails(), {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      });
      return;
    }

    await this.bot.editMessageText(Messages.emailList(emails), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML'
    });

    for (const email of emails) {
      await this.bot.sendMessage(
        chatId,
        Messages.emailDetails(email),
        {
          parse_mode: 'HTML',
          reply_markup: Keyboards.emailActions(
            email.id,
            email.is_active,
            email.notify_enabled,
            email.is_primary
          )
        }
      );
    }
  }

  async toggleGlobalNotify(chatId, messageId, userId) {
    const user = db.getUser(userId);
    const newState = user.global_notify === 1 ? 0 : 1;
    
    db.updateGlobalNotify(userId, newState);
    
    const message = newState === 1 ? Messages.globalNotifyOn() : Messages.globalNotifyOff();
    
    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: Keyboards.myEmailButtons(newState)
    });
  }

  async toggleEmailNotify(chatId, messageId, emailId) {
    db.toggleNotify(emailId);
    const email = db.getEmailById(emailId);
    
    await this.bot.editMessageText(Messages.emailDetails(email), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: Keyboards.emailActions(
        email.id,
        email.is_active,
        email.notify_enabled,
        email.is_primary
      )
    });
  }

  async setPrimaryEmail(chatId, messageId, userId, emailId) {
    db.setPrimaryEmail(emailId, userId);
    const email = db.getEmailById(emailId);
    
    await this.bot.editMessageText(Messages.emailDetails(email), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: Keyboards.emailActions(
        email.id,
        email.is_active,
        email.notify_enabled,
        email.is_primary
      )
    });
    
    await this.bot.sendMessage(chatId, '⭐ <b>Primary email updated successfully</b>', { parse_mode: 'HTML' });
  }

  async confirmDeleteEmail(chatId, messageId, emailId) {
    const email = db.getEmailById(emailId);
    
    await this.bot.editMessageText(
      `🗑 <b>Delete Email?</b>\n\n<code>${email.email_address}</code>\n\n<i>This action cannot be undone.</i>`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: Keyboards.confirmDelete(emailId)
      }
    );
  }

  async deleteEmail(chatId, messageId, userId, emailId) {
    const email = db.getEmailById(emailId);
    
    mercure.unsubscribe(email.account_id);
    db.removeListener(emailId);
    db.deleteEmail(emailId);
    
    await this.bot.editMessageText(
      `✅ <b>Email deleted</b>\n\n<code>${email.email_address}</code>`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML'
      }
    );
    
    logger.info(`Email deleted: ${email.email_address} by user ${userId}`);
  }

  async viewEmailInbox(chatId, userId, emailId) {
    const email = db.getEmailById(emailId);
    const messages = db.getMessages(emailId, 10);
    
    if (messages.length === 0) {
      await this.bot.sendMessage(
        chatId,
        `📭 <b>Empty inbox</b>\n\n<code>${email.email_address}</code>\n\n<i>No messages found.</i>`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    await this.bot.sendMessage(
      chatId,
      `📬 <b>Inbox for:</b> <code>${email.email_address}</code>\n\n<i>Showing last ${messages.length} messages:</i>`,
      { parse_mode: 'HTML' }
    );
    
    for (const message of messages) {
      const msgData = {
        from: { address: message.from_address, name: message.from_name },
        subject: message.subject,
        intro: message.intro,
        createdAt: new Date(message.received_at * 1000).toISOString()
      };
      
      await this.bot.sendMessage(
        chatId,
        Messages.newMailReceived(email.email_address, msgData),
        {
          parse_mode: 'HTML',
          reply_markup: Keyboards.messageActions(message.message_id, emailId)
        }
      );
      
      await this.delay(config.bot.messageBatchDelay);
    }
  }

  async openFullMessage(chatId, userId, messageId) {
    const message = db.db.prepare('SELECT * FROM messages WHERE message_id = ?').get(messageId);
    
    if (!message) {
      await this.bot.sendMessage(chatId, '❌ Message not found', { parse_mode: 'HTML' });
      return;
    }
    
    const msgData = {
      from: { address: message.from_address, name: message.from_name },
      subject: message.subject,
      text: message.text_content,
      createdAt: new Date(message.received_at * 1000).toISOString(),
      hasAttachments: message.has_attachments,
      attachments: []
    };
    
    await this.bot.sendMessage(chatId, Messages.fullMessage(msgData), { parse_mode: 'HTML' });
  }

  async deleteMessage(chatId, messageId, userId, mailMessageId, emailId) {
    const email = db.getEmailById(emailId);
    
    try {
      await mailtm.deleteMessage(email.token, mailMessageId);
      db.deleteMessage(mailMessageId);
      
      await this.bot.editMessageText(
        '✅ <b>Message deleted successfully</b>',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML'
        }
      );
    } catch (error) {
      logger.error('Error deleting message:', error);
      await this.bot.sendMessage(chatId, Messages.error(), { parse_mode: 'HTML' });
    }
  }

  startListening(emailId, accountId, token, telegramId, emailAddress) {
    mercure.subscribe(accountId, token, async (data) => {
      try {
        const { messages } = await mailtm.getMessages(token);
        
        if (messages.length > 0) {
          const latestMessage = messages[0];
          const listener = db.getListener(emailId);
          const lastCheck = listener?.last_check || 0;
          const msgTime = Math.floor(new Date(latestMessage.createdAt).getTime() / 1000);
          
          if (msgTime > lastCheck) {
            db.saveMessage(latestMessage.id, emailId, latestMessage);
            
            const email = db.getEmailById(emailId);
            const user = db.getUser(telegramId);
            
            const shouldNotify = email.notify_enabled === 1 && 
                               (user.global_notify === 1 || email.is_primary === 1);
            
            if (shouldNotify) {
              const fullMessage = await mailtm.getMessage(token, latestMessage.id);
              
              await this.bot.sendMessage(
                telegramId,
                Messages.newMailReceived(emailAddress, fullMessage),
                {
                  parse_mode: 'HTML',
                  reply_markup: Keyboards.messageActions(latestMessage.id, emailId)
                }
              );
            }
            
            db.updateListenerCheck(emailId);
          }
        }
      } catch (error) {
        logger.error(`Error in Mercure callback for ${emailAddress}:`, error);
      }
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Handlers;
