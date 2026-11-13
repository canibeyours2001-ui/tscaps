import { fetchFile } from '@ffmpeg/util';
import {
  loadBrowserFfmpeg, inputName, mediaBuffer, MAX_BROWSER_VIDEO_BYTES,
} from '@core/videos/infrastructure/ffmpeg/BrowserFfmpeg';

/**
 * Extract a compact, mono, 16 kHz FLAC entirely in the browser.
 * Used only if the normal MediaBunny/WebAudio decoder fails or if
 * raw PCM is too big for Groq's free upload limit.
 */
export async function extractGroqAudio(source: Blob): Promise<Blob> {
  if (source.size > MAX_BROWSER_VIDEO_BYTES) {
    throw new Error('Audio extraction exceeds the browser safety limit of 90 MB. ' +
      'Upload a shorter video or an MP3/FLAC audio file.');
  }
  const ffmpeg = await loadBrowserFfmpeg();
  const sourcePath = inputName(source);
  const outputPath = 'groq-audio.flac';
  try {
    await ffmpeg.writeFile(sourcePath, await fetchFile(source));
    const exitCode = await ffmpeg.exec([
      '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
      '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000',
      '-c:a', 'flac', outputPath,
    ]);
    if (exitCode !== 0) throw new Error('FFmpeg audio extraction failed (exit ' + exitCode + ').');
    const data = mediaBuffer(await ffmpeg.readFile(outputPath));
    if (data.byteLength < 100) throw new Error('No audio data was extracted.');
    return new Blob([data], { type: 'audio/flac' });
  } catch (cause) {
    throw new Error('Could not extract a compatible audio track. ' +
      (cause instanceof Error ? cause.message : String(cause)), { cause });
  } finally {
    ffmpeg.terminate();
  }
}
