import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// Default primary model: fast, reliable, active
const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Creates a GoogleGenAI client with the specified key or the server-side environment key.
 * Strictly sets User-Agent header for telemetry as required by guidelines.
 */
function getTargetApiKey(customKey?: string): { key: string; keySource: 'custom' | 'server' } {
  const isCustom = customKey && customKey.trim().length > 0 && customKey !== 'SERVER_DEFAULT';
  const keyToUse = isCustom ? customKey.trim() : process.env.GEMINI_API_KEY;

  if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY' || keyToUse.trim().length === 0) {
    throw new Error('No API key provided or configured.');
  }

  return {
    key: keyToUse.trim(),
    keySource: isCustom ? 'custom' : 'server',
  };
}

// 1. Health & Server Status Endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  const envKey = process.env.GEMINI_API_KEY;
  const hasServerKey = Boolean(envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey.trim().length > 10);
  const serverKeyMasked = hasServerKey ? `AIza...${envKey!.slice(-4)}` : null;

  res.json({
    status: 'online',
    appName: 'StoryVerse AI',
    hasServerKey,
    serverKeyMasked,
    defaultModel: PRIMARY_MODEL,
    serverTime: new Date().toISOString(),
  });
});

// Helper for timing out slow operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ]);
}

// 2. Lightweight Key Testing Endpoint
app.post('/api/test-key', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  console.log('[Server API] Key connection test initiated');

  try {
    let keyInfo: { key: string; keySource: 'custom' | 'server' };
    try {
      keyInfo = getTargetApiKey(apiKey);
    } catch {
      console.log('[Server API] Key test failed: empty key');
      return res.status(200).json({
        success: false,
        status: 'InvalidKey',
        message: 'API key is empty or not configured.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: keyInfo.key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Run lightweight probe using PRIMARY_MODEL with 10s timeout
    const probePromise = ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: 'ping',
    });

    const probeResponse = await withTimeout(probePromise, 10000, 'Connection timed out after 10 seconds');

    if (probeResponse && probeResponse.text) {
      console.log('[Server API] Key test successful: 200 OK');
      return res.json({
        success: true,
        status: 'Connected',
        keySource: keyInfo.keySource,
        message: 'Successfully verified connection to Google Gemini API (200 OK).',
      });
    }

    return res.status(200).json({
      success: false,
      status: 'Error',
      message: 'Gemini API returned an empty response.',
    });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '');
    const errStatus = error?.status || error?.statusCode || 500;
    console.error('[Server API] Key test error:', errMsg);

    let classifiedStatus = 'Error';
    if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('400') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('403') ||
      errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
    ) {
      classifiedStatus = 'InvalidKey';
    } else if (
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('429') ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.toLowerCase().includes('rate limit')
    ) {
      classifiedStatus = 'QuotaExceeded';
    } else if (
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.toLowerCase().includes('high demand')
    ) {
      classifiedStatus = 'ServerError';
    } else if (
      errMsg.toLowerCase().includes('network') ||
      errMsg.toLowerCase().includes('fetch failed') ||
      errMsg.toLowerCase().includes('timed out') ||
      errMsg.toLowerCase().includes('enotfound')
    ) {
      classifiedStatus = 'NetworkError';
    }

    return res.status(200).json({
      success: false,
      status: classifiedStatus,
      rawCode: errStatus,
      message: errMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]'),
    });
  }
});

// 3. Complete Story Generation Engine Endpoint
app.post('/api/generate-story', async (req: Request, res: Response) => {
  const { apiKey, idea, genre, background, durationMinutes, customBackground, language } = req.body;
  const startTime = Date.now();

  console.log('[Server API] Story generation request received:', {
    genre,
    background,
    durationMinutes,
    ideaPreview: idea ? String(idea).slice(0, 60) : 'none',
  });

  if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
    return res.status(400).json({
      success: false,
      errorType: 'ValidationError',
      message: 'Story idea is required and cannot be empty.',
    });
  }

  const selectedBg = (background === 'စိတ်ကြိုက်နောက်ခံ' && customBackground)
    ? `Custom Setting: ${customBackground.trim()}`
    : (background || 'မြန်မာ့ကျေးလက်နောက်ခံ');

  const safeMinutes = Math.max(1, Math.min(600, Number(durationMinutes) || 15));
  const targetWords = safeMinutes * 140;
  
  let targetParts = Math.round(safeMinutes / 6);
  if (targetParts < 3) targetParts = 3;
  if (targetParts > 16) targetParts = 16;

  try {
    let keyInfo: { key: string; keySource: 'custom' | 'server' };
    try {
      keyInfo = getTargetApiKey(apiKey);
    } catch {
      return res.status(400).json({
        success: false,
        errorType: 'InvalidKey',
        message: 'No valid Gemini API key configured. Please configure an API key in API Settings.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: keyInfo.key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const isBurmese = language === 'my' || /[\u1000-\u109F]/.test(idea);

    const systemInstruction = `You are the master narrative architect and literary author for StoryVerse AI.
Your task is to write a complete, emotionally resonant, high-quality story based on the user's input.

CRITICAL STORYTELLING RULES:
1. BACKGROUND INTEGRATION:
   - Setting: "${selectedBg}"
   - Embed this environment deeply into the world, character habits, dialogue, architecture, scents, sounds, and plot conflict.
   - For Myanmar rural background (မြန်မာ့ကျေးလက်နောက်ခံ): describe traditional wooden/bamboo houses, rural roads, water ponds, banyan/tamarind trees, village monasteries, and local village culture.
   - For Myanmar urban background (မြန်မာ့မြို့ပြနောက်ခံ): describe bustling streets, tea shops, modern and traditional colonial buildings, markets, and apartment life.
   - For Chinese/Japanese/Korean/Indian/Western or custom backgrounds: weave genuine cultural details, architectural motifs, and atmospheric landscapes throughout the entire narrative.

2. GENRE CONVENTIONS:
   - Genre: "${genre || 'Drama'}"
   - Adhere strictly to the pacing, tension, tone, and emotional beats characteristic of this genre.

3. STRUCTURE & DURATION:
   - Target estimated narration duration: ${safeMinutes} Minutes (approx ${targetWords} words).
   - The story MUST feature a distinct Beginning (inciting incident & character introduction), compelling Middle (rising conflict, complications, suspense), and satisfying Ending (complete resolution).
   - Divide the entire story into EXACTLY ${targetParts} sequential parts.
   - Format each part header on its own line exactly as:
     Part-1: [Part Title]
     Part-2: [Part Title]
     ...
     Part-${targetParts}: [Part Title]

4. LANGUAGE:
   ${isBurmese
     ? 'Write the story in natural, rich, literary Burmese (မြန်မာစာ) with correct spelling and natural prose.' 
     : 'Write the story in vivid, immersive, cinematic English (unless the user explicitly entered Burmese text).'
   }

5. CONTINUITY:
   - Maintain strict continuity of character names, motives, timeline, and relationships across all parts.
   - Never truncate or stop at an outline; produce the actual full narrative text.
   - At the very first line of your response, write: "TITLE: [Compelling Story Title]".`;

    const userPrompt = `[STORY IDEA]:
${idea.trim()}

[GENRE]: ${genre || 'Drama'}
[BACKGROUND]: ${selectedBg}
[ESTIMATED DURATION]: ${safeMinutes} Minutes (~${targetWords} words equivalent)
[REQUIRED NUMBER OF PARTS]: ${targetParts}

Write the complete narrative from Title through Part-${targetParts}. Ensure every part is rich and complete.`;

    console.log(`[Server API] Calling model ${PRIMARY_MODEL} for generation...`);

    let storyText = '';
    let modelUsed = PRIMARY_MODEL;

    try {
      const generatePromise = ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
        },
      });

      // 40 second timeout
      const response = await withTimeout(generatePromise, 40000, 'Generation request timed out after 40 seconds');
      storyText = response.text || '';
    } catch (primaryErr: any) {
      console.warn(`[Server API] ${PRIMARY_MODEL} generation error:`, primaryErr.message);
      // Try fallback model if 503 or model error
      if (primaryErr.message?.includes('503') || primaryErr.message?.includes('UNAVAILABLE') || primaryErr.message?.includes('not found')) {
        console.log(`[Server API] Attempting fallback model ${FALLBACK_MODEL}...`);
        modelUsed = FALLBACK_MODEL;
        const fallbackPromise = ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction,
          },
        });
        const fallbackResponse = await withTimeout(fallbackPromise, 35000, 'Fallback model timed out');
        storyText = fallbackResponse.text || '';
      } else {
        throw primaryErr;
      }
    }

    if (!storyText || storyText.trim().length === 0) {
      console.error('[Server API] Model returned empty story text');
      return res.status(500).json({
        success: false,
        errorType: 'EmptyResponse',
        message: 'The model returned an empty narrative. Please try again with additional details.',
      });
    }

    console.log(`[Server API] Story generation completed in ${Date.now() - startTime}ms. Output length: ${storyText.length} characters.`);

    return res.json({
      success: true,
      rawStory: storyText,
      keySource: keyInfo.keySource,
      durationMinutes: safeMinutes,
      targetParts,
      modelUsed,
    });

  } catch (error: any) {
    const errMsg = String(error?.message || error || '');
    const errStatus = error?.status || error?.statusCode || 500;
    console.error('[Server API] Story generation fatal error:', errMsg);

    let errorCategory = 'ServerGeminiError';
    if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('400') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('403') ||
      errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
    ) {
      errorCategory = 'InvalidKey';
    } else if (
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('429') ||
      errMsg.toLowerCase().includes('quota')
    ) {
      errorCategory = 'QuotaExceeded';
    } else if (
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.toLowerCase().includes('high demand')
    ) {
      errorCategory = 'ServerError';
    } else if (errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch failed') || errMsg.toLowerCase().includes('timed out')) {
      errorCategory = 'NetworkError';
    }

    return res.status(500).json({
      success: false,
      errorType: errorCategory,
      rawStatus: errStatus,
      message: errMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]'),
    });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StoryVerse AI Studio server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
