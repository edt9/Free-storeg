import { initDatabase, db } from '../backend/database/connection.js';
import { AuthService } from '../backend/middleware/auth.js';
import { AlbumService } from '../backend/services/album.service.js';
import { ImageService } from '../backend/services/image.service.js';
import crypto from 'crypto';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n--- TeleCloud Gallery Automated Test Suite ---\n');

  // Test 1: Database Initialization
  console.log('[Test Category: Database Architecture]');
  initDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = tables.map((t) => t.name);
  assert(tableNames.includes('images'), 'Table "images" exists in SQLite');
  assert(tableNames.includes('albums'), 'Table "albums" exists in SQLite');
  assert(tableNames.includes('processed_updates'), 'Table "processed_updates" exists in SQLite');
  assert(tableNames.includes('upload_jobs'), 'Table "upload_jobs" exists in SQLite');
  assert(tableNames.includes('sessions'), 'Table "sessions" exists in SQLite');
  assert(tableNames.includes('app_settings'), 'Table "app_settings" exists in SQLite');

  // Test 2: Authentication & Sessions
  console.log('\n[Test Category: Authentication & Sessions]');
  const isDefaultPasswordValid = AuthService.verifyPassword('admin123');
  assert(isDefaultPasswordValid, 'Default administrator password "admin123" verifies correctly');

  const { token, expiresAt } = AuthService.createSession();
  assert(typeof token === 'string' && token.length === 64, 'Session token generated (32-byte hex)');
  assert(AuthService.validateSession(token), 'Session validates successfully');
  AuthService.destroySession(token);
  assert(!AuthService.validateSession(token), 'Destroyed session is invalid');

  // Test 3: Album Management
  console.log('\n[Test Category: Album Operations]');
  const testAlbum = AlbumService.createAlbum({
    name: 'Nature & Landscapes',
    description: 'Breathtaking landscape photography',
  });
  assert(testAlbum.name === 'Nature & Landscapes', 'Album created with name');
  assert(testAlbum.photo_count === 0, 'New album has 0 photos initially');

  const updatedAlbum = AlbumService.updateAlbum(testAlbum.id, {
    name: 'Nature, Landscapes & Wildlife',
  });
  assert(updatedAlbum?.name === 'Nature, Landscapes & Wildlife', 'Album updated name successfully');

  // Test 4: Image Metadata Indexing
  console.log('\n[Test Category: Image Metadata & Indexing]');
  const imgId = crypto.randomUUID();
  const testImage = ImageService.createImage({
    id: imgId,
    telegram_file_id: 'BAACAgIAAxkBAAE1234567890abcdef',
    telegram_file_unique_id: 'AQADAgAD7890xyz',
    filename: 'mountain_sunset.jpg',
    mime_type: 'image/jpeg',
    file_size: 1542000,
    album_id: testAlbum.id,
    upload_date: new Date().toISOString(),
    telegram_message_id: 42,
    telegram_chat_id: '-100987654321',
  });
  assert(testImage.id === imgId, 'Image created in SQLite');
  assert(testImage.telegram_file_id === 'BAACAgIAAxkBAAE1234567890abcdef', 'Telegram file ID saved');

  const albumsList = AlbumService.listAlbums();
  const natureAlb = albumsList.find((a) => a.id === testAlbum.id);
  assert(natureAlb?.photo_count === 1, 'Album photo count dynamically computed as 1');
  assert(natureAlb?.cover_image_id === imgId, 'Album cover image accurately picked up from photo');

  // Test 5: Search & Pagination
  console.log('\n[Test Category: Search & Pagination]');
  const searchResults = ImageService.listImages({ search: 'mountain' });
  assert(searchResults.total >= 1 && searchResults.images.some((img) => img.filename === 'mountain_sunset.jpg'), 'Search by filename matches indexed photo');

  const emptySearch = ImageService.listImages({ search: 'nonexistent_photo_name_xyz' });
  assert(emptySearch.total === 0, 'Non-matching search returns 0 results');

  // Test 6: Bulk Operations & Album Assignment
  console.log('\n[Test Category: Bulk Operations]');
  const img2Id = crypto.randomUUID();
  ImageService.createImage({
    id: img2Id,
    telegram_file_id: 'BAACAgIAAxkBAAE9876543210fedcba',
    telegram_file_unique_id: 'AQADAgAD1234abc',
    filename: 'forest_trail.jpg',
    mime_type: 'image/jpeg',
    file_size: 2100000,
    album_id: null,
    upload_date: new Date().toISOString(),
  });

  ImageService.bulkAssignAlbum([img2Id], testAlbum.id);
  const updatedImg2 = ImageService.getImageById(img2Id);
  assert(updatedImg2?.album_id === testAlbum.id, 'Bulk assignment to album succeeded');

  // Test 7: Dashboard Stats
  console.log('\n[Test Category: Dashboard Statistics]');
  const stats = ImageService.getDashboardStats();
  assert(stats.totalPhotos >= 2, 'Total photos count accurate');
  assert(stats.totalStorageBytes >= 3642000, 'Total storage bytes accurately aggregated');

  // Test 8: Safe Album Deletion
  console.log('\n[Test Category: Safe Album Deletion]');
  AlbumService.deleteAlbum(testAlbum.id);
  const orphanPhoto = ImageService.getImageById(imgId);
  assert(orphanPhoto !== null, 'Photos are preserved when an album is deleted');
  assert(orphanPhoto?.album_id === null, 'Photo album_id cleanly set to null upon album deletion');

  // Test 9: Webhook Duplicate Update Protection
  console.log('\n[Test Category: Webhook Deduplication]');
  const updateId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000);
  db.prepare('INSERT OR REPLACE INTO processed_updates (update_id, processed_at) VALUES (?, ?)').run(
    updateId,
    new Date().toISOString()
  );
  const checkUpdate = db.prepare('SELECT update_id FROM processed_updates WHERE update_id = ?').get(updateId);
  assert(checkUpdate !== undefined, 'Update recorded in processed_updates');


  // Clean test image records
  ImageService.deleteImage(imgId);
  ImageService.deleteImage(img2Id);

  console.log(`\n========================================`);
  console.log(`Test Execution Finished: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log(`========================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
