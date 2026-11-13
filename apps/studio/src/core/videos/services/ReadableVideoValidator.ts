import type { VideoCandidate } from '@core/videos/domain/VideoCandidate';
import type { UnreadableReason, VideoValidationResult } from '@core/videos/domain/VideoValidationResult';
import type { VideoValidator } from '@core/videos/domain/VideoValidator';

/**
 * Refuses a video whose length could not be established. A settled
 * duration of `0` means the probe exhausted both the container
 * metadata and its packet-scan fallback without finding one.
 */
export class ReadableVideoValidator implements VideoValidator {
  validate(candidate: VideoCandidate): Promise<VideoValidationResult> {
    // Only refuse bytes the browser explicitly cannot read. Unknown duration
    // often means an unsupported codec/container, which FFmpeg.wasm can rescue.
    if (candidate.isSourceReadable !== false) return Promise.resolve({ state: 'accepted' });
    return Promise.resolve({
      state: 'rejected',
      details: { type: 'unreadable', reason: this.reasonFor(candidate) },
    });
  }

  /** An unprobed source reads as a container problem — the case a different file fixes. */
  private reasonFor(candidate: VideoCandidate): UnreadableReason {
    return candidate.isSourceReadable === false ? 'source-unreadable' : 'container-unreadable';
  }
}
