import { Request, Response } from 'express';
import { AuthService } from '../middleware/auth.js';
import { TelegramService } from '../services/telegram.service.js';
import { getSetting } from '../database/connection.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ success: false, message: 'Password is required.' });
      return;
    }

    const isValid = AuthService.verifyPassword(password);
    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid administrator password.' });
      return;
    }

    const { token, expiresAt } = AuthService.createSession();

    // Set secure HTTP-only cookie
    res.cookie('telecloud_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.json({
      success: true,
      data: {
        token, // also return token for header fallback
        expiresAt,
        user: { role: 'admin' },
      },
      message: 'Authentication successful.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Login failed.',
    });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.telecloud_session || req.headers['x-session-token'];
  if (token) {
    AuthService.destroySession(String(token));
  }
  res.clearCookie('telecloud_session');
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function getSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.telecloud_session || req.headers['x-session-token'];
  let isValid = Boolean(token && AuthService.validateSession(String(token)));

  const envHash = process.env.ADMIN_PASSWORD_HASH;
  const dbHash = getSetting('admin_password_hash', '');
  const hasCustomPassword = Boolean(envHash || dbHash);

  // If no custom password is set and user has no active session, auto-create a session
  if (!isValid && !hasCustomPassword) {
    const session = AuthService.createSession();
    res.cookie('telecloud_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
    });
    res.json({
      success: true,
      data: {
        authenticated: true,
        token: session.token,
        user: { role: 'admin' },
        defaultAuth: true,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      authenticated: isValid,
      token: isValid ? String(token) : undefined,
      user: isValid ? { role: 'admin' } : null,
      defaultAuth: !hasCustomPassword,
    },
  });
}


export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!AuthService.verifyPassword(currentPassword)) {
      res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      return;
    }

    AuthService.setAdminPassword(newPassword);

    res.json({
      success: true,
      message: 'Admin password successfully updated.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update password.',
    });
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const config = TelegramService.getConfig();
    const tokenPresent = Boolean(config.botToken);
    const chatIdPresent = Boolean(config.chatId);
    const webhookSecretPresent = Boolean(config.webhookSecret);

    res.json({
      success: true,
      data: {
        appName: 'TeleCloud Gallery',
        subtitle: 'Free Clouds to Save Photos',
        version: '1.2.0',
        environment: process.env.NODE_ENV || 'production',
        maxFileSizeMb: 20,
        maxUploadFiles: 10,
        supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF'],
        databasePath: './data/telecloud.db',
        telegram: {
          isConfigured: tokenPresent && chatIdPresent,
          botTokenConfigured: tokenPresent,
          chatIdConfigured: chatIdPresent,
          webhookSecretConfigured: webhookSecretPresent,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to load settings.',
    });
  }
}
