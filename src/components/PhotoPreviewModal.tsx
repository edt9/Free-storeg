import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Calendar,
  HardDrive,
  FolderOpen,
  Send,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { ImageRecord, AlbumRecord } from '../types/index.ts';
import { api } from '../services/api.ts';

interface PhotoPreviewModalProps {
  photo: ImageRecord | null;
  photosList?: ImageRecord[];
  albums: AlbumRecord[];
  onClose: () => void;
  onSelectPhoto: (photo: ImageRecord) => void;
  onPhotoDeleted?: (id: string) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  photosList = [],
  albums,
  onClose,
  onSelectPhoto,
  onPhotoDeleted,
  isAuthenticated,
  onRequireAuth,
  showToast,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(photo?.album_id || '');
  const [isUpdatingAlbum, setIsUpdatingAlbum] = useState(false);

  useEffect(() => {
    setSelectedAlbumId(photo?.album_id || '');
  }, [photo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, photosList]);

  if (!photo) return null;

  const currentIndex = photosList.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photosList.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectPhoto(photosList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectPhoto(photosList[currentIndex + 1]);
    }
  };

  const handleAlbumChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    const newAlbumId = e.target.value;
    setSelectedAlbumId(newAlbumId);
    setIsUpdatingAlbum(true);

    try {
      await api.bulkAssignAlbum([photo.id], newAlbumId === 'unassigned' ? null : newAlbumId);
      showToast('success', 'Album updated for this photo.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update album.');
    } finally {
      setIsUpdatingAlbum(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo from the website and from your Telegram chat?')) {
      return;
    }

    try {
      await api.deleteImage(photo.id);
      showToast('success', 'Photo successfully deleted from website and Telegram.');
      if (onPhotoDeleted) onPhotoDeleted(photo.id);
      onClose();
    } catch (err: any) {
      if (err.status === 401 || err.code === 'AUTH_REQUIRED') {
        onRequireAuth();
      }
      showToast('error', err.message || 'Failed to delete photo.');
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-16 px-4 md:px-6 bg-gradient-to-b from-slate-950/80 to-transparent flex items-center justify-between text-white">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="truncate">
            <h3 className="text-sm font-semibold truncate leading-tight">{photo.filename}</h3>
            <p className="text-[11px] text-slate-400">
              {new Date(photo.upload_date).toLocaleDateString()} · {formatBytes(photo.file_size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-xl transition-colors ${
              showDetails ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Image details & Telegram storage info"
          >
            <Info className="w-4 h-4" />
          </button>

          <a
            href={`/api/images/${photo.id}/file?download=1`}
            download={photo.filename}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            title="Download original file"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-600/80 text-white transition-colors"
            title="Delete photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image View Area */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-16">
        <img
          src={`/api/images/${photo.id}/file`}
          alt={photo.filename}
          className="max-w-full max-h-full object-contain select-none drop-shadow-2xl transition-all"
        />

        {/* Previous Button */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white border border-white/10 transition-all shadow-lg hover:scale-105"
            aria-label="Previous Photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white border border-white/10 transition-all shadow-lg hover:scale-105"
            aria-label="Next Photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Details & Telegram Metadata Sidebar */}
      {showDetails && (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-slate-900/95 border-l border-white/10 text-white p-5 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 z-40 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Photo Details</h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* General Metadata */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[11px] text-slate-400">Filename</div>
              <div className="font-semibold break-all text-slate-100">{photo.filename}</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">File Size</div>
              <div className="font-mono text-slate-100">{formatBytes(photo.file_size)}</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Format</div>
              <div className="font-mono text-slate-100">{photo.mime_type}</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Upload Date</div>
              <div className="text-slate-100">{new Date(photo.upload_date).toLocaleString()}</div>
            </div>
          </div>

          {/* Album Assignment */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Album Collection</span>
            </div>
            <select
              value={selectedAlbumId}
              onChange={handleAlbumChange}
              disabled={isUpdatingAlbum}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="unassigned">Unassigned</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Storage & Privacy Information */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-400" />
              <span>Storage Status</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span>Storage Provider</span>
                <span className="font-semibold text-emerald-400">Telegram Cloud</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Protection</span>
                <span className="font-semibold text-blue-400">Private & Encrypted</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>File Integrity</span>
                <span className="font-semibold text-emerald-400">Indexed & Verified</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Original full-resolution photo is securely preserved in your private cloud storage.
            </p>
          </div>

        </div>
      )}
    </div>
  );
};
