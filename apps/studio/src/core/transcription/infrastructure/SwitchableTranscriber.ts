import type { TranscriberOptions, Document, UntranscribedRegion } from '@tscaps/engine';
import type { ConfigurableTranscriber } from '@core/transcription/domain/ConfigurableTranscriber';
import type { PreprocessingProgressPhase } from '@core/preprocessing/domain/PreprocessingProgressStatus';
import { readGroqPreferences } from '@core/transcription/infrastructure/GroqPreferences';

/** Choose the correct provider at the moment Start is pressed. */
export class SwitchableTranscriber implements ConfigurableTranscriber {
  constructor(
    private readonly local: ConfigurableTranscriber,
    private readonly groq: ConfigurableTranscriber,
  ) {}

  private active(): ConfigurableTranscriber {
    return readGroqPreferences().provider === 'groq' ? this.groq : this.local;
  }

  get initialPhase(): PreprocessingProgressPhase {
    return this.active().initialPhase;
  }

  set onUntranscribedRegion(value: ((region: UntranscribedRegion) => void) | undefined) {
    this.local.onUntranscribedRegion = value;
    this.groq.onUntranscribedRegion = value;
  }

  get onUntranscribedRegion(): ((region: UntranscribedRegion) => void) | undefined {
    return this.active().onUntranscribedRegion;
  }

  setConfig(config: unknown): void {
    this.local.setConfig(config);
    this.groq.setConfig(config);
  }

  transcribe(audio: Blob, options?: TranscriberOptions): Promise<Document> {
    return this.active().transcribe(audio, options);
  }
}
