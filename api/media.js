import { getApiKey, json, methodNotAllowed, readJson } from './_lib/http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const { model, prompt, width = 1024, height = 1024, seed = Date.now() } = await readJson(req);
    if (!model || !prompt) return json(res, 400, { error: 'model and prompt are required.' });
    const params = new URLSearchParams({
      model: String(model), width: String(width), height: String(height), seed: String(seed), nologo: 'true', key: getApiKey()
    });
    const upstream = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`);
    if (!upstream.ok) return json(res, upstream.status, { error: await upstream.text() });
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(buffer);
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
