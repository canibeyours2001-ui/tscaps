import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE_CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
export const MAX_BROWSER_VIDEO_BYTES = 90 * 1024 * 1024;

/** Lazy, local-only FFmpeg.wasm. No SharedArrayBuffer or media uploads. */
export async function loadBrowserFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  try {
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(CORE_CDN + '/ffmpeg-core.js', 'text/javascript'),
      toBlobURL(CORE_CDN + '/ffmpeg-core.wasm', 'application/wasm'),
    ]);
    try {
      await ffmpeg.load({ coreURL, wasmURL });
    } finally {
      URL.revokeObjectURL(coreURL);
      URL.revokeObjectURL(wasmURL);
    }
    return ffmpeg;
  } catch (err) {
    ffmpeg.terminate();
    throw new Error('FFmpeg.wasm could not load. Check network or Brave Shields. ' +
      (err instanceof Error ? err.message : String(err)), { cause: err });
  }
}

export function inputName(source: Blob): string {
  const name = source instanceof File ? source.name : 'media.mp4';
  const ext = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1] ?? 'mp4';
  return 'thitcaps-input.' + ext;
}

export function mediaBuffer(data: Uint8Array | string): ArrayBuffer {
  if (typeof data === 'string') throw new Error('Converter returned text instead of media.');
  const copy = Uint8Array.from(data);
  return copy.buffer as ArrayBuffer;
}
