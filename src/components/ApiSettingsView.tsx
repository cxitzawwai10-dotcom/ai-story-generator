import React, { useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  TestTube2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Server,
  Info
} from 'lucide-react';
import { KeyRecord } from '../utils/storyEngine';

interface ApiSettingsViewProps {
  keys: KeyRecord[];
  autoRotation: boolean;
  onAddKey: () => void;
  onRemoveKey: (index: number) => void;
  onUpdateKey: (index: number, value: string) => void;
  onToggleAutoRotation: (enabled: boolean) => void;
  onTestConnections: () => void;
  isTesting: boolean;
  hasServerKey: boolean;
  serverKeyMasked: string | null;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  keys,
  autoRotation,
  onAddKey,
  onRemoveKey,
  onUpdateKey,
  onToggleAutoRotation,
  onTestConnections,
  isTesting,
  hasServerKey,
  serverKeyMasked,
}) => {
  const [visibleKeys, setVisibleKeys] = useState<{ [index: number]: boolean }>({});

  const toggleVisibility = (idx: number) => {
    setVisibleKeys((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStatusBadge = (status: KeyRecord['status']) => {
    switch (status) {
      case 'Connected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        );
      case 'QuotaExceeded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Quota Exceeded
          </span>
        );
      case 'InvalidKey':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Invalid Key
          </span>
        );
      case 'Testing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
            Testing...
          </span>
        );
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 animate-pulse">
            Running
          </span>
        );
      case 'RateLimited':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            Rate Limited
          </span>
        );
      case 'ServerError':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            Server Error
          </span>
        );
      case 'NetworkError':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Network Error
          </span>
        );
      case 'Disabled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Standby
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Studio Card */}
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {/* Header Title */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E2942]">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Key className="w-4 h-4 text-[#A78BFA]" />
            <span>Gemini API Key Configuration</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {keys.length} Key{keys.length === 1 ? '' : 's'} Configured
          </span>
        </div>

        {/* Server Environment Key Banner */}
        {hasServerKey && (
          <div className="mb-5 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3 text-xs text-purple-200">
            <Server className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-white flex items-center gap-2">
                <span>Default Server Gemini Key Active</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  {serverKeyMasked || 'Configured'}
                </span>
              </div>
              <p className="text-purple-300/80 mt-1 leading-relaxed">
                A server-side Gemini API key is already attached. The studio can generate stories immediately, and you can also add custom keys below for rotation and quota failover.
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Configure Google Gemini API keys. Keys are kept securely on the server or encrypted locally. 
          When Auto Key Rotation is active, requests seamlessly fail over to the next eligible key if Quota Exceeded (429) or rate limits occur.
        </p>

        {/* Key Rows List */}
        <div className="space-y-3 mb-6">
          {keys.map((k, index) => {
            const isVisible = !!visibleKeys[index];
            return (
              <div
                key={k.id}
                className="bg-[#0A0E1A] border border-[#1E2942] rounded-xl p-3 flex flex-wrap items-center gap-2.5"
              >
                {/* ID badge */}
                <div className="w-16 shrink-0 font-mono text-xs font-extrabold text-[#A78BFA]">
                  {k.id}
                </div>

                {/* Input field */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={k.key}
                    onChange={(e) => onUpdateKey(index, e.target.value)}
                    placeholder="Enter Google Gemini API Key (AIzaSy...)"
                    className="w-full bg-[#0E1424] border border-[#1E2942] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED] font-mono"
                  />
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  {getStatusBadge(k.status)}
                </div>

                {/* Actions: Show/Hide & Remove */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleVisibility(index)}
                    aria-label={isVisible ? `Hide ${k.id}` : `Show ${k.id}`}
                    className="p-1.5 rounded-lg bg-[#131B30] text-slate-300 hover:text-white border border-[#1E2942] hover:border-slate-500 transition-all cursor-pointer"
                    title={isVisible ? 'Hide Key' : 'Show Key'}
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveKey(index)}
                    aria-label={`Remove ${k.id}`}
                    disabled={keys.length <= 1 && !hasServerKey}
                    className="p-1.5 rounded-lg bg-[#131B30] text-rose-400 hover:text-rose-300 border border-[#1E2942] hover:border-rose-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Remove Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls: Add Key & Test API Connection */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onAddKey}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#131B30] text-slate-200 border border-[#1E2942] hover:bg-[#1C2640] hover:text-white hover:border-[#7C3AED] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#A78BFA]" />
            <span>Add Key</span>
          </button>

          <button
            type="button"
            onClick={onTestConnections}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#7C3AED]/20 text-[#C4B5FD] border border-[#7C3AED]/40 hover:bg-[#7C3AED]/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <TestTube2 className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing Keys...' : 'Test API Connection'}</span>
          </button>
        </div>

        {/* Auto Key Rotation Toggle */}
        <div className="mt-6 pt-5 border-t border-[#1E2942] flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <RotateCw className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Auto Key Rotation</div>
              <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                Automatically rotate to the next standby key upon Quota Exceeded (429) or rate limits, applying an exponential cooldown.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={autoRotation}
              onChange={(e) => onToggleAutoRotation(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
          </label>
        </div>

        {/* Quota Sharing Notice */}
        <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 flex items-start gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Note: Multiple keys created in the same Google Cloud Project share total project quotas. For best failover, provide keys from different projects or tier accounts.
          </span>
        </div>
      </div>
    </div>
  );
};
