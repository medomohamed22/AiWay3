import { getApiKey, handleError, json, methodNotAllowed, readJson, readUpstreamError } from './_lib/http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { model, prompt, width = 1024, height = 1024, seed = Date.now() } = await readJson(req);
    if (!model || !prompt) {
      return json(res, 400, { error: 'model and prompt are required.', code: 'INVALID_REQUEST' });
    }

    const params = new URLSearchParams({
      model: String(model),
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: 'true',
      key: getApiKey()
    });

    const upstream = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`);
    if (!upstream.ok) {
      const message = await readUpstreamError(upstream, `Media request failed (${upstream.status}).`);
      return json(res, upstream.status, { error: message, code: 'UPSTREAM_ERROR' });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (contentType.includes('application/json') || contentType.startsWith('text/')) {
      const message = await upstream.text();
      return json(res, 502, { error: message || 'The media provider returned an invalid file.', code: 'INVALID_UPSTREAM_RESPONSE' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(buffer);
  } catch (error) {
    return handleError(res, error);
  }
}
