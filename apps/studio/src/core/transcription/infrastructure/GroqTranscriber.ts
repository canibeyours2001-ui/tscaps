import {
  Document, Section, Segment, Line, Word, TimeFragment,
  type AudioDecoder, type TranscriberOptions,
} from '@tscaps/engine';
import type { ConfigurableTranscriber } from '@core/transcription/domain/ConfigurableTranscriber';
import type { PreprocessingProgressPhase } from '@core/preprocessing/domain/PreprocessingProgressStatus';
import type { PreprocessingProgressStore } from '@core/preprocessing/store/PreprocessingProgressStore';
import { readGroqPreferences } from '@core/transcription/infrastructure/GroqPreferences';

interface GroqWord { word: string; start: number; end: number }
const SAMPLE_RATE = 16000;
const MAX_WAV_BYTES = 24 * 1024 * 1024;

/** Browser-side BYOK transcription adapter; sends audio only on explicit Start. */
export class GroqTranscriber implements ConfigurableTranscriber {
  readonly initialPhase: PreprocessingProgressPhase = 'audio-extract';
  onUntranscribedRegion?: (region: { startSeconds: number; endSeconds: number }) => void;

  constructor(
    private readonly decoder: AudioDecoder,
    private readonly progress: PreprocessingProgressStore,
  ) {}

  setConfig(_config: unknown): void {
    // Groq model is selected in per-browser settings, not Whisper device config.
  }

  async transcribe(audio: Blob, options?: TranscriberOptions): Promise<Document> {
    const settings = readGroqPreferences();
    const key = settings.apiKey.trim();
    if (!key) throw new Error('Add your own Groq API key before starting transcription.');

    this.progress.setAudioExtractProgress(0);
    const pcm = await this.decoder.decode(audio, SAMPLE_RATE, (progress) =>
      this.progress.setAudioExtractProgress(progress),
    );
    const wav = encodeWav(pcm);
    if (wav.size > MAX_WAV_BYTES) {
      throw new Error('Audio is too long for this Groq upload (24 MB WAV limit). Try a shorter video or local Whisper.');
    }
    this.progress.enterInferringPhase();
    const form = new FormData();
    form.append('file', wav, 'speech.wav');
    form.append('model', settings.model);
    if (options?.language) form.append('language', options.language);

    // No credentials/cookies, backend state, or shared API key. Key passes through
    // same-origin Pages Function for this request only, then to Groq.
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(response.status === 401
        ? 'Groq rejected this API key. Check your key and try again.'
        : `Groq transcription failed (HTTP ${response.status}). Check quota or audio length.`);
    }
    const data: unknown = await response.json();
    if (!isGroqResponse(data)) throw new Error('Groq did not return valid word-level timestamps.');

    const words = data.words
      .filter((entry) =>
        typeof entry.word === 'string' &&
        Number.isFinite(entry.start) && Number.isFinite(entry.end) &&
        entry.end > entry.start && entry.word.trim().length > 0)
      .map((entry) => new Word({
        text: entry.word.trim(),
        time: new TimeFragment(Math.max(0, entry.start), Math.max(0, entry.end)),
      }));
    if (words.length === 0) throw new Error('Groq returned no timed words. Try local Whisper.');
    return new Document({
      sections: [new Section({
        segments: [new Segment({ lines: [new Line({ words })] })],
        kind: '',
      })],
    });
  }
}

function isGroqResponse(value: unknown): value is { words: GroqWord[] } {
  return !!value && typeof value === 'object' &&
    Array.isArray((value as { words?: unknown }).words);
}

/** Serialize 16 kHz mono Float32 audio to 16-bit PCM WAV for fast uploads. */
function encodeWav(samples: Float32Array): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const n = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, n < 0 ? n * 32768 : n * 32767, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
