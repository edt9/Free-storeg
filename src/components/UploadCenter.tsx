import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  FolderOpen,
  Send,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { AlbumRecord, UploadQueueItem, TelegramStatusData } from '../types/index.ts';
import { api } from '../services/api.ts';

interface UploadCenterProps {
  albums: AlbumRecord[];
  telegramStatus: TelegramStatusData | null;
  onNavigateToTelegram: () => void;
  onUploadCompleted: () => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const UploadCenter: React.FC<UploadCenterProps> = ({
  albums,
  telegramStatus,
  onNavigateToTelegram,
  onUploadCompleted,
  isAuthenticated,
  onRequireAuth,
  showToast,
}) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: UploadQueueItem[] = [];

    Array.from(files).forEach((file) => {
      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast('error', `"${file.name}" exceeds the 20MB limit.`);
        return;
      }

      // Validate MIME
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        showToast('error', `"${file.name}" is not a supported image format.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'waiting',
        progress: 0,
      });
    });

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => {
      prev.filter((i) => i.status === 'success').forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return prev.filter((i) => i.status !== 'success');
    });
  };

  // Process the queue
  const startUpload = async () => {
    if (!telegramStatus?.connected) {
      showToast('error', 'Cannot upload photos: Telegram bot is not connected. Configure credentials first.');
      return;
    }

    const pendingItems = queue.filter((item) => item.status === 'waiting' || item.status === 'failed');
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    // Process one by one or in small batches
    for (const item of pendingItems) {
      // Set to uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q))
      );

      try {
        await api.uploadPhotos([item.file], selectedAlbumId || undefined);

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'success', progress: 100 } : q))
        );
      } catch (err: any) {
        if (err.status === 401 || err.code === 'AUTH_REQUIRED' || err.message?.includes('Unauthorized')) {
          onRequireAuth();
        }
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'failed', progress: 0, error: err.message || 'Telegram upload failed.' }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    onUploadCompleted();
    showToast('success', 'Upload processing completed.');
  };

  const retrySingle = async (item: UploadQueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 40, error: undefined } : q))
    );

    try {
      await api.uploadPhotos([item.file], selectedAlbumId || undefined);
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'success', progress: 100 } : q))
      );
      onUploadCompleted();
      showToast('success', `Uploaded "${item.name}"`);
    } catch (err: any) {
      if (err.status === 401 || err.code === 'AUTH_REQUIRED' || err.message?.includes('Unauthorized')) {
        onRequireAuth();
      }
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: 'failed', progress: 0, error: err.message } : q
        )
      );
    }
  };


  const waitingCount = queue.filter((i) => i.status === 'waiting').length;
  const successCount = queue.filter((i) => i.status === 'success').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Upload Center</h2>
        <p className="text-xs text-slate-500">
          Upload original photographs to your private Telegram cloud storage with instant SQLite indexing
        </p>
      </div>

      {/* Telegram Connection Alert */}
      {!telegramStatus?.connected && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900">
                Telegram Bot Connection Required for Uploads
              </div>
              <div className="text-xs text-amber-700">
                Photos are stored in Telegram. Please configure and test your Bot Token and Chat ID to proceed.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToTelegram}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors whitespace-nowrap"
          >
            <span>Configure Telegram</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Album Selection for Ingestion */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">Assign to Album (Optional)</div>
            <div className="text-[11px] text-slate-500">
              Automatically tag newly uploaded photos into a selected collection
            </div>
          </div>
        </div>

        <select
          value={selectedAlbumId}
          onChange={(e) => setSelectedAlbumId(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 max-w-xs"
        >
          <option value="">No Album (Unassigned)</option>
          {albums.map((alb) => (
            <option key={alb.id} value={alb.id}>
              {alb.name}
            </option>
          ))}
        </select>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50 shadow-2xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-900">
          Drag and drop your photos here, or browse
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Supports JPEG, PNG, WebP, and GIF up to 20MB per photo. Multiple file selection is supported.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
        >
          <FileImage className="w-4 h-4" />
          <span>Select Photos</span>
        </button>
      </div>

      {/* Upload Queue Section */}
      {queue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">Upload Queue ({queue.length})</h3>
              <div className="flex items-center gap-2 text-[11px]">
                {waitingCount > 0 && (
                  <span className="text-slate-500">{waitingCount} waiting</span>
                )}
                {successCount > 0 && (
                  <span className="text-emerald-600 font-semibold">{successCount} uploaded</span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-600 font-semibold">{failedCount} failed</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {successCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={startUpload}
                disabled={isUploading || waitingCount + failedCount === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isUploading ? 'Uploading to Telegram...' : `Upload All (${waitingCount + failedCount})`}
                </span>
              </button>
            </div>
          </div>

          {/* Queue Items List */}
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {formatBytes(item.size)} · {item.type}
                    </div>

                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-3/4" />
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <div className="text-[11px] text-red-600 mt-0.5 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'waiting' && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                      Waiting
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider">
                      Uploading...
                    </span>
                  )}
                  {item.status === 'success' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <button
                      onClick={() => retrySingle(item)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      title="Retry upload"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}

                  {item.status !== 'uploading' && (
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
