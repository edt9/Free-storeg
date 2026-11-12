export interface ImageRecord {
  id: string;
  telegram_file_id?: string;
  telegram_file_unique_id?: string;
  filename: string;
  mime_type: string;
  file_size: number;
  album_id: string | null;
  album_name?: string | null;
  upload_date: string;
  telegram_message_id?: number | null;
  telegram_chat_id?: string | null;
  status: string;
  created_at: string;
}

export interface AlbumRecord {
  id: string;
  name: string;
  description: string | null;
  photo_count: number;
  cover_image_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalPhotos: number;
  totalAlbums: number;
  recentUploadsCount: number;
  totalStorageBytes: number;
  telegramConfigured: boolean;
  recentPhotos: ImageRecord[];
  recentJobs: UploadJobRecord[];
}

export interface UploadJobRecord {
  id: string;
  filename: string;
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'failed';
  error_message?: string | null;
  file_size?: number;
  created_at: string;
  completed_at?: string | null;
}

export interface TelegramStatusData {
  configured: boolean;
  connected: boolean;
  statusText: string;
  bot?: {
    username: string;
    firstName: string;
  };
  chat?: {
    title?: string;
    type?: string;
  };
  webhook?: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null;
  error?: string;
  message?: string;
}

export interface AppSettingsData {
  appName: string;
  subtitle: string;
  version: string;
  environment: string;
  maxFileSizeMb: number;
  maxUploadFiles: number;
  supportedFormats: string[];
  databasePath: string;
  telegram: {
    isConfigured: boolean;
    botTokenConfigured: boolean;
    chatIdConfigured: boolean;
    webhookSecretConfigured: boolean;
  };
}

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
  status: 'waiting' | 'uploading' | 'success' | 'failed';
  progress: number;
  error?: string;
}
