/**
 * storyEngine.ts
 * Pure logic utilities for StoryVerse AI:
 * - Narration speed & duration target calculation
 * - Dynamic narrative-aware part segmentation (Part-1 to Part-N)
 * - Safe sanitization and file export formatting
 * - Secure API key redacting for debug logs
 * - Key rotation & cooldown decision logic
 */

export interface StoryPart {
  number: number;
  title: string;
  text: string;
}

export interface GeneratedStory {
  id: string;
  title: string;
  idea: string;
  genre: string;
  background: string;
  duration: string;
  durationMinutes: number;
  parts: StoryPart[];
  rawText: string;
  createdAt: string;
}

export interface KeyRecord {
  id: string;
  key: string;
  status: 'Standby' | 'Running' | 'Testing' | 'Connected' | 'Error' | 'QuotaExceeded' | 'InvalidKey' | 'Disabled' | 'RateLimited' | 'ServerError' | 'NetworkError';
  reqState: 'Idle' | 'Active' | 'Cooldown';
  lastTest: string;
  lastUsed: string;
  requests: number;
  success: number;
  errors: number;
  cooldownUntil: number;
}

/**
 * Calculates estimated word count and recommended part count based on duration.
 * Uses 140 words per minute narration speed.
 */
export function calculateStoryMetrics(durationValue: number, durationUnit: 'Minutes' | 'Hours') {
  const safeVal = Math.max(1, Math.min(600, Number(durationValue) || 15));
  const totalMinutes = durationUnit === 'Hours' ? safeVal * 60 : safeVal;
  const wordsPerMinute = 140;
  const targetWords = totalMinutes * wordsPerMinute;

  // Segment parts: 1 part roughly every 4 to 8 minutes of narration, minimum 3 parts, maximum 16 parts
  let recommendedParts = Math.round(totalMinutes / 6);
  if (recommendedParts < 3) recommendedParts = 3;
  if (recommendedParts > 16) recommendedParts = 16;

  return {
    totalMinutes,
    targetWords,
    recommendedParts,
    label: `${safeVal} ${durationUnit}`
  };
}

/**
 * Sanitizes a story title to create a safe, clean filename for download.
 * Preserves Unicode letters (including Burmese characters) and replaces invalid characters.
 */
export function sanitizeFilename(title: string, dateStr?: string): string {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  // Preserve ASCII alphanumeric, Burmese Unicode \u1000-\u109F, and underscore/hyphen
  const cleaned = title
    .trim()
    .replace(/[^\w\s\u1000-\u109F-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 45);

  const fallback = cleaned.length > 0 ? cleaned : 'Story';
  return `StoryVerse_${fallback}_${date}.txt`;
}

/**
 * Segments raw text output into structured dynamic parts (Part-1 ... Part-N).
 * Uses narrative headers if present or natural paragraph boundaries.
 */
export function segmentStoryIntoParts(rawText: string, targetPartsCount: number = 4): StoryPart[] {
  if (!rawText || typeof rawText !== 'string') {
    return [{ number: 1, title: 'Part-1', text: '' }];
  }

  const clean = rawText.trim();

  // 1. Look for explicit Part markers like "Part 1:", "Part-1:", "## Part 1", "အပိုင်း ၁"
  const explicitPartRegex = /(?:^|\n)(?:#{1,3}\s*)?(?:Part|အပိုင်း)[\s\-_]*([0-9\u1040-\u1049]{1,2})[:\s\n\-]*(.*?)(?=(?:\n(?:#{1,3}\s*)?(?:Part|အပိုင်း)[\s\-_]*[0-9\u1040-\u1049]{1,2}[:\s\n\-])|$)/gsi;
  const matches = [...clean.matchAll(explicitPartRegex)];

  if (matches.length >= 2) {
    return matches.map((m, idx) => {
      const partNum = idx + 1;
      let text = m[0].replace(/^(?:#{1,3}\s*)?(?:Part|အပိုင်း)[\s\-_]*[0-9\u1040-\u1049]{1,2}[:\s\n\-]*/i, '').trim();
      // Extract title if first line is short
      const lines = text.split('\n');
      let partTitle = `Part-${partNum}`;
      if (lines.length > 1 && lines[0].trim().length > 0 && lines[0].trim().length < 60) {
        partTitle = lines[0].trim().replace(/^[:\-\s*]+|[:\-\s*]+$/g, '');
        text = lines.slice(1).join('\n').trim();
      }
      return {
        number: partNum,
        title: partTitle.startsWith('Part-') ? partTitle : `Part-${partNum}: ${partTitle}`,
        text: text || m[0].trim()
      };
    });
  }

  // 2. Fallback: Narrative-aware paragraph segmentation
  const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length <= 3) {
    return [{ number: 1, title: 'Part-1', text: clean }];
  }

  const partsCount = Math.max(2, Math.min(targetPartsCount, paragraphs.length));
  const parasPerPart = Math.ceil(paragraphs.length / partsCount);
  const parts: StoryPart[] = [];

  for (let i = 0; i < partsCount; i++) {
    const chunk = paragraphs.slice(i * parasPerPart, (i + 1) * parasPerPart);
    if (chunk.length > 0) {
      parts.push({
        number: i + 1,
        title: `Part-${i + 1}`,
        text: chunk.join('\n\n')
      });
    }
  }

  return parts.length > 0 ? parts : [{ number: 1, title: 'Part-1', text: clean }];
}

/**
 * Extracts a compelling title from raw output.
 */
export function extractStoryTitle(rawText: string, fallback: string = 'Untitled Story'): string {
  if (!rawText) return fallback;

  // Look for "TITLE: ..." or "Title: ..."
  const match = rawText.match(/^(?:TITLE|Title|Story Title|ခေါင်းစဉ်)\s*[:=]\s*(.+)$/m);
  if (match && match[1]) {
    const clean = match[1].replace(/[*#"`]/g, '').trim();
    if (clean.length > 0) return clean;
  }

  // Check first header line
  const firstLine = rawText.split('\n')[0].replace(/[*#"`]/g, '').trim();
  if (firstLine.length > 3 && firstLine.length < 80 && !firstLine.toLowerCase().startsWith('part')) {
    return firstLine;
  }

  return fallback;
}

/**
 * Formats the entire story into a clean, complete .txt file layout for download.
 * Includes metadata header, beginning/middle/ending structure overview, and each full part.
 */
export function formatFullStoryForExport(story: GeneratedStory): string {
  const divider = '='.repeat(60);
  const subDivider = '-'.repeat(60);

  let output = `${divider}\n`;
  output += `STORYVERSE AI — AI STORY CREATION STUDIO\n`;
  output += `${divider}\n\n`;
  output += `TITLE: ${story.title}\n`;
  output += `GENRE: ${story.genre}\n`;
  output += `SETTING / BACKGROUND: ${story.background}\n`;
  output += `TARGET DURATION: ${story.duration}\n`;
  output += `TOTAL PARTS: ${story.parts.length}\n`;
  output += `EXPORT DATE: ${new Date().toLocaleString()}\n\n`;
  output += `ORIGINAL STORY IDEA:\n${story.idea}\n\n`;
  output += `${divider}\n`;
  output += `COMPLETE STORY BY PARTS\n`;
  output += `${divider}\n\n`;

  story.parts.forEach((part) => {
    output += `[${part.title.toUpperCase()}]\n\n`;
    output += `${part.text.trim()}\n\n`;
    output += `${subDivider}\n\n`;
  });

  output += `End of Story — Created with StoryVerse AI\n`;
  return output;
}

/**
 * Redacts any API key sequences from logs, error strings, and debug data.
 */
export function redactSecrets(text: string): string {
  if (!text) return '';
  return String(text)
    // Redact standard Google API keys (AIzaSy...)
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    // Redact key=... query parameters
    .replace(/key=[A-Za-z0-9-_]+/gi, 'key=[REDACTED]');
}

/**
 * Selects the next eligible key during rotation, handling cooldowns and error classifications.
 */
export function selectNextKey(
  keys: KeyRecord[],
  currentIndex: number,
  now: number = Date.now()
): { key: KeyRecord; nextIndex: number } | null {
  if (!keys || keys.length === 0) return null;

  for (let i = 0; i < keys.length; i++) {
    const candidateIdx = (currentIndex + i) % keys.length;
    const candidate = keys[candidateIdx];

    // Must have non-empty key
    if (!candidate.key || candidate.key.trim().length === 0) continue;
    // Skip disabled keys
    if (candidate.status === 'Disabled') continue;
    // Skip keys currently in cooldown
    if (candidate.cooldownUntil > now) continue;

    return { key: candidate, nextIndex: candidateIdx };
  }

  return null;
}
