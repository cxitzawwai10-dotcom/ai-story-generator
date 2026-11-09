import { useState, useEffect, useRef, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { CreateStoryView, StoryFormData } from './components/CreateStoryView';
import { StoryView } from './components/StoryView';
import { ApiSettingsView } from './components/ApiSettingsView';
import { DebugCenterView, DebugLogEntry } from './components/DebugCenterView';
import { LoadingOverlay } from './components/LoadingOverlay';
import {
  KeyRecord,
  GeneratedStory,
  segmentStoryIntoParts,
  extractStoryTitle,
  redactSecrets,
  selectNextKey,
} from './utils/storyEngine';

const STORAGE_KEYS_KEY = 'storyverse_keys_v1';
const STORAGE_STORY_KEY = 'storyverse_active_story_v1';
const STORAGE_AUTOROTATE_KEY = 'storyverse_autorotate_v1';
const STORAGE_FORM_KEY = 'storyverse_form_data_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('create');

  // Form State
  const [formData, setFormData] = useState<StoryFormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FORM_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      idea: '',
      genre: 'Horror',
      background: 'မြန်မာ့ကျေးလက်နောက်ခံ',
      customBackground: '',
      durationValue: 15,
      durationUnit: 'Minutes',
    };
  });

  // Story State
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return null;
  });

  const [activePartIndex, setActivePartIndex] = useState<number>(0);

  // API Key State
  const [keys, setKeys] = useState<KeyRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS_KEY);
      if (saved) {
        const parsed: KeyRecord[] = JSON.parse(saved);
        return parsed.map((k) => ({
          ...k,
          status: k.status === 'Running' || k.status === 'Testing' ? 'Standby' : k.status,
          reqState: 'Idle',
          cooldownUntil: 0,
        }));
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'Key-01',
        key: '',
        status: 'Standby',
        reqState: 'Idle',
        lastTest: 'Not Tested',
        lastUsed: '-',
        requests: 0,
        success: 0,
        errors: 0,
        cooldownUntil: 0,
      },
    ];
  });

  const [autoRotation, setAutoRotation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTOROTATE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return true;
  });

  // Server Integration Status
  const [serverStatus, setServerStatus] = useState<{
    hasServerKey: boolean;
    serverKeyMasked: string | null;
  }>({
    hasServerKey: false,
    serverKeyMasked: null,
  });

  // Loading & Progress Overlay State
  const [loadingState, setLoadingState] = useState<{
    isOpen: boolean;
    stageText: string;
    progressPercent: number;
  }>({
    isOpen: false,
    stageText: 'Initializing story engine...',
    progressPercent: 10,
  });

  const [isTestingKeys, setIsTestingKeys] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef<boolean>(false);

  // Log Helper
  const addLog = useCallback(
    (type: string, message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const safeMsg = redactSecrets(message);
      const newEntry: DebugLogEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        time: new Date().toLocaleTimeString(),
        type,
        status,
        message: safeMsg,
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 99)]);
    },
    []
  );

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Persist State
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formData));
    } catch {
      // Ignore
    }
  }, [formData]);

  useEffect(() => {
    try {
      const sanitizedKeys = keys.map((k) => ({
        ...k,
        reqState: 'Idle',
      }));
      localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(sanitizedKeys));
    } catch {
      // Ignore
    }
  }, [keys]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUTOROTATE_KEY, JSON.stringify(autoRotation));
    } catch {
      // Ignore
    }
  }, [autoRotation]);

  useEffect(() => {
    try {
      if (currentStory) {
        localStorage.setItem(STORAGE_STORY_KEY, JSON.stringify(currentStory));
      }
    } catch {
      // Ignore
    }
  }, [currentStory]);

  // Check Backend Server Status on Mount
  useEffect(() => {
    addLog('SYSTEM', 'StoryVerse AI application initialized. Verifying backend API status...');
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setServerStatus({
          hasServerKey: !!data.hasServerKey,
          serverKeyMasked: data.serverKeyMasked || null,
        });
        if (data.hasServerKey) {
          addLog('SYSTEM', `Connected to backend. Attached server key active: ${data.serverKeyMasked}`, 'success');
        } else {
          addLog('SYSTEM', 'Connected to backend. No server-side GEMINI_API_KEY detected in env.', 'info');
        }
      })
      .catch((err) => {
        addLog('SYSTEM', `Backend status probe failed: ${err.message}`, 'warning');
      });
  }, [addLog]);

  // --- KEY MANAGEMENT ACTIONS ---
  const handleAddKey = () => {
    setKeys((prev) => {
      const nextNum = prev.length + 1;
      const id = `Key-${nextNum < 10 ? '0' + nextNum : nextNum}`;
      addLog('API_SETTINGS', `Created new key configuration slot: ${id}`);
      return [
        ...prev,
        {
          id,
          key: '',
          status: 'Standby',
          reqState: 'Idle',
          lastTest: 'Not Tested',
          lastUsed: '-',
          requests: 0,
          success: 0,
          errors: 0,
          cooldownUntil: 0,
        },
      ];
    });
  };

  const handleRemoveKey = (index: number) => {
    setKeys((prev) => {
      const removedId = prev[index]?.id;
      const updated = prev.filter((_, idx) => idx !== index);
      // Re-number
      const renumbered = updated.map((k, i) => {
        const num = i + 1;
        return {
          ...k,
          id: `Key-${num < 10 ? '0' + num : num}`,
        };
      });
      addLog('API_SETTINGS', `Removed slot ${removedId}. Updated slot numbering.`);
      return renumbered;
    });
  };

  const handleUpdateKey = (index: number, value: string) => {
    setKeys((prev) =>
      prev.map((k, idx) =>
        idx === index
          ? {
              ...k,
              key: value.trim(),
              status: 'Standby',
              lastTest: 'Modified (Unverified)',
            }
          : k
      )
    );
  };

  // --- TEST API CONNECTIONS ---
  const handleTestConnections = async () => {
    setIsTestingKeys(true);
    addLog('TEST_KEY', 'Starting authenticated connection tests against Google Gemini API...');
    showToast('Testing configured API keys...');

    for (let i = 0; i < keys.length; i++) {
      const target = keys[i];

      // Mark testing
      setKeys((prev) =>
        prev.map((k, idx) => (idx === i ? { ...k, status: 'Testing', reqState: 'Active' } : k))
      );

      try {
        const keyToSend = target.key.trim().length > 0 ? target.key.trim() : (serverStatus.hasServerKey ? 'SERVER_DEFAULT' : '');
        
        if (!keyToSend) {
          setKeys((prev) =>
            prev.map((k, idx) =>
              idx === i
                ? { ...k, status: 'InvalidKey', reqState: 'Idle', lastTest: 'Empty Key Input' }
                : k
            )
          );
          addLog('TEST_KEY', `${target.id} test failed: Key field is empty.`, 'warning');
          continue;
        }

        const resp = await fetch('/api/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToSend }),
        });

        const data = await resp.json();

        if (data.success) {
          setKeys((prev) =>
            prev.map((k, idx) =>
              idx === i
                ? {
                    ...k,
                    status: 'Connected',
                    reqState: 'Idle',
                    lastTest: 'Connected (200 OK)',
                  }
                : k
            )
          );
          addLog('TEST_KEY', `${target.id} successfully connected to Gemini API.`, 'success');
        } else {
          const mappedStatus = (data.status as KeyRecord['status']) || 'Error';
          let conciseResult: string = mappedStatus;
          if (mappedStatus === 'InvalidKey') conciseResult = 'Invalid Key (400)';
          else if (mappedStatus === 'QuotaExceeded') conciseResult = 'Quota Exceeded (429)';
          else if (mappedStatus === 'RateLimited') conciseResult = 'Rate Limited (429)';
          else if (mappedStatus === 'ServerError') conciseResult = 'Server Unavailable (503)';
          else if (mappedStatus === 'NetworkError') conciseResult = 'Network Error';
          else conciseResult = 'Connection Error';

          setKeys((prev) =>
            prev.map((k, idx) =>
              idx === i
                ? {
                    ...k,
                    status: mappedStatus,
                    reqState: 'Idle',
                    lastTest: conciseResult,
                  }
                : k
            )
          );
          addLog('TEST_KEY', `${target.id} probe returned ${mappedStatus}: ${data.message || conciseResult}`, 'error');
        }
      } catch (err: any) {
        setKeys((prev) =>
          prev.map((k, idx) =>
            idx === i
              ? {
                  ...k,
                  status: 'Error',
                  reqState: 'Idle',
                  lastTest: 'Network Error',
                }
              : k
          )
        );
        addLog('TEST_KEY', `${target.id} network error: ${err.message}`, 'error');
      }
    }

    setIsTestingKeys(false);
    showToast('API Connection tests finished.');
  };

  // --- RUN & CREATE STORY PIPELINE ---
  const handleRunCreateStory = async () => {
    // 1. Prevent duplicate requests
    if (isGeneratingRef.current) {
      console.warn('[StoryVerse] Duplicate generation request blocked while already running.');
      return;
    }

    setValidationError(null);

    // 2. Validation
    if (!formData.idea || formData.idea.trim().length === 0) {
      setValidationError('Please enter a story idea or outline before generating.');
      addLog('VALIDATION', 'Rejected empty story idea input.', 'warning');
      return;
    }

    // 3. Determine eligible keys
    const validCustomKeys = keys.filter((k) => k.key && k.key.trim().length > 5);
    const canUseServerKey = serverStatus.hasServerKey;

    if (validCustomKeys.length === 0 && !canUseServerKey) {
      setValidationError('No Gemini API key available. Please configure an API key in API Settings.');
      setActiveTab('settings');
      addLog('ENGINE', 'Generation stopped: No API keys configured.', 'error');
      return;
    }

    isGeneratingRef.current = true;
    abortControllerRef.current = new AbortController();

    // Attach 45-second client timeout
    const clientTimeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('timeout');
      }
    }, 45000);

    setLoadingState({
      isOpen: true,
      stageText: 'Analyzing your story idea & premise...',
      progressPercent: 15,
    });

    console.log('[StoryVerse] API request start:', {
      genre: formData.genre,
      background: formData.background,
      duration: `${formData.durationValue} ${formData.durationUnit}`,
      ideaLength: formData.idea.length,
    });
    addLog('STORY_REQUEST', `Initiating generation for genre "${formData.genre}", setting "${formData.background}"...`);

    const totalMinutes = formData.durationUnit === 'Hours' ? formData.durationValue * 60 : formData.durationValue;
    const keysToTry: (KeyRecord | 'SERVER_DEFAULT')[] =
      validCustomKeys.length > 0 ? validCustomKeys : ['SERVER_DEFAULT'];

    let storyGenerated = false;

    try {
      for (let attemptIdx = 0; attemptIdx < keysToTry.length; attemptIdx++) {
        const activeCandidate = keysToTry[attemptIdx];
        const isServerKey = activeCandidate === 'SERVER_DEFAULT';
        const keyId = isServerKey ? 'ServerKey' : activeCandidate.id;
        const rawKeyValue = isServerKey ? 'SERVER_DEFAULT' : activeCandidate.key;

        // Update Key State in Hook Table
        if (!isServerKey) {
          setKeys((prev) =>
            prev.map((k) =>
              k.id === keyId
                ? {
                    ...k,
                    status: 'Running',
                    reqState: 'Active',
                    requests: k.requests + 1,
                    lastUsed: new Date().toLocaleTimeString(),
                  }
                : k
            )
          );
        }

        setLoadingState((prev) => ({
          ...prev,
          stageText: 'Building the story structure & world...',
          progressPercent: 35,
        }));
        await new Promise((r) => setTimeout(r, 120));

        setLoadingState((prev) => ({
          ...prev,
          stageText: 'Creating characters and setting narrative tone...',
          progressPercent: 55,
        }));
        await new Promise((r) => setTimeout(r, 120));

        setLoadingState((prev) => ({
          ...prev,
          stageText: 'Writing beginning, middle, and developing resolution...',
          progressPercent: 75,
        }));

        console.log(`[StoryVerse] Sending generation request to backend using ${keyId}...`);
        addLog('ENGINE', `Sending generation request to Gemini using ${keyId}...`);

        let response: Response;
        try {
          response = await fetch('/api/generate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: rawKeyValue,
              idea: formData.idea,
              genre: formData.genre,
              background: formData.background,
              customBackground: formData.customBackground,
              durationMinutes: totalMinutes,
            }),
            signal: abortControllerRef.current?.signal,
          });
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') {
            throw fetchErr;
          }
          throw new Error(`Network failure communicating with story generation backend: ${fetchErr.message}`);
        }

        console.log('[StoryVerse] API response status:', response.status);

        let data: any;
        try {
          data = await response.json();
        } catch (jsonErr: any) {
          console.error('[StoryVerse] Response parsing error:', jsonErr);
          throw new Error('Server returned an unparseable response.');
        }

        if (!response.ok || !data.success) {
          const errMsg = data.message || 'Generation failed';
          const errorType = data.errorType || 'Error';

          if (!isServerKey) {
            setKeys((prev) =>
              prev.map((k) =>
                k.id === keyId
                  ? {
                      ...k,
                      status: errorType === 'QuotaExceeded' ? 'QuotaExceeded' : 'Error',
                      reqState: 'Idle',
                      errors: k.errors + 1,
                      cooldownUntil: errorType === 'QuotaExceeded' ? Date.now() + 60000 : 0,
                    }
                  : k
              )
            );
          }

          addLog('ENGINE_ERROR', `${keyId} error: ${errMsg}`, 'error');

          if (autoRotation && attemptIdx < keysToTry.length - 1) {
            addLog('ROTATION', `Auto-rotating from ${keyId} to next key due to ${errorType}.`);
            continue;
          } else {
            throw new Error(`[${keyId}] ${errMsg}`);
          }
        }

        // Validate response content
        const rawStory = data.rawStory as string;
        if (!rawStory || typeof rawStory !== 'string' || rawStory.trim().length === 0) {
          throw new Error('The AI model returned an incomplete narrative. Please retry.');
        }

        setLoadingState((prev) => ({
          ...prev,
          stageText: 'Organizing story parts & polishing narrative endings...',
          progressPercent: 92,
        }));

        const targetPartsCount = data.targetParts || Math.round(totalMinutes / 6);
        const parts = segmentStoryIntoParts(rawStory, targetPartsCount);
        const title = extractStoryTitle(rawStory, 'The Chronicles of StoryVerse');

        const newStory: GeneratedStory = {
          id: 'story_' + Date.now(),
          title,
          idea: formData.idea,
          genre: formData.genre,
          background:
            formData.background === 'စိတ်ကြိုက်နောက်ခံ' && formData.customBackground
              ? `Custom: ${formData.customBackground}`
              : formData.background,
          duration: `${formData.durationValue} ${formData.durationUnit}`,
          durationMinutes: totalMinutes,
          parts,
          rawText: rawStory,
          createdAt: new Date().toISOString(),
        };

        if (!isServerKey) {
          setKeys((prev) =>
            prev.map((k) =>
              k.id === keyId
                ? {
                    ...k,
                    status: 'Connected',
                    reqState: 'Idle',
                    success: k.success + 1,
                  }
                : k
            )
          );
        }

        setCurrentStory(newStory);
        setActivePartIndex(0);
        storyGenerated = true;

        setLoadingState((prev) => ({
          ...prev,
          stageText: 'Story complete! Loading into studio...',
          progressPercent: 100,
        }));

        console.log('[StoryVerse] API response completion: Story created successfully with', parts.length, 'parts.');
        addLog('ENGINE_SUCCESS', `Story "${title}" created successfully with ${parts.length} parts!`, 'success');

        await new Promise((r) => setTimeout(r, 250));
        setActiveTab('story');
        showToast('Story created successfully!');
        break; // Successfully generated, break out of loop
      }
    } catch (err: any) {
      console.error('[StoryVerse] Story generation error:', err);
      if (err.name === 'AbortError' || err === 'timeout') {
        const isTimeout = abortControllerRef.current?.signal?.reason === 'timeout' || err === 'timeout';
        if (isTimeout) {
          setValidationError('Story generation timed out after 45 seconds. Please try again.');
          addLog('TIMEOUT', 'Story generation timed out after 45 seconds.', 'error');
          showToast('Request timed out.');
        } else {
          addLog('USER_ACTION', 'Story generation cancelled by user.', 'warning');
          showToast('Generation cancelled.');
        }
      } else {
        setValidationError(err.message || 'Generation failed. Please check your API keys and try again.');
        addLog('FATAL_ERROR', `Story generation failed: ${err.message}`, 'error');
        showToast('Generation failed: ' + (err.message?.slice(0, 60) || 'Error'));
      }
    } finally {
      clearTimeout(clientTimeoutId);
      isGeneratingRef.current = false;
      setLoadingState({ isOpen: false, stageText: '', progressPercent: 0 });
      abortControllerRef.current = null;
      console.log('[StoryVerse] Loading state reset: closed');
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // --- STORY ACTIONS ---
  const handleEditInStudio = () => {
    if (currentStory) {
      setFormData((prev) => ({
        ...prev,
        idea: currentStory.idea || currentStory.rawText,
        genre: currentStory.genre || prev.genre,
      }));
      setActiveTab('create');
      showToast('Loaded story into Create tab.');
    }
  };

  const handleRegenerateStory = () => {
    handleRunCreateStory();
  };

  const handleNewStory = () => {
    setFormData((prev) => ({ ...prev, idea: '' }));
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen bg-[#070A13] text-slate-100 flex flex-col selection:bg-[#7C3AED]/40 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasStory={Boolean(currentStory)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-20">
        {activeTab === 'create' && (
          <CreateStoryView
            formData={formData}
            onChange={(upd) => setFormData((prev) => ({ ...prev, ...upd }))}
            onSubmit={handleRunCreateStory}
            isGenerating={loadingState.isOpen}
            validationError={validationError}
          />
        )}

        {activeTab === 'story' && (
          <StoryView
            story={currentStory}
            activePartIndex={activePartIndex}
            onSelectPart={setActivePartIndex}
            onEditInStudio={handleEditInStudio}
            onRegenerate={handleRegenerateStory}
            onNewStory={handleNewStory}
            onNotify={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <ApiSettingsView
            keys={keys}
            autoRotation={autoRotation}
            onAddKey={handleAddKey}
            onRemoveKey={handleRemoveKey}
            onUpdateKey={handleUpdateKey}
            onToggleAutoRotation={setAutoRotation}
            onTestConnections={handleTestConnections}
            isTesting={isTestingKeys}
            hasServerKey={serverStatus.hasServerKey}
            serverKeyMasked={serverStatus.serverKeyMasked}
          />
        )}

        {activeTab === 'debug' && (
          <DebugCenterView
            keys={keys}
            logs={logs}
            onClearLogs={() => {
              setLogs([]);
              showToast('Logs cleared.');
            }}
          />
        )}
      </main>

      {/* Loading Dialog */}
      <LoadingOverlay
        isOpen={loadingState.isOpen}
        stageText={loadingState.stageText}
        progressPercent={loadingState.progressPercent}
        onCancel={handleCancelGeneration}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0E1424] border border-[#7C3AED]/50 text-white px-4 py-2.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
