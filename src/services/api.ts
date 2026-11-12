import {
  ImageRecord,
  AlbumRecord,
  DashboardStats,
  TelegramStatusData,
  AppSettingsData,
} from '../types/index.ts';

class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Attach token header so iframe environments where cookies might be blocked work reliably
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('telecloud_session_token');
    if (token) {
      defaultHeaders['x-session-token'] = token;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string>),
    },
    credentials: 'same-origin',
  });


  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data?.code);
  }

  return data;
}

export const api = {
  // Images
  async getImages(params?: {
    search?: string;
    album_id?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    images: ImageRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.album_id) query.set('album_id', params.album_id);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any }>(`/api/images?${query.toString()}`);
    return res.data;
  },

  async getImage(id: string): Promise<ImageRecord> {
    const res = await request<{ success: boolean; data: ImageRecord }>(`/api/images/${id}`);
    return res.data;
  },

  async deleteImage(id: string): Promise<void> {
    await request(`/api/images/${id}`, { method: 'DELETE' });
  },

  async bulkDeleteImages(ids: string[]): Promise<number> {
    const res = await request<{ success: boolean; data: { deletedCount: number } }>('/api/images/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return res.data.deletedCount;
  },

  async bulkAssignAlbum(ids: string[], albumId: string | null): Promise<number> {
    const res = await request<{ success: boolean; data: { updatedCount: number } }>('/api/images/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ ids, album_id: albumId }),
    });
    return res.data.updatedCount;
  },

  async syncWithTelegram(): Promise<{ checked: number; removed: number; removedPhotos: string[] }> {
    const res = await request<{ success: boolean; data: { checked: number; removed: number; removedPhotos: string[] }; message: string }>('/api/images/sync', {
      method: 'POST',
    });
    return res.data;
  },


  // Upload
  async uploadPhotos(files: File[], albumId?: string | null): Promise<{ uploaded: ImageRecord[]; count: number }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });
    if (albumId) {
      formData.append('album_id', albumId);
    }

    const res = await request<{ success: boolean; data: { uploaded: ImageRecord[]; count: number } }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  // Albums
  async getAlbums(): Promise<AlbumRecord[]> {
    const res = await request<{ success: boolean; data: AlbumRecord[] }>('/api/albums');
    return res.data;
  },

  async createAlbum(name: string, description?: string): Promise<AlbumRecord> {
    const res = await request<{ success: boolean; data: AlbumRecord }>('/api/albums', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return res.data;
  },

  async updateAlbum(id: string, name: string, description?: string): Promise<AlbumRecord> {
    const res = await request<{ success: boolean; data: AlbumRecord }>(`/api/albums/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description }),
    });
    return res.data;
  },

  async deleteAlbum(id: string): Promise<void> {
    await request(`/api/albums/${id}`, { method: 'DELETE' });
  },

  // Dashboard & Search
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await request<{ success: boolean; data: DashboardStats }>('/api/dashboard/stats');
    return res.data;
  },

  async search(query: string): Promise<ImageRecord[]> {
    const res = await request<{ success: boolean; data: ImageRecord[] }>(`/api/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // Telegram
  async getTelegramStatus(): Promise<TelegramStatusData> {
    const res = await request<{ success: boolean; data: TelegramStatusData }>('/api/telegram/status');
    return res.data;
  },

  async testTelegramConfig(botToken: string, chatId?: string): Promise<{
    connected: boolean;
    bot?: { id: number; username: string; firstName: string };
    chat?: { id: string | number; title?: string };
    error?: string;
  }> {
    const res = await request<{ success: boolean; data: any; message: string }>('/api/telegram/test-config', {
      method: 'POST',
      body: JSON.stringify({ botToken, chatId }),
    });
    return res.data;
  },

  async saveTelegramConfig(botToken?: string, chatId?: string, webhookSecret?: string): Promise<void> {
    await request('/api/telegram/save-config', {
      method: 'POST',
      body: JSON.stringify({ botToken, chatId, webhookSecret }),
    });
  },

  async setupWebhook(webhookUrl: string, secretToken?: string): Promise<string> {
    const res = await request<{ success: boolean; message: string }>('/api/telegram/setup-webhook', {
      method: 'POST',
      body: JSON.stringify({ webhookUrl, secretToken }),
    });
    return res.message;
  },

  // Admin & Auth
  async login(password: string): Promise<{ token: string; user: { role: string } }> {
    const res = await request<{ success: boolean; data: any }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('telecloud_session_token', res.data.token);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('telecloud_session_token');
    }
    await request('/api/admin/logout', { method: 'POST' });
  },

  async getSession(): Promise<{ authenticated: boolean; user: { role: string } | null; token?: string }> {
    const res = await request<{ success: boolean; data: { authenticated: boolean; user: any; token?: string } }>('/api/admin/session');
    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('telecloud_session_token', res.data.token);
    }
    return res.data;
  },


  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getSettings(): Promise<AppSettingsData> {
    const res = await request<{ success: boolean; data: AppSettingsData }>('/api/admin/settings');
    return res.data;
  },
};
