/** Per-browser settings. No account, cookie, shared session, or server storage. */
const STORAGE_KEY = 'thitcaps:groq-settings:v1';

export type TranscriptionProvider = 'local' | 'groq';
export type GroqModel = 'whisper-large-v3-turbo' | 'whisper-large-v3';
export interface GroqPreferences {
  provider: TranscriptionProvider;
  model: GroqModel;
  apiKey: string;
}

const DEFAULTS: GroqPreferences = {
  provider: 'local',
  model: 'whisper-large-v3-turbo',
  apiKey: '',
};

export function readGroqPreferences(): GroqPreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<GroqPreferences>;
    return {
      provider: raw.provider === 'groq' ? 'groq' : 'local',
      model: raw.model === 'whisper-large-v3' ? 'whisper-large-v3' : 'whisper-large-v3-turbo',
      apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveGroqPreferences(prefs: GroqPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    throw new Error('Browser storage is unavailable. Enable site storage to save your Groq key.');
  }
}
