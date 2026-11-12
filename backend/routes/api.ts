import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { handleUpload } from '../controllers/upload.controller.js';
import {
  getImages,
  getImageById,
  streamImageFile,
  deleteImage,
  bulkDeleteImages,
  bulkAssignAlbum,
  syncTelegramDeletions,
  searchImages,
  getDashboardStats,
} from '../controllers/image.controller.js';
import {
  getAlbums,
  getAlbumById,
  createAlbum,
  updateAlbum,
  deleteAlbum,
} from '../controllers/album.controller.js';
import {
  getTelegramStatus,
  testTelegramConfig,
  saveTelegramConfig,
  setupWebhook,
  handleTelegramWebhook,
} from '../controllers/telegram.controller.js';
import {
  login,
  logout,
  getSession,
  changePassword,
  getSettings,
} from '../controllers/admin.controller.js';

const router = Router();

// Multer memory storage (keeps in memory buffer, never writes permanently to disk)
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 20);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: 10,
  },
});

// Uploads
router.post('/upload', requireAuth, upload.array('photos', 10), handleUpload);

// Images
router.get('/images', getImages);
router.get('/images/:id', getImageById);
router.get('/images/:id/file', streamImageFile);
router.delete('/images/:id', requireAuth, deleteImage);
router.post('/images/bulk-delete', requireAuth, bulkDeleteImages);
router.post('/images/bulk-assign', requireAuth, bulkAssignAlbum);
router.post('/images/sync', requireAuth, syncTelegramDeletions);


// Albums
router.get('/albums', getAlbums);
router.get('/albums/:id', getAlbumById);
router.post('/albums', requireAuth, createAlbum);
router.patch('/albums/:id', requireAuth, updateAlbum);
router.delete('/albums/:id', requireAuth, deleteAlbum);

// Search & Stats
router.get('/search', searchImages);
router.get('/dashboard/stats', getDashboardStats);

// Telegram integration
router.get('/telegram/status', getTelegramStatus);
router.post('/telegram/test-config', testTelegramConfig);
router.post('/telegram/save-config', requireAuth, saveTelegramConfig);
router.post('/telegram/setup-webhook', requireAuth, setupWebhook);
router.post('/telegram/webhook', handleTelegramWebhook);

// Admin & Auth
router.post('/admin/login', login);
router.post('/admin/logout', logout);
router.get('/admin/session', getSession);
router.post('/admin/change-password', requireAuth, changePassword);
router.get('/admin/settings', getSettings);

export default router;
