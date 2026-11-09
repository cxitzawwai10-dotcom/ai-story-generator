import React from 'react';
import { XCircle, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  stageText: string;
  progressPercent: number;
  onCancel: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  stageText,
  progressPercent,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#070A13]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-6 md:p-8 w-full max-w-md text-center shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#9333EA]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Spinner Ring */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-[#7C3AED]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#7C3AED] border-r-[#A78BFA] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-[#A78BFA]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-lg md:text-xl font-extrabold text-white mb-2 tracking-tight">
          Creating your story…
        </h3>

        {/* Status Text */}
        <div className="text-sm font-semibold text-[#A78BFA] min-h-[24px] mb-5 flex items-center justify-center px-2">
          <span>{stageText}</span>
        </div>

        {/* Purple/Violet Progress Bar */}
        <div className="bg-[#0A0E1A] border border-[#1E2942] rounded-full h-2.5 overflow-hidden mb-6 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(124,58,237,0.8)]"
            style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
          />
        </div>

        {/* Cancel Generation Button */}
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Generation</span>
        </button>
      </div>
    </div>
  );
};
