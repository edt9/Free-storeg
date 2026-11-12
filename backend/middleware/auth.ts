import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, getSetting, setSetting } from '../database/connection.js';

export interface AdminSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export class AuthService {
  /**
   * Verify an admin password against env hash or SQLite stored hash (default: admin123)
   */
  static verifyPassword(password: string): boolean {
    const envHash = process.env.ADMIN_PASSWORD_HASH;
    const dbHash = getSetting('admin_password_hash', '');
    const activeHash = envHash || dbHash;

    if (!activeHash) {
      // Default initial password is admin123 if unconfigured
      return password === 'admin123';
    }

    try {
      return bcrypt.compareSync(password, activeHash);
    } catch {
      return false;
    }
  }

  /**
   * Hash a new password and save it into SQLite settings
   */
  static setAdminPassword(newPassword: string): void {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    setSetting('admin_password_hash', hash);
  }

  /**
   * Create a new session in database
   */
  static createSession(): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    // 7 days expiration
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, 'admin', now.toISOString(), expiresAt.toISOString());

    return { token, expiresAt };
  }

  /**
   * Validate a session token
   */
  static validateSession(token: string): boolean {
    if (!token) return false;

    const row = db.prepare(`
      SELECT token, user_id, expires_at
      FROM sessions
      WHERE token = ?
    `).get(token) as { token: string; user_id: string; expires_at: string } | undefined;

    if (!row) return false;

    if (new Date(row.expires_at).getTime() < Date.now()) {
      // Session expired, clean it up
      this.destroySession(token);
      return false;
    }

    return true;
  }

  /**
   * Remove a session
   */
  static destroySession(token: string): void {
    if (!token) return;
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  /**
   * Clean expired sessions periodically
   */
  static purgeExpiredSessions(): void {
    const now = new Date().toISOString();
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  }
}

/**
 * Express middleware to enforce admin authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.telecloud_session || req.headers['x-session-token'];

  if (token && AuthService.validateSession(String(token))) {
    return next();
  }

  // If no custom password hash has been configured yet, allow seamless access
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  const dbHash = getSetting('admin_password_hash', '');
  if (!envHash && !dbHash) {
    return next();
  }

  res.status(401).json({
    success: false,
    message: 'Unauthorized: Administrator authentication required.',
    code: 'AUTH_REQUIRED',
  });
}

/**
 * Express middleware to attach auth status to req without blocking
 */
export function checkAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.telecloud_session || req.headers['x-session-token'];
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  const dbHash = getSetting('admin_password_hash', '');
  const hasCustomPassword = Boolean(envHash || dbHash);

  const isValid = Boolean(token && AuthService.validateSession(String(token)));
  (req as any).isAuthenticated = isValid || !hasCustomPassword;
  next();
}

