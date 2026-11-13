/**
 * Cloudflare Pages Function: per-request BYOK proxy.
 * Never stores, logs, caches or shares Groq keys or uploaded audio.
 */
export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const noStore = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const fail = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), { status, headers: noStore });

  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return fail(403, 'Cross-origin requests blocked.');
    } catch {
      return fail(403, 'Invalid origin.');
    }
  }
  const authorization = request.headers.get('Authorization') || '';
  const key = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (key.length < 16 || key.length > 512) return fail(401, 'Missing or invalid Groq API key.');

  const length = Number(request.headers.get('Content-Length') || '0');
  if (length > 25 * 1024 * 1024) return fail(413, 'Audio exceeds the upload limit.');

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return fail(400, 'Expected a multipart audio upload.');
  }
  const audio = input.get('file');
  const model = input.get('model');
  const language = input.get('language');
  if (!(audio instanceof File) || audio.size === 0 || audio.size > 24 * 1024 * 1024) {
    return fail(413, 'Invalid audio or file exceeds 24 MB.');
  }
  if (model !== 'whisper-large-v3' && model !== 'whisper-large-v3-turbo') {
    return fail(400, 'Unsupported transcription model.');
  }

  const upstreamBody = new FormData();
  upstreamBody.append('file', audio, 'speech.wav');
  upstreamBody.append('model', model);
  upstreamBody.append('response_format', 'verbose_json');
  upstreamBody.append('timestamp_granularities[]', 'word');
  if (typeof language === 'string' && /^[a-z]{2,3}$/.test(language)) {
    upstreamBody.append('language', language);
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: upstreamBody,
      redirect: 'error',
    });
    if (!upstream.ok) {
      return fail(upstream.status, upstream.status === 401
        ? 'Groq rejected the supplied API key.'
        : `Groq returned HTTP ${upstream.status}.`);
    }
    const data: unknown = await upstream.json();
    if (!data || typeof data !== 'object' || !Array.isArray((data as { words?: unknown }).words)) {
      return fail(502, 'No word timestamps were returned by Groq.');
    }
    // Limit the response to timed words; never return request metadata or secrets.
    return new Response(JSON.stringify({ words: (data as { words: unknown[] }).words }), {
      status: 200, headers: noStore,
    });
  } catch {
    return fail(502, 'Groq API is unreachable.');
  }
}

export function onRequestGet(): Response {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
