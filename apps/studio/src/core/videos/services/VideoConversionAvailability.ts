import { UnsupportedVideoCodecError } from '@core/videos/domain/errors/UnsupportedVideoCodecError';
import { VideoTrackMissingError } from '@core/videos/domain/errors/VideoTrackMissingError';

/**
 * Whether a source this browser refused may be offered the in-browser
 * conversion: the conversion reads HEVC, so an HEVC refusal is the only
 * one it can lift.
 */
export class VideoConversionAvailability {

  canConvert(refusal: unknown): boolean {
    // Even a container that Mediabunny cannot parse may be readable by
    // FFmpeg.wasm. Attempt a safe, bounded local conversion before refusing.
    return refusal instanceof UnsupportedVideoCodecError ||
      refusal instanceof VideoTrackMissingError ||
      refusal instanceof Error;
  }
}
