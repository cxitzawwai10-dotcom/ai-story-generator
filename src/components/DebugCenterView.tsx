import React from 'react';
import { Activity, Terminal, Trash2, ShieldCheck, Clock } from 'lucide-react';
import { KeyRecord } from '../utils/storyEngine';

export interface DebugLogEntry {
  id: string;
  time: string;
  type: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface DebugCenterViewProps {
  keys: KeyRecord[];
  logs: DebugLogEntry[];
  onClearLogs: () => void;
}

export const DebugCenterView: React.FC<DebugCenterViewProps> = ({
  keys,
  logs,
  onClearLogs,
}) => {
  return (
    <div className="space-y-5">
      {/* 12. API Key Hook Table Card */}
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Activity className="w-4 h-4 text-[#A78BFA]" />
            <span>API Key Hook Table (Live Request State)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Telemetry</span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1E2942]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A0E1A] text-slate-400 border-b border-[#1E2942] font-semibold">
                <th className="py-2.5 px-3">Key ID</th>
                <th className="py-2.5 px-3">Key Status</th>
                <th className="py-2.5 px-3">Request State</th>
                <th className="py-2.5 px-3">Last Test Result</th>
                <th className="py-2.5 px-3">Last Used</th>
                <th className="py-2.5 px-3 text-center">Reqs</th>
                <th className="py-2.5 px-3 text-center">Success</th>
                <th className="py-2.5 px-3 text-center">Errors</th>
                <th className="py-2.5 px-3">Cooldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2942]">
              {keys.map((k) => {
                const isCooldown = k.cooldownUntil > Date.now();
                const remainingSec = isCooldown ? Math.ceil((k.cooldownUntil - Date.now()) / 1000) : 0;

                return (
                  <tr key={k.id} className="hover:bg-[#131B30]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#A78BFA]">
                      {k.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          k.status === 'Connected'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : k.status === 'Running'
                            ? 'bg-purple-500/20 text-[#C4B5FD] border border-purple-500/40 animate-pulse'
                            : k.status === 'Testing'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : k.status === 'QuotaExceeded'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : k.status === 'RateLimited'
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : k.status === 'ServerError'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : k.status === 'InvalidKey' || k.status === 'Error'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {k.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-300">
                      {k.reqState}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                      {k.lastTest}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {k.lastUsed}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-300">
                      {k.requests}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                      {k.success}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400">
                      {k.errors}
                    </td>
                    <td className="py-2.5 px-3">
                      {isCooldown ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
                          <Clock className="w-3 h-3" /> {remainingSec}s
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">Ready</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 13. Audit & Debug Logs Console */}
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Terminal className="w-4 h-4 text-[#A78BFA]" />
            <span>Audit & Debug Logs</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Keys strictly redacted</span>
            </span>
            <button
              type="button"
              onClick={onClearLogs}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#131B30] text-slate-300 hover:text-white border border-[#1E2942] hover:border-slate-500 transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Output */}
        <div className="bg-[#050811] border border-[#1E2942] rounded-xl p-3.5 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No events recorded in session log yet.</div>
          ) : (
            logs.map((log) => {
              const statusColor =
                log.status === 'error'
                  ? 'text-rose-400 font-bold'
                  : log.status === 'warning'
                  ? 'text-amber-400 font-semibold'
                  : log.status === 'success'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-indigo-300';

              return (
                <div key={log.id} className="leading-relaxed break-all">
                  <span className="text-slate-500">[{log.time}]</span>{' '}
                  <span className="text-[#A78BFA] font-bold">[{log.type}]</span>{' '}
                  <span className={statusColor}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
