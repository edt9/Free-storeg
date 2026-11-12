import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Images,
  Folder,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { AlbumRecord } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AlbumsViewProps {
  albums: AlbumRecord[];
  onRefreshAlbums: () => void;
  onOpenAlbum: (albumId: string) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  albums,
  onRefreshAlbums,
  onOpenAlbum,
  isAuthenticated,
  onRequireAuth,
  showToast,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumRecord | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<AlbumRecord | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!name.trim()) {
      showToast('error', 'Album name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createAlbum(name.trim(), description.trim() || undefined);
      showToast('success', 'Album created successfully.');
      setName('');
      setDescription('');
      setShowCreateModal(false);
      onRefreshAlbums();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create album.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!editingAlbum || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.updateAlbum(editingAlbum.id, name.trim(), description.trim() || undefined);
      showToast('success', 'Album updated successfully.');
      setEditingAlbum(null);
      setName('');
      setDescription('');
      onRefreshAlbums();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update album.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!deletingAlbum) return;

    try {
      await api.deleteAlbum(deletingAlbum.id);
      showToast('success', 'Album removed. Photos remain in your gallery.');
      setDeletingAlbum(null);
      onRefreshAlbums();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete album.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Albums</h2>
          <p className="text-xs text-slate-500">
            Organize your Telegram-stored photographs into collections ({albums.length} total)
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setDescription('');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Album</span>
        </button>
      </div>

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No albums yet</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Create an album to organize vacations, family events, or project portfolios.
            </p>
          </div>
          <button
            onClick={() => {
              setName('');
              setDescription('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Album</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => onOpenAlbum(album.id)}
              className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Cover Image Area */}
              <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                {album.cover_image_id ? (
                  <img
                    src={`/api/images/${album.cover_image_id}/file`}
                    alt={album.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2">
                    <Folder className="w-8 h-8 text-slate-300" />
                    <span className="text-[11px] font-medium">Empty Album</span>
                  </div>
                )}

                {/* Photo Count Chip */}
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                  <Images className="w-3.5 h-3.5" />
                  <span>{album.photo_count} photos</span>
                </div>

                {/* Edit / Delete Actions */}
                <div
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingAlbum(album);
                      setName(album.name);
                      setDescription(album.description || '');
                    }}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200 shadow-2xs transition-colors"
                    title="Edit Album"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAlbum(album)}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-red-600 hover:bg-white border border-slate-200 shadow-2xs transition-colors"
                    title="Delete Album"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Album Details */}
              <div className="p-4 space-y-1 flex-1">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {album.name}
                </h4>
                {album.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {album.description}
                  </p>
                )}
                <div className="pt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Created {new Date(album.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Create New Album</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Album Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Vacation 2026, Architecture..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short notes about this collection..."
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Album Modal */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Album</h3>
              </div>
              <button
                onClick={() => setEditingAlbum(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Album Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete "{deletingAlbum.name}"?</h4>
                <p className="text-xs text-slate-500">
                  Deleting this album will not delete its photos. Photos will remain safely in All Photos as unassigned.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingAlbum(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
              >
                Delete Album
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
