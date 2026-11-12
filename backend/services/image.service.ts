import { db } from '../database/connection.js';

export interface ImageRecord {
  id: string;
  telegram_file_id: string;
  telegram_file_unique_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  album_id: string | null;
  album_name?: string | null;
  upload_date: string;
  telegram_message_id: number | null;
  telegram_chat_id: string | null;
  status: string;
  created_at: string;
}

export interface ListImagesOptions {
  search?: string;
  albumId?: string;
  sort?: 'newest' | 'oldest' | 'name' | 'size';
  page?: number;
  limit?: number;
}

export class ImageService {
  /**
   * Paginated list of images with optional search and album filtering
   */
  static listImages(options: ListImagesOptions): {
    images: ImageRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["i.status = 'active'"];
    const params: any[] = [];

    if (options.albumId) {
      if (options.albumId === 'unassigned') {
        conditions.push('i.album_id IS NULL');
      } else {
        conditions.push('i.album_id = ?');
        params.push(options.albumId);
      }
    }

    if (options.search && options.search.trim()) {
      conditions.push('(i.filename LIKE ? OR a.name LIKE ?)');
      const term = `%${options.search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'i.upload_date DESC';
    if (options.sort === 'oldest') {
      orderBy = 'i.upload_date ASC';
    } else if (options.sort === 'name') {
      orderBy = 'i.filename COLLATE NOCASE ASC';
    } else if (options.sort === 'size') {
      orderBy = 'i.file_size DESC';
    }

    // Count total matching items
    const countQuery = `
      SELECT COUNT(*) as count
      FROM images i
      LEFT JOIN albums a ON i.album_id = a.id
      ${whereClause}
    `;
    const countRow = db.prepare(countQuery).get(...params) as { count: number };
    const total = countRow ? countRow.count : 0;

    // Fetch page items
    const selectQuery = `
      SELECT 
        i.id,
        i.telegram_file_id,
        i.telegram_file_unique_id,
        i.filename,
        i.mime_type,
        i.file_size,
        i.album_id,
        a.name as album_name,
        i.upload_date,
        i.telegram_message_id,
        i.telegram_chat_id,
        i.status,
        i.created_at
      FROM images i
      LEFT JOIN albums a ON i.album_id = a.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const images = db.prepare(selectQuery).all(...params, limit, offset) as ImageRecord[];

    return {
      images,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single image by ID
   */
  static getImageById(id: string): ImageRecord | null {
    const query = `
      SELECT 
        i.id,
        i.telegram_file_id,
        i.telegram_file_unique_id,
        i.filename,
        i.mime_type,
        i.file_size,
        i.album_id,
        a.name as album_name,
        i.upload_date,
        i.telegram_message_id,
        i.telegram_chat_id,
        i.status,
        i.created_at
      FROM images i
      LEFT JOIN albums a ON i.album_id = a.id
      WHERE i.id = ?
    `;
    const image = db.prepare(query).get(id) as ImageRecord | undefined;
    return image || null;
  }

  /**
   * Create an image record
   */
  static createImage(data: {
    id: string;
    telegram_file_id: string;
    telegram_file_unique_id: string;
    filename: string;
    mime_type: string;
    file_size: number;
    album_id?: string | null;
    upload_date: string;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
  }): ImageRecord {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO images (
        id,
        telegram_file_id,
        telegram_file_unique_id,
        filename,
        mime_type,
        file_size,
        album_id,
        upload_date,
        telegram_message_id,
        telegram_chat_id,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `;

    db.prepare(query).run(
      data.id,
      data.telegram_file_id,
      data.telegram_file_unique_id,
      data.filename,
      data.mime_type,
      data.file_size,
      data.album_id || null,
      data.upload_date || now,
      data.telegram_message_id || null,
      data.telegram_chat_id || null,
      now
    );

    return this.getImageById(data.id)!;
  }

  /**
   * Delete image from database
   */
  static deleteImage(id: string): boolean {
    const result = db.prepare('DELETE FROM images WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Bulk delete images
   */
  static bulkDelete(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM images WHERE id IN (${placeholders})`).run(...ids);
    return result.changes;
  }

  /**
   * Assign multiple images to an album (or unassign if albumId is null)
   */
  static bulkAssignAlbum(ids: string[], albumId: string | null): number {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`UPDATE images SET album_id = ? WHERE id IN (${placeholders})`).run(albumId, ...ids);
    return result.changes;
  }

  /**
   * Get dashboard statistics from actual database records
   */
  static getDashboardStats(): {
    totalPhotos: number;
    totalAlbums: number;
    recentUploadsCount: number;
    totalStorageBytes: number;
    recentPhotos: ImageRecord[];
    recentJobs: any[];
  } {
    const totalPhotos = (db.prepare("SELECT COUNT(*) as count FROM images WHERE status = 'active'").get() as { count: number }).count;
    const totalAlbums = (db.prepare('SELECT COUNT(*) as count FROM albums').get() as { count: number }).count;
    
    // Recent uploads in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentUploadsCount = (db.prepare('SELECT COUNT(*) as count FROM images WHERE created_at >= ?').get(oneDayAgo) as { count: number }).count;

    // Total storage of indexed files
    const storageRow = db.prepare("SELECT SUM(file_size) as total_size FROM images WHERE status = 'active'").get() as { total_size: number | null };
    const totalStorageBytes = storageRow?.total_size || 0;

    // Recent 6 photos
    const recentPhotos = db.prepare(`
      SELECT 
        i.id,
        i.telegram_file_id,
        i.telegram_file_unique_id,
        i.filename,
        i.mime_type,
        i.file_size,
        i.album_id,
        a.name as album_name,
        i.upload_date,
        i.created_at
      FROM images i
      LEFT JOIN albums a ON i.album_id = a.id
      WHERE i.status = 'active'
      ORDER BY i.created_at DESC
      LIMIT 8
    `).all() as ImageRecord[];

    // Recent upload jobs
    const recentJobs = db.prepare(`
      SELECT id, filename, status, error_message, file_size, created_at, completed_at
      FROM upload_jobs
      ORDER BY created_at DESC
      LIMIT 6
    `).all();

    return {
      totalPhotos,
      totalAlbums,
      recentUploadsCount,
      totalStorageBytes,
      recentPhotos,
      recentJobs,
    };
  }
}
