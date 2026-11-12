import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { Overview } from './components/Overview.tsx';
import { Gallery } from './components/Gallery.tsx';
import { UploadCenter } from './components/UploadCenter.tsx';
import { AlbumsView } from './components/AlbumsView.tsx';
import { TelegramSettings } from './components/TelegramSettings.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { PhotoPreviewModal } from './components/PhotoPreviewModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { api } from './services/api.ts';
import {
  DashboardStats,
  TelegramStatusData,
  AlbumRecord,
  ImageRecord,
} from './types/index.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string>('all');

  // Application Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusData | null>(null);
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Modals & Overlay States
  const [previewPhoto, setPreviewPhoto] = useState<ImageRecord | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Notification Helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth session
  const checkSession = async () => {
    try {
      const res = await api.getSession();
      setIsAuthenticated(res.authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  };

  // Fetch Telegram status
  const fetchTelegramStatus = async () => {
    try {
      const status = await api.getTelegramStatus();
      setTelegramStatus(status);
    } catch {
      // Safe fallback
    }
  };

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // Safe fallback
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Albums
  const fetchAlbums = async () => {
    try {
      const data = await api.getAlbums();
      setAlbums(data);
    } catch {
      // Safe fallback
    }
  };

  // Initial load
  useEffect(() => {
    checkSession();
    fetchTelegramStatus();
    fetchStats();
    fetchAlbums();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      showToast('info', 'Logged out of administrator mode.');
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleSearchFromHeader = (query: string) => {
    setSearchQuery(query);
    if (currentTab !== 'gallery') {
      setCurrentTab('gallery');
    }
  };

  const handleOpenAlbum = (albumId: string) => {
    setSelectedAlbumFilter(albumId);
    setCurrentTab('gallery');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col md:flex-row antialiased">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Unified Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'gallery') {
            setSearchQuery('');
          }
        }}
        telegramStatus={telegramStatus}
        isAuthenticated={isAuthenticated}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenUpload={() => setCurrentTab('upload')}
          searchQuery={searchQuery}
          onSearchChange={handleSearchFromHeader}
          isAuthenticated={isAuthenticated}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <Overview
              stats={stats}
              telegramStatus={telegramStatus}
              onNavigate={(tab) => setCurrentTab(tab)}
              onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
              isLoading={isLoadingStats}
            />
          )}

          {currentTab === 'gallery' && (
            <Gallery
              initialSearchQuery={searchQuery}
              albums={albums}
              onUploadClick={() => setCurrentTab('upload')}
              onPreviewPhoto={(photo) => setPreviewPhoto(photo)}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setIsLoginModalOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'albums' && (
            <AlbumsView
              albums={albums}
              onRefreshAlbums={fetchAlbums}
              onOpenAlbum={handleOpenAlbum}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setIsLoginModalOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'upload' && (
            <UploadCenter
              albums={albums}
              telegramStatus={telegramStatus}
              onNavigateToTelegram={() => setCurrentTab('telegram')}
              onUploadCompleted={() => {
                fetchStats();
                fetchAlbums();
              }}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setIsLoginModalOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'telegram' && (
            <TelegramSettings
              status={telegramStatus}
              onRefreshStatus={() => {
                fetchTelegramStatus();
                fetchStats();
              }}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setIsLoginModalOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onNavigateToTelegram={() => setCurrentTab('telegram')}
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => setIsLoginModalOpen(true)}
              onLogout={handleLogout}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Full-Screen Photo Preview Modal */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photosList={stats?.recentPhotos || []}
          albums={albums}
          onClose={() => setPreviewPhoto(null)}
          onSelectPhoto={(photo) => setPreviewPhoto(photo)}
          onPhotoDeleted={(id) => {
            fetchStats();
            fetchAlbums();
          }}
          isAuthenticated={isAuthenticated}
          onRequireAuth={() => setIsLoginModalOpen(true)}
          showToast={showToast}
        />
      )}

      {/* Administrator Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          fetchTelegramStatus();
          fetchStats();
        }}
        showToast={showToast}
      />
    </div>
  );
}
