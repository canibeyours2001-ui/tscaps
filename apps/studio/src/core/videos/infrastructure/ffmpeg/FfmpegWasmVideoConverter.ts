import { fetchFile } from '@ffmpeg/util';
import type { VideoConverter, VideoConversionEstimate } from '@core/videos/domain/VideoConverter';
import {
  loadBrowserFfmpeg, inputName, mediaBuffer, MAX_BROWSER_VIDEO_BYTES,
} from '@core/videos/infrastructure/ffmpeg/BrowserFfmpeg';
import { MediaBunnyVideoMetadataProbe } from '@core/videos/infrastructure/MediaBunnyVideoMetadataProbe';

/** On-demand browser-only conversion to a universally playable H.264/AAC MP4. */
export class FfmpegWasmVideoConverter implements VideoConverter {
  async estimate(source: File): Promise<VideoConversionEstimate | null> {
    try {
      const metadata = await new MediaBunnyVideoMetadataProbe().probe(source);
      const duration = metadata.durationSeconds ?? 30;
      return {
        seconds: Math.max(15, Math.ceil(duration * 6)),
        decodedPixels: (metadata.videoWidthPx ?? 1280) * (metadata.videoHeightPx ?? 720) * duration * 24,
      };
    } catch {
      return null;
    }
  }

  async convert(source: File, onProgress: (progress: number) => void): Promise<File> {
    if (source.size > MAX_BROWSER_VIDEO_BYTES) {
      throw new Error('Files over 90 MB exceed the safe browser conversion limit. ' +
        'Use your video editor to export an H.264 MP4.');
    }
    const f = await loadBrowserFfmpeg();
    const sourcePath = inputName(source);
    const outputPath = 'thitcaps-compatible.mp4';
    const handler = ({ progress }: { progress: number }) => {
      if (Number.isFinite(progress)) onProgress(Math.max(0, Math.min(0.99, progress)));
    };
    f.on('progress', handler);
    try {
      onProgress(0.02);
      await f.writeFile(sourcePath, await fetchFile(source));
      const status = await f.exec([
        '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
        '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=min(1080\\,iw):-2',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        outputPath,
      ]);
      if (status !== 0) throw new Error('FFmpeg exited with status ' + status + '.');
      const output = mediaBuffer(await f.readFile(outputPath));
      if (output.byteLength === 0) throw new Error('FFmpeg produced no output video.');
      onProgress(1);
      return new File([output], source.name.replace(/\.[^.]*$/, '') + '-thitcaps.mp4',
        { type: 'video/mp4' });
    } catch (cause) {
      throw new Error('In-browser video conversion failed: ' +
        (cause instanceof Error ? cause.message : String(cause)), { cause });
    } finally {
      f.off('progress', handler);
      f.terminate();
    }
  }
}
