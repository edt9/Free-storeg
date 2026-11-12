import { Request, Response } from 'express';
import crypto from 'crypto';
import { TelegramService } from '../services/telegram.service.js';
import { ImageService } from '../services/image.service.js';
import { db, setSetting } from '../database/connection.js';

export async function getTelegramStatus(req: Request, res: Response): Promise<void> {
  try {
    const config = TelegramService.getConfig();
    const isConfigured = TelegramService.isConfigured(config);

    if (!isConfigured) {
      res.json({
        success: true,
        data: {
          configured: false,
          connected: false,
          statusText: 'Configuration Required',
          message: 'Telegram Bot Token or Chat ID is not configured. Set them in Settings or .env file.',
        },
      });
      return;
    }

    const test = await TelegramService.checkConnection(config.botToken, config.chatId);
    const webhook = await TelegramService.getWebhookInfo();

    res.json({
      success: true,
      data: {
        configured: true,
        connected: test.connected,
        statusText: test.connected ? 'Connected' : 'Connection Error',
        bot: test.bot ? {
          username: test.bot.username,
          firstName: test.bot.firstName,
        } : undefined,
        chat: test.chat ? {
          title: (test.chat.title && !/^-?\d+$/.test(test.chat.title)) ? test.chat.title : 'Private Cloud Storage',
          type: test.chat.type,
        } : undefined,
        webhook,
        error: test.error,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to check Telegram status.',
    });
  }
}

export async function testTelegramConfig(req: Request, res: Response): Promise<void> {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken) {
      res.status(400).json({ success: false, message: 'Bot Token is required.' });
      return;
    }

    const result = await TelegramService.checkConnection(botToken, chatId);

    res.json({
      success: result.connected,
      data: {
        connected: result.connected,
        bot: result.bot ? { username: result.bot.username, firstName: result.bot.firstName } : undefined,
        chat: result.chat ? {
          title: (result.chat.title && !/^-?\d+$/.test(result.chat.title)) ? result.chat.title : 'Private Cloud Storage',
          type: result.chat.type
        } : undefined,
        error: result.error,
      },
      message: result.connected
        ? `Successfully connected to Telegram Bot @${result.bot?.username}!`
        : (result.error || 'Connection check failed.'),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Telegram connection test failed.',
    });
  }
}

export async function saveTelegramConfig(req: Request, res: Response): Promise<void> {
  try {
    const { botToken, chatId, webhookSecret } = req.body;

    if (botToken !== undefined) {
      setSetting('telegram_bot_token', String(botToken).trim());
    }
    if (chatId !== undefined) {
      setSetting('telegram_chat_id', String(chatId).trim());
    }
    if (webhookSecret !== undefined) {
      setSetting('telegram_webhook_secret', String(webhookSecret).trim());
    }

    res.json({
      success: true,
      message: 'Telegram settings saved successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to save Telegram settings.',
    });
  }
}

export async function setupWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { webhookUrl, secretToken } = req.body;
    if (!webhookUrl) {
      res.status(400).json({ success: false, message: 'Webhook URL is required.' });
      return;
    }

    const config = TelegramService.getConfig();
    const secret = secretToken || config.webhookSecret;
    const result = await TelegramService.setWebhook(webhookUrl, secret);

    res.json({
      success: result.ok,
      message: result.description || (result.ok ? 'Webhook registered with Telegram.' : 'Webhook setup failed.'),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to set up Telegram webhook.',
    });
  }
}

/**
 * Handle incoming Telegram updates (Direct uploads to bot)
 */
export async function handleTelegramWebhook(req: Request, res: Response): Promise<void> {
  try {
    const config = TelegramService.getConfig();

    // Verify webhook secret token if configured
    if (config.webhookSecret) {
      const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (headerSecret !== config.webhookSecret) {
        res.status(401).json({ error: 'Invalid webhook secret token.' });
        return;
      }
    }

    const update = req.body;
    if (!update || typeof update.update_id !== 'number') {
      res.status(400).json({ error: 'Invalid update payload.' });
      return;
    }

    // Duplicate update protection
    const existing = db.prepare('SELECT update_id FROM processed_updates WHERE update_id = ?').get(update.update_id);
    if (existing) {
      res.status(200).json({ ok: true, note: 'Already processed.' });
      return;
    }

    // Record update as processed
    db.prepare('INSERT INTO processed_updates (update_id, processed_at) VALUES (?, ?)').run(
      update.update_id,
      new Date().toISOString()
    );

    const message = update.message || update.channel_post;
    if (message && message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      // Pick the largest photo resolution
      const photos = message.photo;
      const largest = photos.reduce((prev: any, curr: any) => {
        const prevSize = prev.file_size || prev.width * prev.height;
        const currSize = curr.file_size || curr.width * curr.height;
        return currSize > prevSize ? curr : prev;
      });

      const imageId = crypto.randomUUID();
      const now = new Date().toISOString();
      const filename = message.caption
        ? `${message.caption.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '_')}_${largest.file_unique_id}.jpg`
        : `telegram_${largest.file_unique_id}.jpg`;

      ImageService.createImage({
        id: imageId,
        telegram_file_id: largest.file_id,
        telegram_file_unique_id: largest.file_unique_id,
        filename,
        mime_type: 'image/jpeg',
        file_size: largest.file_size || 0,
        album_id: null,
        upload_date: new Date(message.date * 1000).toISOString() || now,
        telegram_message_id: message.message_id,
        telegram_chat_id: String(message.chat.id),
      });
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
