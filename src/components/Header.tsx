import React from 'react';
import { BookOpen, Sparkles, Key, Activity, Layers } from 'lucide-react';

export type TabType = 'create' | 'story' | 'settings' | 'debug';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasStory: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, hasStory }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-[#1E2942] px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Container */}
        <div 
          onClick={() => onTabChange('create')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#9333EA] flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.45)]">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#A78BFA] bg-clip-text text-transparent">
              StoryVerse AI
            </h1>
            <p className="text-[11px] font-medium text-slate-400 -mt-0.5">
              AI Story Creation Studio
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#0E1424] p-1 rounded-xl border border-[#1E2942]">
          <button
            type="button"
            onClick={() => onTabChange('create')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-[#7C3AED] text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create ✍️</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('story')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'story'
                ? 'bg-[#7C3AED] text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Story 📖</span>
            {hasStory && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-[#7C3AED] text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys ⚙️</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('debug')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'debug'
                ? 'bg-[#7C3AED] text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Debug 🩺</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
