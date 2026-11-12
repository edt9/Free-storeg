import { getSetting } from '../database/connection.js';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  webhookSecret?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramSendPhotoResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number | string;
      title?: string;
      username?: string;
      type?: string;
    };
    date: number;
    photo?: TelegramPhotoSize[];
  };
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
}

export interface TelegramGetFileResponse {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  };
  description?: string;
  error_code?: number;
}

export class TelegramService {
  /**
   * Retrieves active configuration from environment or SQLite app_settings
   */
  static getConfig(): TelegramConfig {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || getSetting('telegram_bot_token', '');
    const chatId = process.env.TELEGRAM_CHAT_ID || getSetting('telegram_chat_id', '');
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || getSetting('telegram_webhook_secret', '');

    return {
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      webhookSecret: webhookSecret.trim(),
    };
  }

  /**
   * Safe check if bot token and chat ID are configured
   */
  static isConfigured(config?: TelegramConfig): boolean {
    const cfg = config || this.getConfig();
    return Boolean(cfg.botToken && cfg.chatId);
  }

  /**
   * Test Telegram connection with provided or saved bot credentials
   */
  static async checkConnection(customToken?: string, customChatId?: string): Promise<{
    connected: boolean;
    bot?: { id?: number; username: string; firstName: string };
    chat?: { id?: string | number; title?: string; type?: string };
    error?: string;
  }> {
    const token = customToken || this.getConfig().botToken;
    const targetChat = customChatId || this.getConfig().chatId;

    if (!token) {
      return { connected: false, error: 'Telegram Bot Token is not configured.' };
    }

    try {
      // 1. Check Bot validity via getMe
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json() as {
        ok: boolean;
        result?: { id: number; username?: string; first_name?: string };
        description?: string;
      };

      if (!meData.ok || !meData.result) {
        return {
          connected: false,
          error: meData.description || 'Invalid Telegram Bot Token or network error.',
        };
      }

      const botInfo = {
        id: meData.result.id,
        username: meData.result.username || '',
        firstName: meData.result.first_name || '',
      };

      // 2. If chat ID is supplied, check chat access via getChat
      let chatInfo: { id?: string | number; title?: string; type?: string } | undefined;
      if (targetChat) {
        try {
          const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(targetChat)}`);
          const chatData = await chatRes.json() as {
            ok: boolean;
            result?: { id: number | string; title?: string; username?: string; type?: string };
            description?: string;
          };
          if (chatData.ok && chatData.result) {
            const resolvedTitle = chatData.result.title || chatData.result.username;
            chatInfo = {
              title: (resolvedTitle && !/^-?\d+$/.test(resolvedTitle)) ? resolvedTitle : 'Private Cloud Storage',
              type: chatData.result.type,
            };
          } else {
            return {
              connected: false,
              bot: botInfo,
              error: `Bot is valid (@${botInfo.username}), but target chat could not be accessed: ${chatData.description || 'Not found or bot is not an admin'}. Ensure the bot is added to the chat and given permission to post.`,
            };
          }
        } catch (chatErr: any) {
          return {
            connected: false,
            bot: botInfo,
            error: `Failed to verify target chat: ${chatErr.message}`,
          };
        }
      }

      return {
        connected: true,
        bot: botInfo,
        chat: chatInfo,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: `Network error reaching Telegram API: ${err.message}`,
      };
    }
  }

  /**
   * Upload an image buffer to Telegram chat with bounded exponential backoff
   */
  static async uploadPhoto(options: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    caption?: string;
    chatId?: string;
    botToken?: string;
  }): Promise<{
    telegramFileId: string;
    telegramFileUniqueId: string;
    telegramMessageId: number;
    telegramChatId: string;
    width?: number;
    height?: number;
    fileSize: number;
  }> {
    const config = this.getConfig();
    const token = options.botToken || config.botToken;
    const chatId = options.chatId || config.chatId;

    if (!token || !chatId) {
      throw new Error('Telegram Bot Token and Chat ID must be configured before uploading photos.');
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const formData = new FormData();
        formData.append('chat_id', chatId);

        // Convert Node Buffer to Uint8Array/Blob
        const blob = new Blob([new Uint8Array(options.buffer)], { type: options.mimeType });
        formData.append('photo', blob, options.filename);

        if (options.caption) {
          formData.append('caption', options.caption);
        }

        const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json() as TelegramSendPhotoResponse;

        if (!data.ok) {
          // If Telegram asks to retry after X seconds
          if (data.parameters?.retry_after && attempt < maxRetries) {
            const waitMs = (data.parameters.retry_after + 1) * 1000;
            await new Promise((r) => setTimeout(r, Math.min(waitMs, 10000)));
            continue;
          }

          // If standard rate limit or temporary server error (429, 502, 503)
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }

          throw new Error(data.description || `Telegram API error (${data.error_code || response.status})`);
        }

        const photos = data.result?.photo;
        if (!photos || photos.length === 0) {
          throw new Error('Telegram did not return photo data in the response.');
        }

        // Telegram returns multiple photo sizes sorted from smallest to largest; pick the largest
        const largestPhoto = photos.reduce((prev, current) => {
          const prevSize = (prev.file_size || 0) || (prev.width * prev.height);
          const currSize = (current.file_size || 0) || (current.width * current.height);
          return currSize > prevSize ? current : prev;
        });

        return {
          telegramFileId: largestPhoto.file_id,
          telegramFileUniqueId: largestPhoto.file_unique_id,
          telegramMessageId: data.result!.message_id,
          telegramChatId: String(data.result!.chat.id),
          width: largestPhoto.width,
          height: largestPhoto.height,
          fileSize: largestPhoto.file_size || options.buffer.length,
        };
      } catch (err: any) {
        if (attempt >= maxRetries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }

    throw new Error('Upload failed after retries.');
  }

  /**
   * Retrieves file information (including file_path) from Telegram by file_id
   */
  static async getFileInfo(fileId: string): Promise<{
    filePath: string;
    fileSize?: number;
  }> {
    const config = this.getConfig();
    if (!config.botToken) {
      throw new Error('Telegram Bot Token is not configured.');
    }

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await response.json() as TelegramGetFileResponse;

    if (!data.ok || !data.result?.file_path) {
      throw new Error(data.description || 'Unable to retrieve file path from Telegram API.');
    }

    return {
      filePath: data.result.file_path,
      fileSize: data.result.file_size,
    };
  }

  /**
   * Fetches the binary file stream from Telegram's file server
   */
  static async fetchFileStream(filePath: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentLength?: string;
    contentType?: string;
  }> {
    const config = this.getConfig();
    if (!config.botToken) {
      throw new Error('Telegram Bot Token is not configured.');
    }

    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download image from Telegram file server (Status ${response.status})`);
    }

    return {
      stream: response.body,
      contentLength: response.headers.get('content-length') || undefined,
      contentType: response.headers.get('content-type') || undefined,
    };
  }

  /**
   * Delete a photo message from Telegram chat
   */
  static async deleteMessage(chatId: string | null | undefined, messageId: number | null | undefined): Promise<{ ok: boolean; description?: string }> {
    const config = this.getConfig();
    const targetChat = chatId || config.chatId;

    if (!config.botToken) {
      return { ok: false, description: 'Telegram Bot Token is not configured.' };
    }
    if (!targetChat || !messageId) {
      return { ok: false, description: 'Missing target chat ID or message ID' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChat, message_id: messageId }),
      });
      const data = await response.json() as { ok: boolean; description?: string };

      // If message is already deleted in Telegram, treat as success
      if (!data.ok && data.description?.toLowerCase().includes('message to delete not found')) {
        return { ok: true, description: 'Message already deleted on Telegram.' };
      }

      return data;
    } catch (err: any) {
      return { ok: false, description: err.message };
    }
  }

  /**
   * Check if a photo message still exists on Telegram
   * Uses non-destructive editMessageReplyMarkup probe
   */
  static async checkMessageExists(chatId: string | null | undefined, messageId: number | null | undefined): Promise<boolean> {
    const config = this.getConfig();
    const targetChat = chatId || config.chatId;

    if (!config.botToken || !targetChat || !messageId) {
      return true; // Cannot determine without credentials, assume present
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChat, message_id: messageId }),
      });
      const data = await response.json() as { ok: boolean; description?: string };

      // If Telegram reports message not found, it has been deleted on Telegram
      if (!data.ok && data.description?.toLowerCase().includes('message to edit not found')) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  }


  /**
   * Set webhook for direct Telegram bot uploads
   */
  static async setWebhook(webhookUrl: string, secretToken?: string): Promise<{ ok: boolean; description?: string }> {
    const config = this.getConfig();
    if (!config.botToken) {
      throw new Error('Telegram Bot Token is not configured.');
    }

    const body: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: ['message'],
    };
    if (secretToken) {
      body.secret_token = secretToken;
    }

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return await response.json() as { ok: boolean; description?: string };
  }

  /**
   * Get webhook status
   */
  static async getWebhookInfo(): Promise<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null> {
    const config = this.getConfig();
    if (!config.botToken) return null;

    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getWebhookInfo`);
      const data = await response.json() as { ok: boolean; result?: any };
      if (data.ok && data.result) {
        return data.result;
      }
      return null;
    } catch {
      return null;
    }
  }
}
