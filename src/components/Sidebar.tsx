import React from 'react';
import {
  LayoutDashboard,
  Images,
  FolderOpen,
  UploadCloud,
  Send,
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  Cloud,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { TelegramStatusData } from '../types/index.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  telegramStatus: TelegramStatusData | null;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  telegramStatus,
  isAuthenticated,
  onOpenLogin,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'gallery', label: 'All Photos', icon: Images },
    { id: 'albums', label: 'Albums', icon: FolderOpen },
    { id: 'upload', label: 'Uploads', icon: UploadCloud },
  ];

  const managementItems = [
    {
      id: 'telegram',
      label: 'Telegram Connection',
      icon: Send,
      badge: telegramStatus?.connected
        ? { text: 'Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
        : telegramStatus?.configured
        ? { text: 'Error', color: 'text-amber-700 bg-amber-50 border-amber-200' }
        : { text: 'Setup', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (isOpenMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-[260px] bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Brand Section */}
        <div>
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  TeleCloud <span className="text-blue-600 font-semibold">Gallery</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  Free Clouds to Save Photos
                </div>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="p-4 space-y-6">
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Library
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Management
              </div>
              <nav className="space-y-1">
                {managementItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${item.badge.color}`}>
                          {item.badge.text}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Section: Connection & Administrator Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {/* Telegram Status Preview Card */}
          <div
            onClick={() => handleNavClick('telegram')}
            className="p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500">Telegram Cloud</span>
              {telegramStatus?.connected ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {telegramStatus?.configured ? 'Check Bot' : 'Setup Required'}
                </span>
              )}
            </div>
            <div className="text-[12px] text-slate-800 font-semibold truncate">
              {telegramStatus?.bot?.username ? `@${telegramStatus.bot.username}` : 'Configure Telegram Bot'}
            </div>
          </div>

          {/* Admin Profile */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/src/assets/images/avatar_admin_user_1794394944953.jpg"
                alt="Admin Avatar"
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="leading-tight">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                  Administrator
                  {isAuthenticated && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isAuthenticated ? 'Authenticated' : 'Read-only mode'}
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                onClick={onLogout}
                title="Sign out of Administrator"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                title="Sign in as Administrator"
                className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
