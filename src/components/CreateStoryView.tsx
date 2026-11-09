import React, { useId } from 'react';
import { PenTool, Compass, MapPin, Clock, Zap, AlertCircle } from 'lucide-react';
import { calculateStoryMetrics } from '../utils/storyEngine';

export interface StoryFormData {
  idea: string;
  genre: string;
  background: string;
  customBackground: string;
  durationValue: number;
  durationUnit: 'Minutes' | 'Hours';
}

interface CreateStoryViewProps {
  formData: StoryFormData;
  onChange: (updated: Partial<StoryFormData>) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  validationError?: string | null;
}

export const GENRE_OPTIONS = [
  'Comedy',
  'Adventure',
  'Drama',
  'Horror',
  'Fantasy',
  'Romance',
  'Mystery',
  'Action',
  'Psychological Horror',
  'Thriller',
  'Science Fiction',
];

export const BACKGROUND_OPTIONS = [
  { value: 'မြန်မာ့ကျေးလက်နောက်ခံ', label: 'မြန်မာ့ကျေးလက်နောက်ခံ (Myanmar Rural)' },
  { value: 'မြန်မာ့မြို့ပြနောက်ခံ', label: 'မြန်မာ့မြို့ပြနောက်ခံ (Myanmar Urban)' },
  { value: 'တရုတ်ကျေးလက်နောက်ခံ', label: 'တရုတ်ကျေးလက်နောက်ခံ (Chinese Rural)' },
  { value: 'တရုတ်မြို့ပြနောက်ခံ', label: 'တရုတ်မြို့ပြနောက်ခံ (Chinese Urban)' },
  { value: 'ဂျပန်ကျေးလက်နောက်ခံ', label: 'ဂျပန်ကျေးလက်နောက်ခံ (Japanese Rural)' },
  { value: 'ဂျပန်မြို့ပြနောက်ခံ', label: 'ဂျပန်မြို့ပြနောက်ခံ (Japanese Urban)' },
  { value: 'ကိုရီးယားကျေးလက်နောက်ခံ', label: 'ကိုရီးယားကျေးလက်နောက်ခံ (Korean Rural)' },
  { value: 'ကိုရီးယားမြို့ပြနောက်ခံ', label: 'ကိုရီးယားမြို့ပြနောက်ခံ (Korean Urban)' },
  { value: 'အိန္ဒိယကျေးလက်နောက်ခံ', label: 'အိန္ဒိယကျေးလက်နောက်ခံ (Indian Rural)' },
  { value: 'အနောက်တိုင်းကျေးလက်နောက်ခံ', label: 'အနောက်တိုင်းကျေးလက်နောက်ခံ (Western Rural)' },
  { value: 'စိတ်ကြိုက်နောက်ခံ', label: 'စိတ်ကြိုက်နောက်ခံ (Custom Background)' },
];

export const CreateStoryView: React.FC<CreateStoryViewProps> = ({
  formData,
  onChange,
  onSubmit,
  isGenerating,
  validationError,
}) => {
  const metrics = calculateStoryMetrics(formData.durationValue, formData.durationUnit);
  const storyIdeaId = useId();
  const genreId = useId();
  const backgroundId = useId();
  const customBackgroundId = useId();
  const durationValueId = useId();
  const durationUnitId = useId();

  return (
    <div className="space-y-5">
      {/* Studio Card */}
      <div className="bg-[#0E1424] border border-[#1E2942] rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {/* 2.1 Story Idea Input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor={storyIdeaId} className="flex items-center gap-2 text-sm font-bold text-white tracking-wide">
              <PenTool className="w-4 h-4 text-[#A78BFA]" />
              <span>Write ✍️</span>
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              Unicode / Burmese (မြန်မာစာ) supported
            </span>
          </div>

          <textarea
            id={storyIdeaId}
            value={formData.idea}
            onChange={(e) => onChange({ idea: e.target.value })}
            placeholder="ဇာတ်လမ်းအကျဉ်း၊ အဓိကဇာတ်ကောင်များနှင့် အဖြစ်အပျက်များကို မြန်မာလို သို့မဟုတ် အင်္ဂလိပ်လို စိတ်ကြိုက်ရေးသားပါ... (Enter your story idea, detailed outline, or plot premise...)"
            rows={5}
            className="w-full bg-[#0A0E1A] border border-[#1E2942] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30 transition-all resize-y leading-relaxed"
          />
        </div>

        {/* 2.2 Story Option (Genre) */}
        <div className="mb-5">
          <label htmlFor={genreId} className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Story Option (Genre)</span>
          </label>
          <select
            id={genreId}
            value={formData.genre}
            onChange={(e) => onChange({ genre: e.target.value })}
            className="w-full bg-[#0A0E1A] border border-[#1E2942] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30 transition-all cursor-pointer"
          >
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g} className="bg-[#0E1424] text-white">
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* 2.3 Background Option directly below Story Option */}
        <div className="mb-5">
          <label htmlFor={backgroundId} className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Background Option (နောက်ခံ ပတ်ဝန်းကျင်)</span>
          </label>
          <select
            id={backgroundId}
            value={formData.background}
            onChange={(e) => onChange({ background: e.target.value })}
            className="w-full bg-[#0A0E1A] border border-[#1E2942] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30 transition-all cursor-pointer"
          >
            {BACKGROUND_OPTIONS.map((bg) => (
              <option key={bg.value} value={bg.value} className="bg-[#0E1424] text-white">
                {bg.label}
              </option>
            ))}
          </select>

          {/* Conditional Custom Background Field */}
          {formData.background === 'စိတ်ကြိုက်နောက်ခံ' && (
            <div className="mt-3 pl-3 border-l-2 border-[#7C3AED]">
              <label htmlFor={customBackgroundId} className="block text-xs font-semibold text-[#A78BFA] mb-1">
                Custom Background Description
              </label>
              <input
                id={customBackgroundId}
                type="text"
                value={formData.customBackground}
                onChange={(e) => onChange({ customBackground: e.target.value })}
                placeholder="e.g. ၁၉ ရာစု အင်းဝခေတ် နန်းတွင်းနောက်ခံ၊ သို့မဟုတ် အာကာသစခန်းတစ်ခု..."
                className="w-full bg-[#0A0E1A] border border-[#1E2942] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          )}
        </div>

        {/* 2.4 Custom Story Duration */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor={durationValueId} className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Custom Story Duration</span>
            </label>
            <span className="text-[11px] text-slate-400">
              ~{metrics.targetWords.toLocaleString()} words • Est. {metrics.recommendedParts} dynamic parts
            </span>
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-2.5">
            <input
              id={durationValueId}
              type="number"
              min={1}
              max={600}
              value={formData.durationValue}
              onChange={(e) => onChange({ durationValue: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="bg-[#0A0E1A] border border-[#1E2942] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30"
            />
            <label htmlFor={durationUnitId} className="sr-only">Duration Unit</label>
            <select
              id={durationUnitId}
              value={formData.durationUnit}
              onChange={(e) => onChange({ durationUnit: e.target.value as 'Minutes' | 'Hours' })}
              className="bg-[#0A0E1A] border border-[#1E2942] rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
            >
              <option value="Minutes">Minutes</option>
              <option value="Hours">Hours</option>
            </select>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 2.5 Run & Create Story Button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(124,58,237,0.45)] hover:shadow-[0_6px_30px_rgba(124,58,237,0.6)] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Zap className="w-5 h-5 fill-current" />
          <span>⚡ Run & Create Story</span>
        </button>
      </div>
    </div>
  );
};
