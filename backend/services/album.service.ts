import crypto from 'crypto';
import { db } from '../database/connection.js';

export interface AlbumRecord {
  id: string;
  name: string;
  description: string | null;
  photo_count: number;
  cover_image_id?: string | null;
  created_at: string;
  updated_at: string;
}

export class AlbumService {
  /**
   * List all albums with real photo counts and real cover image ID
   */
  static listAlbums(): AlbumRecord[] {
    const albums = db.prepare(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        COUNT(i.id) as photo_count,
        (
          SELECT id 
          FROM images 
          WHERE album_id = a.id AND status = 'active' 
          ORDER BY upload_date DESC 
          LIMIT 1
        ) as cover_image_id
      FROM albums a
      LEFT JOIN images i ON a.id = i.album_id AND i.status = 'active'
      GROUP BY a.id
      ORDER BY a.name COLLATE NOCASE ASC
    `).all() as AlbumRecord[];

    return albums;
  }

  /**
   * Get single album by ID
   */
  static getAlbumById(id: string): AlbumRecord | null {
    const album = db.prepare(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        COUNT(i.id) as photo_count,
        (
          SELECT id 
          FROM images 
          WHERE album_id = a.id AND status = 'active' 
          ORDER BY upload_date DESC 
          LIMIT 1
        ) as cover_image_id
      FROM albums a
      LEFT JOIN images i ON a.id = i.album_id AND i.status = 'active'
      WHERE a.id = ?
      GROUP BY a.id
    `).get(id) as AlbumRecord | undefined;

    return album || null;
  }

  /**
   * Create a new album
   */
  static createAlbum(data: { name: string; description?: string }): AlbumRecord {
    if (!data.name || !data.name.trim()) {
      throw new Error('Album name is required.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO albums (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name.trim(), data.description ? data.description.trim() : null, now, now);

    return this.getAlbumById(id)!;
  }

  /**
   * Update album details
   */
  static updateAlbum(id: string, data: { name?: string; description?: string }): AlbumRecord | null {
    const existing = this.getAlbumById(id);
    if (!existing) return null;

    const newName = data.name !== undefined ? data.name.trim() : existing.name;
    const newDesc = data.description !== undefined ? data.description.trim() : existing.description;
    const now = new Date().toISOString();

    if (!newName) {
      throw new Error('Album name cannot be empty.');
    }

    db.prepare(`
      UPDATE albums
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(newName, newDesc, now, id);

    return this.getAlbumById(id);
  }

  /**
   * Delete an album without deleting photos (foreign key is ON DELETE SET NULL)
   */
  static deleteAlbum(id: string): boolean {
    const result = db.prepare('DELETE FROM albums WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
