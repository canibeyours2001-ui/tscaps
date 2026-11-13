import type { VideoConversionEstimate, VideoConverter } from '@core/videos/domain/VideoConverter';
import { FfmpegWasmVideoConverter } from '@core/videos/infrastructure/ffmpeg/FfmpegWasmVideoConverter';

/** Keep the existing fast HEVC converter, but cover its failures and other codecs. */
export class AdaptiveVideoConverter implements VideoConverter {
  private readonly general = new FfmpegWasmVideoConverter();
  constructor(private readonly hevc: VideoConverter) {}

  async estimate(source: File): Promise<VideoConversionEstimate | null> {
    return this.general.estimate(source);
  }

  async convert(source: File, onProgress: (n: number) => void): Promise<File> {
    // Native H.264 may be unsupported for unrelated reasons; only try the
    // optimized HEVC decoder on files that might actually contain HEVC.
    if (/\.(mov|hevc|h265)$/i.test(source.name)) {
      try {
        return await this.hevc.convert(source, onProgress);
      } catch (err) {
        console.warn('[ThitCaps] optimized HEVC conversion failed; trying FFmpeg.wasm', err);
      }
    }
    return this.general.convert(source, onProgress);
  }
}
