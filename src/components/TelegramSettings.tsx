import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Key,
  MessageSquare,
  Lock,
  ExternalLink,
  ShieldCheck,
  Globe,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TelegramStatusData, AppSettingsData } from '../types/index.ts';
import { api } from '../services/api.ts';

interface TelegramSettingsProps {
  status: TelegramStatusData | null;
  onRefreshStatus: () => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
  status,
  onRefreshStatus,
  isAuthenticated,
  onRequireAuth,
  showToast,
}) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    bot?: { username: string; firstName: string };
    chat?: { title?: string; id: string | number };
    error?: string;
  } | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Webhook registration
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  const [showChatId, setShowChatId] = useState(false);

  // Set default webhook URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/telegram/webhook`);
    }
  }, []);

  const handleTestConnection = async () => {
    if (!botToken && !status?.configured) {
      showToast('error', 'Please enter a Telegram Bot Token to test.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testTelegramConfig(botToken || '', chatId || undefined);
      setTestResult(res);
      if (res.connected) {
        showToast('success', `Connection verified! Bot: @${res.bot?.username}`);
      } else {
        showToast('error', res.error || 'Connection failed.');
      }
    } catch (err: any) {
      setTestResult({
        connected: false,
        error: err.message || 'Network error reaching Telegram.',
      });
      showToast('error', err.message || 'Telegram connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setIsSaving(true);
    try {
      await api.saveTelegramConfig(
        botToken || undefined,
        chatId || undefined,
        webhookSecret || undefined
      );
      showToast('success', 'Telegram credentials saved into application database.');
      setBotToken(''); // clear raw input for security
      onRefreshStatus();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save Telegram credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!webhookUrl) {
      showToast('error', 'Please provide a public HTTPS Webhook URL.');
      return;
    }

    setIsSettingWebhook(true);
    try {
      const msg = await api.setupWebhook(webhookUrl, webhookSecret || undefined);
      showToast('success', msg);
      onRefreshStatus();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to register webhook.');
    } finally {
      setIsSettingWebhook(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Telegram Connection</h2>
        <p className="text-xs text-slate-500">
          Configure official Telegram Bot API credentials for photo cloud storage and real-time synchronization
        </p>
      </div>

      {/* Live Status Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                status?.connected
                  ? 'bg-emerald-50 text-emerald-600'
                  : status?.configured
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Connection Status</h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    status?.connected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : status?.configured
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {status?.statusText || 'Checking...'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {status?.connected
                  ? 'Active connection to Telegram Bot API cloud gateway'
                  : status?.error || 'Configure your Bot Token and Target Chat to start uploading'}
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* Bot & Chat Information Badges */}
        {status?.connected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Bot Identity</span>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>@{status.bot?.username}</span>
                <span className="text-slate-400">({status.bot?.firstName})</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">Verified & Active</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Target Chat Storage</span>
              <div className="font-semibold text-slate-900 truncate">
                {status.chat?.title || 'Private Cloud Storage'}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">
                Protected Cloud Chat
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Telegram Setup Guide Walkthrough */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">How to Setup Your Telegram Bot</h3>
            <p className="text-xs text-slate-500">4 quick steps to create your private cloud</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Create Bot via BotFather</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Open Telegram and search for <strong>@BotFather</strong>. Send <code className="text-blue-600 font-mono">/newbot</code>, choose a name and username, then copy your HTTP API Bot Token.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Create Private Chat or Channel</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Create a private Channel or Group on Telegram. Add your newly created bot as an Administrator with <em>"Post Messages"</em> permission.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Obtain Chat ID</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Channels usually have IDs starting with <code className="text-blue-600 font-mono">-100...</code>. You can get your Chat ID by forwarding any post from the chat to <strong>@userinfobot</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                4
              </span>
              <span>Test and Save Below</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Paste your credentials into the form below, run <em>"Test Connection"</em> to verify live reachability, and click <em>"Save Configuration"</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Credentials Configuration Form */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configure Credentials</h3>
            <p className="text-xs text-slate-500">
              Credentials are securely stored in your server's SQLite database
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Telegram Bot Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={status?.configured ? '•••••••••••••••••••••••• (Configured)' : 'Enter Telegram Bot Token'}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Token issued by @BotFather. Stored securely and never shown in the browser.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Chat ID
            </label>
            <div className="relative">
              <input
                type={showChatId ? 'text' : 'password'}
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder={status?.configured ? '•••••••••••• (Configured)' : 'Enter Target Chat ID'}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowChatId(!showChatId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                {showChatId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Private chat or channel where photo binaries are saved.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Webhook Secret Token (Optional)
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="•••••••••••• (Optional Secret)"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Test Result Message Box */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                testResult.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {testResult.connected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Connection Succeeded!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Connection Failed</span>
                  </>
                )}
              </div>
              {testResult.connected ? (
                <div>
                  Verified access to bot <strong>@{testResult.bot?.username}</strong>
                  {testResult.chat && (
                    <span> and target chat <strong>{/^\-?[0-9]+$/.test(testResult.chat.title || '') ? 'Private Cloud Storage' : testResult.chat.title}</strong></span>
                  )}. You can safely save this configuration.
                </div>
              ) : (
                <div>{testResult.error?.replace(/[0-9]{8,12}:[a-zA-Z0-9_-]{30,45}/g, '[PROTECTED_TOKEN]').replace(/-?\b\d{8,15}\b/g, '[PROTECTED_ID]')}</div>
              )}
            </div>
          )}


          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {isTesting ? 'Testing Telegram API...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Webhook Tool for Direct Telegram Uploads */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Direct Ingestion Webhook</h3>
            <p className="text-xs text-slate-500">
              Automatically index photos when you send them to the Telegram Bot directly
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          When configured, any photo sent directly to your Telegram bot will be ingested into TeleCloud Gallery in real time, with automatic deduplication through the <code className="font-mono text-slate-800">processed_updates</code> table.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-domain.com/api/telegram/webhook"
            className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
          <button
            type="button"
            onClick={handleRegisterWebhook}
            disabled={isSettingWebhook || !webhookUrl}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isSettingWebhook ? 'Registering...' : 'Register Webhook'}
          </button>
        </div>

        {status?.webhook && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Current Telegram Webhook State:</div>
            <div className="font-mono truncate">URL: {status.webhook.url || 'Not set'}</div>
            <div>Pending Updates: {status.webhook.pending_update_count}</div>
            {status.webhook.last_error_message && (
              <div className="text-red-600">Last Error: {status.webhook.last_error_message}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
