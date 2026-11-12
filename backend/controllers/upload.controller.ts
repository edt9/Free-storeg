import { Request, Response } from 'express';
import crypto from 'crypto';
import { TelegramService } from '../services/telegram.service.js';
import { ImageService } from '../services/image.service.js';
import { db } from '../database/connection.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Helper to inspect initial magic bytes for safety
function isValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  // GIF: 47 49 46 38
  if (mimeType === 'image/gif') {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }
  // WebP: RIFF ... WEBP
  if (mimeType === 'image/webp') {
    const isRiff = buffer.slice(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.length >= 12 && buffer.slice(8, 12).toString('ascii') === 'WEBP';
    return isRiff && isWebp;
  }

  return false;
}

export async function handleUpload(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  const singleFile = req.file;

  const targetFiles: Express.Multer.File[] = [];
  if (files && Array.isArray(files)) {
    targetFiles.push(...files);
  } else if (singleFile) {
    targetFiles.push(singleFile);
  }

  if (targetFiles.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No image files provided for upload.',
    });
    return;
  }

  const albumId = req.body?.album_id || null;
  const results: any[] = [];
  const errors: any[] = [];

  for (const file of targetFiles) {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Initial Job Record
    db.prepare(`
      INSERT INTO upload_jobs (id, filename, status, file_size, created_at)
      VALUES (?, ?, 'uploading', ?, ?)
    `).run(jobId, file.originalname, file.size, now);

    try {
      // 2. Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new Error(`Unsupported file type: ${file.mimetype}. Supported formats: JPEG, PNG, WebP, GIF.`);
      }

      // 3. Inspect file signature magic bytes
      if (!isValidImageSignature(file.buffer, file.mimetype)) {
        throw new Error('Corrupted or invalid image file signature detected.');
      }

      // 4. Send to Telegram
      const tgResult = await TelegramService.uploadPhoto({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        caption: `TeleCloud: ${file.originalname}`,
      });

      // 5. Index in SQLite images table
      const imageId = crypto.randomUUID();
      const imageRecord = ImageService.createImage({
        id: imageId,
        telegram_file_id: tgResult.telegramFileId,
        telegram_file_unique_id: tgResult.telegramFileUniqueId,
        filename: file.originalname,
        mime_type: file.mimetype,
        file_size: tgResult.fileSize || file.size,
        album_id: albumId,
        upload_date: now,
        telegram_message_id: tgResult.telegramMessageId,
        telegram_chat_id: tgResult.telegramChatId,
      });

      // 6. Mark job successful
      db.prepare(`
        UPDATE upload_jobs 
        SET status = 'success', completed_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), jobId);

      results.push({
        jobId,
        image: imageRecord,
      });
    } catch (err: any) {
      // Mark job failed
      db.prepare(`
        UPDATE upload_jobs 
        SET status = 'failed', error_message = ?, completed_at = ?
        WHERE id = ?
      `).run(err.message, new Date().toISOString(), jobId);

      errors.push({
        filename: file.originalname,
        error: err.message,
      });
    }
  }

  if (results.length === 0 && errors.length > 0) {
    res.status(500).json({
      success: false,
      message: errors[0]?.error || 'Failed to upload photo to Telegram.',
      errors,
    });
    return;
  }

  res.json({
    success: true,
    data: {
      uploaded: results.map((r) => r.image),
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    message: errors.length > 0
      ? `Uploaded ${results.length} photo(s) with ${errors.length} error(s).`
      : `Successfully uploaded ${results.length} photo(s) to Telegram Cloud.`,
  });
}
