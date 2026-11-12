import React from 'react';
import { Menu, Search, UploadCloud, Shield, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onOpenMobileSidebar: () => void;
  onOpenUpload: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenUpload,
  searchQuery,
  onSearchChange,
  isAuthenticated,
  onOpenLogin,
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'gallery':
        return 'All Photos';
      case 'albums':
        return 'Albums';
      case 'upload':
        return 'Upload Center';
      case 'telegram':
        return 'Telegram Connection';
      case 'settings':
        return 'Settings';
      default:
        return 'Gallery';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Left Zone: Hamburger for Mobile + Page Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">TeleCloud /</span>
          <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            {getTabTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Middle Zone: Global Search Box */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search photos by filename, album..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right Zone: Primary Upload Action & Admin Badge */}
      <div className="flex items-center gap-3 shrink-0">
        {!isAuthenticated && (
          <button
            onClick={onOpenLogin}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin</span>
          </button>
        )}

        {isAuthenticated && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin Active</span>
          </div>
        )}

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Photos</span>
        </button>
      </div>
    </header>
  );
};
