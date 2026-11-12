import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  HardDrive,
  UploadCloud,
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';
import { AppSettingsData } from '../types/index.ts';
import { api } from '../services/api.ts';

interface SettingsViewProps {
  onNavigateToTelegram: () => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onLogout: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigateToTelegram,
  isAuthenticated,
  onRequireAuth,
  onLogout,
  showToast,
}) => {
  const [settings, setSettings] = useState<AppSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      showToast('error', 'Failed to load configuration settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      showToast('success', 'Admin password successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-xs text-slate-500">
          Manage system parameters, security controls, and storage specifications
        </p>
      </div>

      {/* General Application Information */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">General Overview</h3>
            <p className="text-xs text-slate-500">Platform deployment details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Application Name</div>
            <div className="font-semibold text-slate-900 mt-0.5">{settings?.appName || 'TeleCloud Gallery'}</div>
            <div className="text-[11px] text-slate-500">{settings?.subtitle || 'Free Clouds to Save Photos'}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Version & Build</div>
            <div className="font-semibold font-mono text-slate-900 mt-0.5">v{settings?.version || '1.2.0'}</div>
            <div className="text-[11px] text-slate-500 capitalize">{settings?.environment || 'Production'} Mode</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Database Engine</div>
            <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>SQLite with WAL</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate">
              {settings?.databasePath || './data/telecloud.db'}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Parameters */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Upload Policies</h3>
            <p className="text-xs text-slate-500">File handling constraints and supported formats</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Max File Size</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              {settings?.maxFileSizeMb || 20} MB
            </div>
            <div className="text-[11px] text-slate-500">Telegram Bot API photo limit</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Max Batch Files</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              {settings?.maxUploadFiles || 10} files
            </div>
            <div className="text-[11px] text-slate-500">Per ingestion request</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Supported Formats</div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5 flex flex-wrap gap-1">
              {(settings?.supportedFormats || ['JPEG', 'PNG', 'WebP', 'GIF']).map((fmt) => (
                <span key={fmt} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">
                  {fmt}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Inspected with magic byte signatures</div>
          </div>
        </div>
      </div>

      {/* Security & Administrator Access */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Administrator Security</h3>
              <p className="text-xs text-slate-500">Session status and credential administration</p>
            </div>
          </div>

          {isAuthenticated ? (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onRequireAuth}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
            >
              Authenticate Admin
            </button>
          )}
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Change Administrator Password
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password (default: admin123)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
          >
            {isChangingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Database Backup & Disaster Recovery Guide */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Database & Disaster Recovery</h3>
            <p className="text-xs text-slate-500">Persistent storage architecture recommendations</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            <strong>Where are my photos?</strong> Your original full-resolution photo files live safely inside your private Telegram chat or channel.
          </p>
          <p>
            <strong>Where is the library index?</strong> TeleCloud uses a localized SQLite database located at <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{settings?.databasePath || './data/telecloud.db'}</code>. It contains the mapping of filenames, albums, and Telegram <code className="font-mono text-slate-800">file_id</code>s.
          </p>
          <p>
            <strong>Backup Strategy:</strong> For high-availability deployments on cloud hosts (such as Docker, Railway, Render, or Fly.io), attach a <em>Persistent Disk Volume</em> to the <code className="font-mono text-slate-800">./data</code> directory. Regularly back up <code className="font-mono text-slate-800">telecloud.db</code> to prevent re-indexing requirements.
          </p>
        </div>
      </div>
    </div>
  );
};
