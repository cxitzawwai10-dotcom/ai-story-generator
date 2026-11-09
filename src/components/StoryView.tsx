import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  RefreshCw,
  PlusCircle,
  Check,
  Bookmark,
  Calendar
} from 'lucide-react';
import { GeneratedStory, formatFullStoryForExport, sanitizeFilename } from '../utils/storyEngine';

interface StoryViewProps {
  story: GeneratedStory | null;
  activePartIndex: number;
  onSelectPart: (index: number) => void;
  onEditInStudio: () => void;
  onRegenerate: () => void;
  onNewStory: () => void;
  onNotify: (msg: string) => void;
}

export const StoryView: React.FC<StoryViewProps> = ({
  story,
  activePartIndex,
  onSelectPart,
  onEditInStudio,
  onRegenerate,
  onNewStory,
  onNotify,
}) => {
  const contentBoxRef = useRef<HTMLDivElement>(null);
  const [copiedPart, setCopiedPart] = React.useState(false);
  const [copiedFull, setCopiedFull] = React.useState(false);

  if (!story || !story.parts || story.parts.length === 0) {
    return (
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-8 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center mx-auto mb-4">
          <Bookmark className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Story Generated Yet</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Head over to the <strong>Create ✍️</strong> tab to enter your story premise, select a genre, setting, and custom duration.
        </p>
        <button
          type="button"
          onClick={onNewStory}
          className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_2px_12px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create A New Story</span>
        </button>
      </div>
    );
  }

  const currentPart = story.parts[activePartIndex] || story.parts[0];
  const totalParts = story.parts.length;

  const handlePrev = () => {
    if (activePartIndex > 0) {
      onSelectPart(activePartIndex - 1);
      contentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onNotify('You are at the beginning of the story.');
    }
  };

  const handleNext = () => {
    if (activePartIndex < totalParts - 1) {
      onSelectPart(activePartIndex + 1);
      contentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onNotify('Reached the final part of this story.');
    }
  };

  const handleCopyPart = () => {
    if (!currentPart?.text) return;
    navigator.clipboard.writeText(currentPart.text).then(() => {
      setCopiedPart(true);
      onNotify(`Copied ${currentPart.title} to clipboard!`);
      setTimeout(() => setCopiedPart(false), 2000);
    });
  };

  const handleCopyFullStory = () => {
    const fullText = formatFullStoryForExport(story);
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedFull(true);
      onNotify('Full story copied to clipboard!');
      setTimeout(() => setCopiedFull(false), 2000);
    });
  };

  const handleSaveFullFile = () => {
    try {
      const fullText = formatFullStoryForExport(story);
      const filename = sanitizeFilename(story.title);
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onNotify(`Story file saved as "${filename}"!`);
    } catch (err: any) {
      onNotify('File export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Story Meta Header Card */}
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {/* Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A78BFA] mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(story.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">
            {story.title}
          </h2>
        </div>

        {/* Badges Shelf */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C4B5FD]">
            Genre: {story.genre}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
            Duration: {story.duration}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            Setting: {story.background}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-300">
            {totalParts} Story Parts
          </span>
        </div>

        {/* Dynamic Part Navigation Chips */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Part Navigation</span>
            <span className="text-[#A78BFA]">
              Part {activePartIndex + 1} of {totalParts}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {story.parts.map((p, idx) => {
              const isActive = idx === activePartIndex;
              return (
                <button
                  key={p.number}
                  type="button"
                  onClick={() => onSelectPart(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.5)] border border-[#A78BFA]/50'
                      : 'bg-[#0A0E1A] text-slate-300 border border-[#1E2942] hover:bg-[#131B30] hover:text-white'
                  }`}
                >
                  {p.title || `Part-${p.number}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Part Reading Box */}
        <div
          ref={contentBoxRef}
          className="bg-[#0A0E1A] border border-[#1E2942] rounded-xl p-5 md:p-6 mb-4 min-h-[260px] text-slate-100 text-[15px] md:text-base leading-relaxed whitespace-pre-wrap font-normal"
        >
          <div className="text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-3 pb-2 border-b border-[#1E2942] flex items-center justify-between">
            <span>{currentPart.title}</span>
            <span className="text-[11px] text-slate-400 font-normal">
              ~{Math.round(currentPart.text.split(/\s+/).length)} words
            </span>
          </div>
          <div className="text-slate-100 leading-relaxed space-y-4">
            {currentPart.text}
          </div>
        </div>

        {/* Part Controls: Previous, Copy Part, Next */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#1E2942]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activePartIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#131B30] text-slate-200 border border-[#1E2942] hover:bg-[#1C2640] hover:border-[#7C3AED] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Part</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPart}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#131B30] text-slate-200 border border-[#1E2942] hover:bg-[#1C2640] hover:border-[#7C3AED] transition-all cursor-pointer"
          >
            {copiedPart ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#A78BFA]" />}
            <span>{copiedPart ? 'Part Copied!' : 'Copy Part'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={activePartIndex === totalParts - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#131B30] text-slate-200 border border-[#1E2942] hover:bg-[#1C2640] hover:border-[#7C3AED] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Next Part</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Full Story Action Toolbar */}
        <div className="mt-6 pt-5 border-t border-[#1E2942] flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleCopyFullStory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#131B30] text-white border border-[#1E2942] hover:bg-[#1C2640] hover:border-[#7C3AED] shadow-sm transition-all cursor-pointer"
          >
            {copiedFull ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#A78BFA]" />}
            <span>Copy Full Story</span>
          </button>

          <button
            type="button"
            onClick={handleSaveFullFile}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.6)] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save Full Story as File (.txt)</span>
          </button>

          <button
            type="button"
            onClick={onEditInStudio}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#131B30] text-slate-300 border border-[#1E2942] hover:text-white hover:border-slate-500 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit In Studio</span>
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#131B30] text-slate-300 border border-[#1E2942] hover:text-white hover:border-slate-500 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Regenerate Story</span>
          </button>

          <button
            type="button"
            onClick={onNewStory}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#131B30] text-slate-300 border border-[#1E2942] hover:text-white hover:border-slate-500 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Story</span>
          </button>
        </div>
      </div>
    </div>
  );
};
