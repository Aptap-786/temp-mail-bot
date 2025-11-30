class Messages {
  static welcome(firstName, userId) {
    return `🌐 <b>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛᴇᴍᴘ-ᴍᴀɪʟ ʙᴏᴛ</b> 🚀

ʙᴜʏ & ᴍᴀɴᴀɢᴇ ɪɴꜱᴛᴀɴᴛ ᴇᴍᴀɪʟꜱ ꜰᴏʀ ᴏᴛᴘ / ʀᴇɢɪꜱᴛʀᴀᴛɪᴏɴ

👤 <b>ɴᴀᴍᴇ:</b> ${this.escape(firstName)}
🆔 <b>ɪᴅ:</b> <code>${userId}</code>

<i>ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ʙᴇʟᴏᴡ 👇</i>`;
  }

  static noEmails() {
    return `❌ <b>ʏᴏᴜ ᴅᴏ ɴᴏᴛ ʜᴀᴠᴇ ᴀɴʏ ᴇᴍᴀɪʟ ʏᴇᴛ</b>

ᴛᴀᴘ <b>🌀 ɢᴇɴᴇʀᴀᴛᴇ ɴᴇᴡ</b> ᴛᴏ ᴄʀᴇᴀᴛᴇ ʏᴏᴜʀ ꜰɪʀꜱᴛ ᴇᴍᴀɪʟ.`;
  }

  static primaryEmail(email, totalCount, notifyEnabled = true) {
    return `✅ <b>ʜᴇʀᴇ ɪꜱ ʏᴏᴜʀ ᴘʀɪᴍᴀʀʏ ᴇᴍᴀɪʟ</b> 👇

📬 <b>ᴇᴍᴀɪʟ ɪᴅ:</b> <code>${email}</code>
🔔 <b>ʀᴇᴀʟ-ᴛɪᴍᴇ ɴᴏᴛɪꜰʏ:</b> ${notifyEnabled ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ'}
📂 <b>ᴛᴏᴛᴀʟ ᴇᴍᴀɪʟꜱ ᴄʀᴇᴀᴛᴇᴅ:</b> ${totalCount}

<i>ꜱᴇʟᴇᴄᴛ ᴀɴ ᴏᴘᴛɪᴏɴ:</i>`;
  }

  static emailGenerated(email) {
    return `♻️ <b>ɴᴇᴡ ᴇᴍᴀɪʟ ɢᴇɴᴇʀᴀᴛᴇᴅ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ</b> ✅

📬 <b>ᴇᴍᴀɪʟ ɪᴅ:</b> <code>${email}</code>
🔔 <b>ʀᴇᴀʟ-ᴛɪᴍᴇ ɴᴏᴛɪꜰʏ:</b> ᴏɴ
ℹ️ <b>ᴛʜɪꜱ ᴇᴍᴀɪʟ ɪꜱ ɴᴏᴡ ʏᴏᴜʀ ᴘʀɪᴍᴀʀʏ ᴇᴍᴀɪʟ</b>

<i>ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ɪɴꜱᴛᴀɴᴛ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴꜱ ꜰᴏʀ ɴᴇᴡ ᴍᴀɪʟꜱ</i> ⚡`;
  }

  static emailList(emails) {
    let message = '📧 <b>ʏᴏᴜʀ ꜱᴀᴠᴇᴅ ᴇᴍᴀɪʟꜱ:</b>\n\n';
    
    emails.forEach((email, index) => {
      const status = email.is_active ? '🟢 ᴀᴄᴛɪᴠᴇ' : '🔴 ᴇxᴘɪʀᴇᴅ';
      const notify = email.notify_enabled ? '🔔 ᴏɴ' : '🔕 ᴏꜰꜰ';
      const primary = email.is_primary ? '⭐ ' : '';
      
      message += `${index + 1}. ${primary}<code>${email.email_address}</code>\n`;
      message += `   ꜱᴛᴀᴛᴜꜱ: ${status} | ɴᴏᴛɪꜰʏ: ${notify}\n\n`;
    });

    message += '<i>ᴛᴀᴘ ᴏɴ ᴀɴ ᴇᴍᴀɪʟ ᴛᴏ ᴍᴀɴᴀɢᴇ ɪᴛ</i>';
    return message;
  }

  static emailDetails(email) {
    const status = email.is_active ? '🟢 ᴀᴄᴛɪᴠᴇ' : '🔴 ᴇxᴘɪʀᴇᴅ';
    const notify = email.notify_enabled ? '🔔 ᴏɴ' : '🔕 ᴏꜰꜰ';
    const primary = email.is_primary ? '⭐ ʏᴇꜱ' : '❌ ɴᴏ';

    return `📧 <b>ᴇᴍᴀɪʟ ᴅᴇᴛᴀɪʟꜱ</b>

📬 <b>ᴀᴅᴅʀᴇꜱꜱ:</b> <code>${email.email_address}</code>
📊 <b>ꜱᴛᴀᴛᴜꜱ:</b> ${status}
🔔 <b>ɴᴏᴛɪꜰʏ:</b> ${notify}
⭐ <b>ᴘʀɪᴍᴀʀʏ:</b> ${primary}
📅 <b>ᴄʀᴇᴀᴛᴇᴅ:</b> ${this.formatDate(email.created_at)}

<i>ᴄʜᴏᴏꜱᴇ ᴀɴ ᴀᴄᴛɪᴏɴ ʙᴇʟᴏᴡ:</i>`;
  }

  static newMailReceived(email, message) {
    const from = message.from?.address || 'Unknown';
    const fromName = message.from?.name || '';
    const subject = message.subject || '(No Subject)';
    const intro = message.intro || message.text?.substring(0, 100) || '';

    return `📩 <b>ɴᴇᴡ ᴍᴀɪʟ ʀᴇᴄᴇɪᴠᴇᴅ</b> 🪧

📬 <b>ᴇᴍᴀɪʟ:</b> <code>${email}</code>
📇 <b>ꜰʀᴏᴍ:</b> ${fromName ? `${this.escape(fromName)} <${from}>` : from}
🗒️ <b>ꜱᴜʙᴊᴇᴄᴛ:</b> ${this.escape(subject)}
💬 <b>ᴘʀᴇᴠɪᴇᴡ:</b> ${this.escape(intro)}${intro.length > 100 ? '...' : ''}

⏱ <i>ʀᴇᴀʟ-ᴛɪᴍᴇ ɴᴏᴛɪꜰʏ</i>`;
  }

  static fullMessage(message) {
    const from = message.from?.address || 'Unknown';
    const fromName = message.from?.name || '';
    const subject = message.subject || '(No Subject)';
    const text = message.text || '(Empty message)';

    let msg = `📧 <b>ꜰᴜʟʟ ᴍᴇꜱꜱᴀɢᴇ</b>\n\n`;
    msg += `📇 <b>ꜰʀᴏᴍ:</b> ${fromName ? `${this.escape(fromName)} <${from}>` : from}\n`;
    msg += `🗒️ <b>ꜱᴜʙᴊᴇᴄᴛ:</b> ${this.escape(subject)}\n`;
    msg += `📅 <b>ᴅᴀᴛᴇ:</b> ${this.formatDate(Math.floor(new Date(message.createdAt).getTime() / 1000))}\n\n`;
    msg += `📄 <b>ᴍᴇꜱꜱᴀɢᴇ:</b>\n${this.escape(text)}`;

    if (message.hasAttachments) {
      msg += `\n\n📎 <b>ᴀᴛᴛᴀᴄʜᴍᴇɴᴛꜱ:</b> ${message.attachments?.length || 0}`;
    }

    return msg;
  }

  static noNewMails() {
    return `📭 <b>ɴᴏ ɴᴇᴡ ᴍᴀɪʟꜱ</b>

ɴᴏ ɴᴇᴡ ᴍᴀɪʟꜱ ꜰᴏʀ ʏᴏᴜʀ ᴀᴄᴛɪᴠᴇ ᴇᴍᴀɪʟꜱ.

<i>ᴡᴀɪᴛ ꜰᴏʀ ᴏᴛᴘ / ᴍᴀɪʟ ᴛʜᴇɴ ᴛᴀᴘ 📥 ɪɴʙᴏx ᴀɢᴀɪɴ
(ᴏʀ ʟᴇᴛ ʀᴇᴀʟ-ᴛɪᴍᴇ ɴᴏᴛɪꜰʏ ᴅᴏ ᴛʜᴇ ᴍᴀɢɪᴄ)</i> ⚡`;
  }

  static allMailsForwarded(count) {
    return `✅ <b>ᴀʟʟ ɴᴇᴡ ᴍᴀɪʟꜱ ʜᴀᴠᴇ ʙᴇᴇɴ ꜰᴏʀᴡᴀʀᴅᴇᴅ</b>

📬 <b>ᴛᴏᴛᴀʟ ᴍᴀɪʟꜱ:</b> ${count}

💡 <i>ᴡᴇʙꜱᴏᴄᴋᴇᴛ ᴄᴏɴɴᴇᴄᴛᴇᴅ ⚡
ᴋᴀʙʜɪ ᴋᴀʙʜɪ ᴛᴏ ɪᴛɴᴀ ꜰᴀꜱᴛ ᴀʏᴇɢᴀ
ᴋɪ ᴛᴜᴍʜᴇ 📥 ɪɴʙᴏx ᴅᴀʙᴀɴᴇ ᴋᴀ ᴍᴏǫᴀ ʙʜɪ ɴᴀʜɪ ᴍɪʟᴇɢᴀ 😆</i>`;
  }

  static recoverEmailPrompt() {
    return `♻️ <b>ʀᴇᴄᴏᴠᴇʀ ᴇᴍᴀɪʟ</b>

ᴇɴᴛᴇʀ ʏᴏᴜʀ ᴇᴍᴀɪʟ ᴀᴅᴅʀᴇꜱꜱ ᴛᴏ ʀᴇᴄᴏᴠᴇʀ 👇

<i>(ᴏɴʟʏ ᴇᴍᴀɪʟꜱ ɢᴇɴᴇʀᴀᴛᴇᴅ ʙʏ ᴛʜɪꜱ ʙᴏᴛ ᴄᴀɴ ʙᴇ ʀᴇᴄᴏᴠᴇʀᴇᴅ)</i>`;
  }

  static emailRecovered(email) {
    const status = email.is_active ? '🟢 ᴀᴄᴛɪᴠᴇ' : '🔴 ᴇxᴘɪʀᴇᴅ';
    const notify = email.notify_enabled ? 'ᴏɴ' : 'ᴏꜰꜰ';

    return `✅ <b>ʀᴇᴄᴏᴠᴇʀʏ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟ</b>

📬 <b>ᴇᴍᴀɪʟ:</b> <code>${email.email_address}</code>
ꜱᴛᴀᴛᴜꜱ: ${status}
🔔 ɴᴏᴛɪꜰʏ: ${notify}

<i>ʏᴏᴜ ᴄᴀɴ ᴍᴀɴᴀɢᴇ ɪᴛ ᴜɴᴅᴇʀ:
✉️ ᴍʏ ᴇᴍᴀɪʟ → 📜 ᴀʟʟ ᴍʏ ᴇᴍᴀɪʟꜱ</i>`;
  }

  static emailNotFound() {
    return `❌ <b>ᴇᴍᴀɪʟ ɴᴏᴛ ꜰᴏᴜɴᴅ</b>

ᴛʜɪꜱ ᴇᴍᴀɪʟ ᴡᴀꜱ ɴᴏᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ ᴛʜɪꜱ ʙᴏᴛ.

<i>ᴏɴʟʏ ʙᴏᴛ-ɢᴇɴᴇʀᴀᴛᴇᴅ ᴇᴍᴀɪʟꜱ ᴄᴀɴ ʙᴇ ʀᴇᴄᴏᴠᴇʀᴇᴅ.</i>`;
  }

  static emailBelongsToOther() {
    return `❌ <b>ᴀᴄᴄᴇꜱꜱ ᴅᴇɴɪᴇᴅ</b>

ᴛʜɪꜱ ᴇᴍᴀɪʟ ɪꜱ ʟɪɴᴋᴇᴅ ᴛᴏ ᴀɴᴏᴛʜᴇʀ ᴀᴄᴄᴏᴜɴᴛ.

<i>ʏᴏᴜ ᴄᴀɴɴᴏᴛ ʀᴇᴄᴏᴠᴇʀ ꜱᴏᴍᴇᴏɴᴇ ᴇʟꜱᴇ'ꜱ ᴇᴍᴀɪʟ.</i>`;
  }

  static globalNotifyOn() {
    return `🔔 <b>ɢʟᴏʙᴀʟ ɴᴏᴛɪꜰʏ ᴛᴜʀɴᴇᴅ ᴏɴ</b>

ᴀʟʟ ᴀᴄᴛɪᴠᴇ ᴇᴍᴀɪʟꜱ ᴡɪʟʟ ꜱᴇɴᴅ ɪɴꜱᴛᴀɴᴛ ᴄʜᴀᴛ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴꜱ
<i>(ᴏᴛᴘ / ᴍᴀɪʟꜱ ᴀᴜᴛᴏ-ꜰᴏʀᴡᴀʀᴅᴇᴅ)</i> ⚡`;
  }

  static globalNotifyOff() {
    return `🔕 <b>ɢʟᴏʙᴀʟ ɴᴏᴛɪꜰʏ ᴛᴜʀɴᴇᴅ ᴏꜰꜰ</b>

ᴏɴʟʏ ᴘʀɪᴍᴀʀʏ ᴇᴍᴀɪʟ ᴡɪʟʟ ꜱᴇɴᴅ ɪɴꜱᴛᴀɴᴛ ᴄʜᴀᴛ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴꜱ.
<i>ᴏᴛʜᴇʀ ᴇᴍᴀɪʟꜱ ᴡɪʟʟ ɴᴏᴛ ᴘᴜꜱʜ ᴀᴜᴛᴏ ᴍᴇꜱꜱᴀɢᴇꜱ.</i>`;
  }

  static maxEmailsReached(max) {
    return `⚠️ <b>ʟɪᴍɪᴛ ʀᴇᴀᴄʜᴇᴅ</b>

ʏᴏᴜ ʜᴀᴠᴇ ʀᴇᴀᴄʜᴇᴅ ᴛʜᴇ ᴍᴀxɪᴍᴜᴍ ʟɪᴍɪᴛ ᴏꜰ ${max} ᴇᴍᴀɪʟꜱ.

<i>ᴘʟᴇᴀꜱᴇ ᴅᴇʟᴇᴛᴇ ꜱᴏᴍᴇ ᴇxᴘɪʀᴇᴅ ᴇᴍᴀɪʟꜱ ʙᴇꜰᴏʀᴇ ᴄʀᴇᴀᴛɪɴɢ ɴᴇᴡ ᴏɴᴇꜱ.</i>`;
  }

  static error() {
    return `❌ <b>ᴇʀʀᴏʀ</b>

ꜱᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`;
  }

  static processing() {
    return '⏳ <i>ᴘʀᴏᴄᴇꜱꜱɪɴɢ...</i>';
  }

  static escape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

module.exports = Messages;
