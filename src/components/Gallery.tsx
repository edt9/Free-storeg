import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  UploadCloud,
  Download,
  Trash2,
  FolderInput,
  CheckSquare,
  Square,
  Images,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  RotateCcw,
} from 'lucide-react';
import { ImageRecord, AlbumRecord } from '../types/index.ts';
import { api } from '../services/api.ts';

interface GalleryProps {
  initialSearchQuery?: string;
  albums: AlbumRecord[];
  onUploadClick: () => void;
  onPreviewPhoto: (photo: ImageRecord) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const Gallery: React.FC<GalleryProps> = ({
  initialSearchQuery = '',
  albums,
  onUploadClick,
  onPreviewPhoto,
  isAuthenticated,
  onRequireAuth,
  showToast,
}) => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [search, setSearch] = useState(initialSearchQuery);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlbumMoveModal, setShowAlbumMoveModal] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState<string>('');

  // Single delete target
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Sync initialSearchQuery if passed from top header
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearch(initialSearchQuery);
      setCurrentPage(1);
    }
  }, [initialSearchQuery]);

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const data = await api.getImages({
        search: search.trim() || undefined,
        album_id: selectedAlbum === 'all' ? undefined : selectedAlbum,
        sort: sortOrder,
        page: currentPage,
        limit: pageSize,
      });

      setImages(data.images);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSelectedIds(new Set()); // reset selection on page change
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch photos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [currentPage, pageSize, selectedAlbum, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPhotos();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Selection handlers
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length && images.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with Telegram (removes photos that were deleted directly on Telegram)
  const handleSyncTelegram = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncWithTelegram();
      if (res.removed > 0) {
        showToast('success', `Cleaned up ${res.removed} photo(s) that were deleted on Telegram.`);
        fetchPhotos();
      } else {
        showToast('info', 'All indexed photos are in sync with Telegram.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to sync with Telegram.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete single photo from website and Telegram
  const handleDeleteSingle = async (id: string) => {
    try {
      await api.deleteImage(id);
      showToast('success', 'Photo successfully deleted from website and Telegram.');
      setDeleteTargetId(null);
      fetchPhotos();
    } catch (err: any) {
      if (err.status === 401 || err.code === 'AUTH_REQUIRED') {
        onRequireAuth();
      }
      showToast('error', err.message || 'Failed to delete photo.');
    }
  };

  // Bulk Delete from website and Telegram
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);

    try {
      const count = await api.bulkDeleteImages(Array.from(selectedIds));
      showToast('success', `Successfully deleted ${count} photo(s) from website and Telegram.`);
      setShowDeleteConfirm(false);
      setSelectedIds(new Set());
      fetchPhotos();
    } catch (err: any) {
      if (err.status === 401 || err.code === 'AUTH_REQUIRED') {
        onRequireAuth();
      }
      showToast('error', err.message || 'Failed to delete selected photos.');
    } finally {
      setIsDeletingBulk(false);
    }
  };


  // Bulk Move to Album
  const handleBulkAssignAlbum = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (selectedIds.size === 0) return;
    try {
      const albumVal = targetAlbumId === 'unassigned' ? null : targetAlbumId;
      await api.bulkAssignAlbum(Array.from(selectedIds), albumVal);
      showToast('success', `Assigned ${selectedIds.size} photo(s) to album.`);
      setShowAlbumMoveModal(false);
      setSelectedIds(new Set());
      fetchPhotos();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to assign album.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">All Photos</h2>
          <p className="text-xs text-slate-500">
            Browse and manage your stored photographs ({total} total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTelegram}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
            title="Check Telegram and remove photos that were deleted directly on Telegram"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Telegram'}</span>
          </button>

          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>
        </div>

      </div>

      {/* Filter and Control Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search & Album Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAlbum}
              onChange={(e) => {
                setSelectedAlbum(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Albums</option>
              <option value="unassigned">Unassigned Only</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.name} ({alb.photo_count})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Filename A-Z</option>
              <option value="size">Largest Size</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle & Select All */}
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              {selectedIds.size === images.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{selectedIds.size === images.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {selectedIds.size}
            </span>
            <span>photo(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlbumMoveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Assign to Album</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-200/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        /* Empty State */
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Images className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No photos found</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {search || selectedAlbum !== 'all'
                ? 'Try adjusting your search query or album filter to find what you are looking for.'
                : 'Your cloud gallery is empty. Upload high-resolution photos to Telegram to see them here.'}
            </p>
          </div>
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Your First Photo</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((photo) => {
            const isSelected = selectedIds.has(photo.id);
            return (
              <div
                key={photo.id}
                onClick={() => onPreviewPhoto(photo)}
                className={`group relative bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Photo Image with Aspect Ratio */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={`/api/images/${photo.id}/file`}
                    alt={photo.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Selection Checkbox (always visible on top left or hover) */}
                  <div
                    onClick={(e) => toggleSelect(photo.id, e)}
                    className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white/80 backdrop-blur-xs text-slate-600 opacity-0 group-hover:opacity-100 border border-slate-200'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>

                  {/* Top-Right Quick Action Hover Bar */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`/api/images/${photo.id}/file?download=1`}
                      onClick={(e) => e.stopPropagation()}
                      download={photo.filename}
                      title="Download full resolution photo"
                      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200 shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(photo.id);
                      }}
                      title="Delete photo"
                      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 hover:text-red-600 hover:bg-white border border-slate-200 shadow-2xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo Card Bottom Details */}
                <div className="p-3 bg-white flex flex-col justify-between flex-1 gap-1">
                  <div className="text-xs font-semibold text-slate-900 truncate" title={photo.filename}>
                    {photo.filename}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{new Date(photo.upload_date).toLocaleDateString()}</span>
                    <span className="font-mono">{formatBytes(photo.file_size)}</span>
                  </div>
                  {photo.album_name && (
                    <div className="mt-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate inline-block max-w-full">
                        {photo.album_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button onClick={toggleSelectAll} className="p-0.5">
                    {selectedIds.size === images.length && images.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 w-16">Preview</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Album</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {images.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <tr
                    key={photo.id}
                    onClick={() => onPreviewPhoto(photo)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4" onClick={(e) => toggleSelect(photo.id, e)}>
                      <button className="p-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={`/api/images/${photo.id}/file`}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                      {photo.filename}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {photo.album_name ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium">
                          {photo.album_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{formatBytes(photo.file_size)}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(photo.upload_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onPreviewPhoto(photo)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/images/${photo.id}/file?download=1`}
                          download={photo.filename}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setDeleteTargetId(photo.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span> photos
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value={15}>15 per page</option>
              <option value={30}>30 per page</option>
              <option value={60}>60 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Photo?</h4>
                <p className="text-xs text-slate-500">This photo will be permanently deleted from both the website and your Telegram chat.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSingle(deleteTargetId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
              >
                Delete Everywhere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete {selectedIds.size} Photos?</h4>
                <p className="text-xs text-slate-500">
                  This will permanently delete the selected photos from both the website and your Telegram chat.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
              >
                {isDeletingBulk ? 'Deleting...' : 'Delete Everywhere'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Album Modal */}
      {showAlbumMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FolderInput className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Assign to Album</h4>
                <p className="text-xs text-slate-500">Move {selectedIds.size} selected photo(s)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Choose Target Album</label>
              <select
                value={targetAlbumId}
                onChange={(e) => setTargetAlbumId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select an album --</option>
                <option value="unassigned">Unassigned (Remove from album)</option>
                {albums.map((alb) => (
                  <option key={alb.id} value={alb.id}>
                    {alb.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAlbumMoveModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignAlbum}
                disabled={!targetAlbumId}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
