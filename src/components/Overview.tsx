import React from 'react';
import {
  Images,
  FolderOpen,
  Clock,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { DashboardStats, TelegramStatusData, ImageRecord } from '../types/index.ts';

interface OverviewProps {
  stats: DashboardStats | null;
  telegramStatus: TelegramStatusData | null;
  onNavigate: (tab: string) => void;
  onPreviewPhoto: (photo: ImageRecord) => void;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const Overview: React.FC<OverviewProps> = ({
  stats,
  telegramStatus,
  onNavigate,
  onPreviewPhoto,
  isLoading,
}) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Hero Intro */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>Telegram Bot API Storage Engine</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Unlimited Cloud Photo Management
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Your original photographs are preserved in Telegram’s private cloud storage. TeleCloud indexes your library with high-speed SQLite for instant album tagging, lightning search, and direct proxy previews.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-xs"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Upload Photos</span>
            </button>
            <button
              onClick={() => onNavigate('telegram')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span>Telegram Diagnostics</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background graphic */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Telegram Connection Alert if not connected */}
      {!telegramStatus?.connected && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900">
                {telegramStatus?.configured ? 'Telegram Bot Connection Issue' : 'Telegram Bot Configuration Required'}
              </div>
              <div className="text-xs text-amber-700">
                {telegramStatus?.error || 'Connect your Telegram Bot Token & Target Chat ID to enable automated photo uploads.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('telegram')}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
          >
            Configure Now
          </button>
        </div>
      )}

      {/* 4 Compact Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Photos */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Total Photos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Images className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? '...' : (stats?.totalPhotos ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Indexed in SQLite database</p>
        </div>

        {/* Total Albums */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Total Albums</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? '...' : (stats?.totalAlbums ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Custom organized collections</p>
        </div>

        {/* Recent Uploads */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Recent Uploads</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? '...' : (stats?.recentUploadsCount ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Uploaded in past 24 hours</p>
        </div>

        {/* Telegram Cloud Status */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Telegram Cloud</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              telegramStatus?.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold tracking-tight flex items-center gap-1.5 text-slate-900">
            {telegramStatus?.connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{telegramStatus?.configured ? 'Auth Failed' : 'Unconfigured'}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {telegramStatus?.bot?.username ? `@${telegramStatus.bot.username}` : 'Bot credentials required'}
          </p>
        </div>
      </div>

      {/* Two Column Grid: Storage Architecture + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Architecture Overview Card */}
        <div className="lg:col-span-1 p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Storage Architecture</h3>
              <p className="text-[11px] text-slate-500">Dual-layer persistent storage</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Indexed Telegram Payload
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatBytes(stats?.totalStorageBytes ?? 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved across {stats?.totalPhotos ?? 0} photos in private Telegram chat
              </p>
            </div>

            <div className="space-y-2 text-slate-600 leading-relaxed text-[11px]">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>
                  <strong>Binary Storage:</strong> Zero disk consumption on the app server. Originals reside in Telegram Cloud indefinitely.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>
                  <strong>SQLite Metadata:</strong> Stores <code className="font-mono text-slate-800">file_id</code>, dates, sizes, and album links.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>
                  <strong>Secure Streaming:</strong> Real-time streaming proxy prevents bot token leakage.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Upload Activity */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Upload Activity</h3>
              <p className="text-[11px] text-slate-500">History of recent ingestion jobs</p>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Upload Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {(!stats?.recentJobs || stats.recentJobs.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent upload activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {stats.recentJobs.map((job) => (
                <div key={job.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        job.status === 'success'
                          ? 'bg-emerald-500'
                          : job.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500 animate-pulse'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-medium text-slate-800 truncate">{job.filename}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(job.created_at).toLocaleString()}
                        {job.file_size ? ` · ${formatBytes(job.file_size)}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        job.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : job.status === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Photos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Photos</h3>
            <p className="text-xs text-slate-500">Latest additions to your personal gallery</p>
          </div>
          <button
            onClick={() => onNavigate('gallery')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Photos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!stats?.recentPhotos || stats.recentPhotos.length === 0) ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Images className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <div className="text-sm font-bold text-slate-900">No photos in your gallery yet</div>
              <p className="text-xs text-slate-500 mt-1">
                Upload your first photo to store it permanently on Telegram and index it in SQLite.
              </p>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Photos</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stats.recentPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onPreviewPhoto(photo)}
                className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer aspect-square"
              >
                <img
                  src={`/api/images/${photo.id}/file`}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                  <div className="text-[11px] font-semibold truncate leading-tight">{photo.filename}</div>
                  <div className="text-[10px] text-slate-300">
                    {photo.album_name || 'Unassigned'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
