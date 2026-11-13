import { useState } from 'react';
import {
  readGroqPreferences, saveGroqPreferences,
  type GroqPreferences, type TranscriptionProvider,
} from '@core/transcription/infrastructure/GroqPreferences';

interface Props {
  readonly onProviderChange: (provider: TranscriptionProvider) => void;
}

/** Settings are persisted in this browser profile for this origin only. */
export function GroqSettings({ onProviderChange }: Props) {
  const [settings, setSettings] = useState<GroqPreferences>(readGroqPreferences);
  const [visible, setVisible] = useState(false);
  const [storageError, setStorageError] = useState('');

  const update = (next: GroqPreferences) => {
    try {
      saveGroqPreferences(next);
      setSettings(next);
      setStorageError('');
      onProviderChange(next.provider);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to save settings.');
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-edge-subtle px-3 py-3">
      <label htmlFor="thitcaps-provider" className="text-sm font-medium text-fg-primary">
        Transcription provider
      </label>
      <select
        id="thitcaps-provider"
        className="w-full min-h-9 rounded-md bg-surface-2 border border-edge-subtle text-fg-primary px-2 text-sm"
        value={settings.provider}
        onChange={(e) => update({ ...settings, provider: e.target.value as TranscriptionProvider })}
      >
        <option value="local">Local Whisper (no upload, no API key)</option>
        <option value="groq">Groq Whisper API (my own API key)</option>
      </select>
      {settings.provider === 'groq' && (
        <>
          <label htmlFor="thitcaps-model" className="text-xs text-fg-secondary">Groq model</label>
          <select
            id="thitcaps-model"
            className="w-full min-h-9 rounded-md bg-surface-2 border border-edge-subtle text-fg-primary px-2 text-sm"
            value={settings.model}
            onChange={(e) => update({
              ...settings,
              model: e.target.value as GroqPreferences['model'],
            })}
          >
            <option value="whisper-large-v3-turbo">Whisper Large V3 Turbo (faster)</option>
            <option value="whisper-large-v3">Whisper Large V3 (higher accuracy)</option>
          </select>
          <label htmlFor="thitcaps-groq-key" className="text-xs text-fg-secondary">
            Your personal Groq API key
          </label>
          <div className="flex items-center gap-2">
            <input
              id="thitcaps-groq-key"
              type={visible ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 min-h-9 rounded-md bg-surface-2 border border-edge-subtle text-fg-primary px-2 text-sm"
              placeholder="gsk_…"
              value={settings.apiKey}
              onChange={(e) => update({ ...settings, apiKey: e.target.value })}
            />
            <button type="button" className="text-xs text-accent"
              onClick={() => setVisible((value) => !value)}>
              {visible ? 'Hide' : 'Show'}
            </button>
            <button type="button" className="text-xs text-fg-muted"
              onClick={() => update({ ...settings, apiKey: '' })}>
              Clear
            </button>
          </div>
          <p className="text-2xs text-fg-muted m-0 leading-snug">
            Saved on this browser only. No account or shared login. Audio and key are
            sent for this transcription request to Groq through ThitCaps.
            Keys in browser storage can be read by browser extensions or malicious page scripts.
            Clear the key on a shared computer.
          </p>
        </>
      )}
      {storageError && <p role="alert" className="text-xs text-danger m-0">{storageError}</p>}
    </section>
  );
}
