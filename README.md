# TeleCloud Gallery – Free Clouds to Save Photos
> Professional Telegram-Powered Cloud Photo Management Platform

TeleCloud Gallery is an open-source personal cloud photo management platform that utilizes Telegram Bot API as an unlimited, free photo storage backplane paired with a high-speed SQLite indexing database and an enterprise-grade React SaaS management dashboard.

---

## 1. System Architecture

```
                    +-------------------------------------------------+
                    |               Web & Mobile Client               |
                    |   (React 19, Tailwind CSS, Lucide Icons, Vite)   |
                    +-----------------------+-------------------------+
                                            |
                              HTTP / REST JSON & Form-Data
                                            |
                                            v
                    +-------------------------------------------------+
                    |              Node.js Express Server             |
                    |         (Authentication, Rate Limiting)         |
                    +-----------------------+-------------------------+
                               /                         \
         Metadata Indexing & Relations             Streaming Proxy & Uploads
                             /                             \
                            v                               v
             +-----------------------------+     +--------------------+
             |     SQLite Database (WAL)   |     |  Telegram Bot API  |
             |   - images                  |     |  - sendPhoto       |
             |   - albums                  |     |  - getFile         |
             |   - upload_jobs             |     |  - deleteMessage   |
             |   - processed_updates       |     |  - setWebhook      |
             |   - sessions                |     +---------+----------+
             +-----------------------------+               |
                                                           v
                                              +-------------------------+
                                              | Private Telegram Chat / |
                                              | Channel (Cloud Storage) |
                                              +-------------------------+
```

### Core Architectural Principles
1. **Telegram is the Primary Image Storage Provider:** Original high-resolution photo binaries are sent directly to your configured private Telegram chat or channel via `sendPhoto`.
2. **SQLite is the Fast Metadata & Indexing Engine:** Only metadata, dimensions, dates, album associations, and Telegram `file_id` / `file_unique_id` are saved in SQLite.
3. **Zero Permanent Binary Disk Storage on Server:** Downloaded images are streamed on-demand directly from Telegram to the client via `GET /api/images/:id/file`.
4. **Token Security:** The Telegram Bot Token is never exposed to client browsers. All communication is routed through server-side proxy handlers.
5. **Session-Secured Administration:** Sensitive actions (uploads, deletions, album alterations, password changes) require administrator authentication with bcrypt password verification.

---

## 2. Key Features

- **Executive SaaS Dashboard:** Real-time database metrics (Total Photos, Albums, 24h Uploads, Telegram connectivity), storage payload calculations, recent upload jobs, and gallery preview.
- **Responsive Photo Gallery:**
  - Responsive CSS Grid (2-column mobile, 3-column tablet, 4-5 column desktop) and dense List Table view.
  - Live server-side debounced search by filename and album name.
  - Multi-selection with bulk deletion and bulk album assignment.
  - Date and size sorting, album filtering, and configurable pagination (15, 30, 60 photos per page).
- **Full-Screen Photo Viewer:**
  - High-resolution modal with neutral dark backdrop.
  - Keyboard navigation: `Escape` to close, `ArrowLeft` / `ArrowRight` to navigate photos.
  - Metadata drawer showing Telegram File ID, Unique ID, Message ID, and Target Chat ID.
  - Single-click attachment download.
- **Dedicated Upload Center:**
  - Drag-and-drop zone with instant file validation (JPEG, PNG, WebP, GIF up to 20MB).
  - Magic byte file signature verification to block disguised or corrupted binaries.
  - Real-time queue table with progress indicators, status badges, retry actions, and album selection.
- **Album Management:**
  - Create, rename, edit description, and delete albums.
  - Dynamic cover preview sourced from the latest indexed photo in the album.
  - Safe deletion: deleting an album never deletes photos (photos remain unassigned in All Photos).
- **Telegram Connection Hub & Diagnostics:**
  - Live connection status check verifying both Bot Token (`getMe`) and Target Chat ID (`getChat`).
  - Interactive credential tester directly from the UI.
  - Webhook registration for direct ingestion when messaging the bot from Telegram apps.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Motion.
- **Backend:** Node.js, Express.js, TypeScript (`tsx`).
- **Database:** SQLite (`better-sqlite3`) with WAL journal mode and foreign key constraints.
- **File Ingestion:** Multer (in-memory buffer processing, zero disk remnants).
- **Security:** HTTP-only cookies, bcryptjs password hashing, magic byte file inspection.

---

## 4. Setup and Installation

### Prerequisites
- Node.js 18.0.0 or higher.
- A Telegram account.

### Step 1: Create a Telegram Bot
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Follow the instructions to choose a name and username (ending in `bot`).
4. Copy the HTTP API token (e.g. `7123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### Step 2: Create a Target Chat
1. Create a private Channel or Group on Telegram.
2. Add your newly created bot to the chat as an **Administrator** with permission to **Post Messages**.
3. Determine your Chat ID:
   - For Channels, it usually starts with `-100...`.
   - Forward any message from the channel to `@userinfobot` or `@RawDataBot` to find your Chat ID.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate the values:
```env
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_telegram_chat_id"
TELEGRAM_WEBHOOK_SECRET="optional_random_secret"
ADMIN_PASSWORD_HASH=""
SESSION_SECRET="your_custom_session_secret_32_chars"
PORT=3000
DATABASE_PATH="./data/telecloud.db"
MAX_FILE_SIZE_MB=20
MAX_UPLOAD_FILES=10
APP_BASE_URL="http://localhost:3000"
NODE_ENV="production"
```
*(Note: You can also configure or update Telegram credentials directly in the app's **Telegram Connection** UI at any time).*

### Step 4: Install Dependencies & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run for production
npm run build
npm start
```

Access the application in your browser at `http://localhost:3000`.

---

## 5. Administrator Access

- **Default Administrator Password:** `admin123` (if `ADMIN_PASSWORD_HASH` is not pre-set in `.env`).
- **Changing Password:** Click on **Settings** or the bottom profile card in the sidebar, sign in, and update your administrator password in the **Administrator Security** section.

---

## 6. REST API Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/upload` | Yes | Upload 1-10 photos to Telegram and index in SQLite |
| `GET` | `/api/images` | No | List photos with pagination, search, album, and sorting |
| `GET` | `/api/images/:id` | No | Retrieve single photo metadata |
| `GET` | `/api/images/:id/file` | No | Stream binary photo directly from Telegram proxy |
| `DELETE` | `/api/images/:id` | Yes | Delete photo record from library index |
| `POST` | `/api/images/bulk-delete` | Yes | Delete multiple photos by array of IDs |
| `POST` | `/api/images/bulk-assign` | Yes | Assign multiple photos to an album |
| `GET` | `/api/albums` | No | List albums with photo counts and cover IDs |
| `GET` | `/api/albums/:id` | No | Retrieve album by ID |
| `POST` | `/api/albums` | Yes | Create a new album |
| `PATCH` | `/api/albums/:id` | Yes | Update album name or description |
| `DELETE` | `/api/albums/:id` | Yes | Delete album (photos remain unassigned) |
| `GET` | `/api/search?q=` | No | Search photos across filenames and album titles |
| `GET` | `/api/dashboard/stats` | No | Retrieve dashboard counts and storage stats |
| `GET` | `/api/telegram/status` | No | Check live connectivity to Telegram Bot API |
| `POST` | `/api/telegram/test-config` | No | Test specific credentials live against Telegram |
| `POST` | `/api/telegram/save-config` | Yes | Persist bot token & chat ID to SQLite settings |
| `POST` | `/api/telegram/setup-webhook` | Yes | Register webhook with Telegram API |
| `POST` | `/api/telegram/webhook` | Verified | Ingest photos sent directly to the bot |
| `POST` | `/api/admin/login` | No | Authenticate admin, sets HTTP-only cookie |
| `POST` | `/api/admin/logout` | No | Clear session cookie and invalidate token |
| `GET` | `/api/admin/session` | No | Check authentication status |
| `POST` | `/api/admin/change-password` | Yes | Update administrator password hash |
| `GET` | `/api/admin/settings` | No | Retrieve application policies (redacted tokens) |
| `GET` | `/health` | No | Health check probing SQLite and server uptime |

---

## 7. Persistent Storage & Backup Strategy

1. **Persistent Volume Requirement:**
   When hosting on containerized platforms (Docker, Kubernetes, Fly.io, Railway, Render), ensure the directory containing SQLite (`./data` or your custom `DATABASE_PATH`) is mounted on a **Persistent Disk Volume**.
2. **Backups:**
   Regularly backup `./data/telecloud.db` using standard SQLite backup routines:
   ```bash
   sqlite3 ./data/telecloud.db ".backup ./data/telecloud_backup_$(date +%F).db"
   ```
3. **Disaster Recovery:**
   If the server's disk is reset without a persistent volume, the photos in your Telegram chat remain intact, but the SQLite index must be rebuilt.

---

## 8. Telegram Bot API Limitations & Notes

- **Photo Ingestion Size:** Telegram Bot API supports photo sending up to 20MB for images.
- **Historical Chat Enumeration:** The Telegram Bot API does **not** allow bots to list or read past historical messages sent before the bot was invited to the chat. To index existing photo archives, send or forward the photos to the bot while the Webhook is registered, or use TeleCloud's Upload Center.
