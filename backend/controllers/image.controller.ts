import { Request, Response } from 'express';
import { ImageService } from '../services/image.service.js';
import { TelegramService } from '../services/telegram.service.js';

function sanitizeImage(img: any) {
  if (!img) return img;
  const { telegram_file_id, telegram_file_unique_id, telegram_message_id, telegram_chat_id, ...safe } = img;
  return safe;
}

/**
 * List images with pagination, search, album filtering, and sorting
 */
export async function getImages(req: Request, res: Response): Promise<void> {
  try {
    const { search, album_id, sort, page, limit } = req.query;

    const result = ImageService.listImages({
      search: search ? String(search) : undefined,
      albumId: album_id ? String(album_id) : undefined,
      sort: sort as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });

    res.json({
      success: true,
      data: {
        ...result,
        images: result.images.map(sanitizeImage),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to list images.',
    });
  }
}

/**
 * Get single image metadata
 */
export async function getImageById(req: Request, res: Response): Promise<void> {
  try {
    const image = ImageService.getImageById(req.params.id);
    if (!image) {
      res.status(404).json({
        success: false,
        message: 'Image not found in gallery index.',
      });
      return;
    }

    res.json({
      success: true,
      data: sanitizeImage(image),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to retrieve image.',
    });
  }
}

/**
 * Secure proxy endpoint to stream the photo from Telegram directly to the browser
 * GET /api/images/:id/file
 */
export async function streamImageFile(req: Request, res: Response): Promise<void> {
  try {
    const image = ImageService.getImageById(req.params.id);
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found.' });
      return;
    }

    // 1. Get file path from Telegram API
    const fileInfo = await TelegramService.getFileInfo(image.telegram_file_id);

    // 2. Stream photo directly from Telegram file server
    const { stream, contentLength, contentType } = await TelegramService.fetchFileStream(fileInfo.filePath);

    // 3. Set headers
    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';

    res.setHeader('Content-Type', image.mime_type || contentType || 'image/jpeg');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(image.filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400'); // 1 day client cache
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe ReadableStream to Express response
    const reader = stream.getReader();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(Buffer.from(value));
        }
      } catch (streamErr) {
        if (!res.headersSent) {
          res.status(502).json({ success: false, message: 'Failed streaming image from Telegram.' });
        } else {
          res.end();
        }
      }
    };

    pump();
  } catch (err: any) {
    res.status(502).json({
      success: false,
      message: `Failed to stream image from Telegram: ${err.message}`,
    });
  }
}

/**
 * Delete image from both SQLite database and Telegram chat
 */
export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const image = ImageService.getImageById(req.params.id);
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found.' });
      return;
    }

    const config = TelegramService.getConfig();
    const chatId = image.telegram_chat_id || config.chatId;

    let telegramDeleted = false;
    let telegramError: string | undefined;

    // Delete message directly from Telegram chat
    if (chatId && image.telegram_message_id) {
      try {
        const tgRes = await TelegramService.deleteMessage(chatId, image.telegram_message_id);
        telegramDeleted = tgRes.ok;
        if (!tgRes.ok) telegramError = tgRes.description;
      } catch (tgErr: any) {
        telegramError = tgErr.message;
      }
    }

    // Delete from SQLite database
    ImageService.deleteImage(image.id);

    res.json({
      success: true,
      data: {
        id: image.id,
        telegramDeleted,
        telegramError,
      },
      message: telegramDeleted
        ? 'Photo successfully deleted from both website and Telegram chat.'
        : 'Photo removed from gallery library.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete photo.',
    });
  }
}

/**
 * Bulk delete images from both SQLite database and Telegram chat
 */
export async function bulkDeleteImages(req: Request, res: Response): Promise<void> {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Array of image IDs required.' });
      return;
    }

    const config = TelegramService.getConfig();

    // Delete each photo message from Telegram
    const tgDeletions = ids.map(async (id) => {
      try {
        const img = ImageService.getImageById(id);
        if (img && img.telegram_message_id) {
          const chatId = img.telegram_chat_id || config.chatId;
          if (chatId) {
            await TelegramService.deleteMessage(chatId, img.telegram_message_id);
          }
        }
      } catch {
        // Continue deleting remaining images
      }
    });

    await Promise.allSettled(tgDeletions);

    // Delete all from SQLite
    const deletedCount = ImageService.bulkDelete(ids);

    res.json({
      success: true,
      data: { deletedCount },
      message: `Successfully deleted ${deletedCount} photo(s) from website and Telegram.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete photos.',
    });
  }
}

/**
 * Sync library with Telegram: detects messages deleted directly on Telegram
 * and removes them from the local database
 */
export async function syncTelegramDeletions(req: Request, res: Response): Promise<void> {
  try {
    const config = TelegramService.getConfig();
    if (!config.botToken) {
      res.status(400).json({ success: false, message: 'Telegram Bot Token is not configured.' });
      return;
    }

    const allImages = ImageService.listImages({ limit: 500 }).images;
    const removedPhotos: string[] = [];

    for (const img of allImages) {
      if (img.telegram_message_id) {
        const chatId = img.telegram_chat_id || config.chatId;
        const exists = await TelegramService.checkMessageExists(chatId, img.telegram_message_id);
        if (!exists) {
          ImageService.deleteImage(img.id);
          removedPhotos.push(img.filename);
        }
      }
    }

    res.json({
      success: true,
      data: {
        checked: allImages.length,
        removed: removedPhotos.length,
        removedPhotos,
      },
      message: removedPhotos.length > 0
        ? `Cleaned up ${removedPhotos.length} photo(s) that were deleted on Telegram.`
        : 'All photos are synchronized with Telegram.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to synchronize with Telegram.',
    });
  }
}


/**
 * Bulk assign images to album
 */
export async function bulkAssignAlbum(req: Request, res: Response): Promise<void> {
  try {
    const { ids, album_id } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Array of image IDs required.' });
      return;
    }

    const updatedCount = ImageService.bulkAssignAlbum(ids, album_id || null);

    res.json({
      success: true,
      data: { updatedCount },
      message: `Assigned ${updatedCount} photo(s) to album.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update album assignment.',
    });
  }
}

/**
 * Search images
 */
export async function searchImages(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query.q ? String(req.query.q) : '';
    const result = ImageService.listImages({
      search: query,
      limit: 50,
    });

    res.json({
      success: true,
      data: result.images.map(sanitizeImage),
      total: result.total,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Search failed.',
    });
  }
}

/**
 * Real dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = ImageService.getDashboardStats();
    const tgConfig = TelegramService.getConfig();

    res.json({
      success: true,
      data: {
        ...stats,
        recentPhotos: stats.recentPhotos.map(sanitizeImage),
        telegramConfigured: TelegramService.isConfigured(tgConfig),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to load dashboard statistics.',
    });
  }
}
