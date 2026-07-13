export function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return json(res, 405, { error: `Method not allowed. Use ${methods.join(' or ')}.` });
}

export function getApiKey({ required = true } = {}) {
  const key = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY || '';
  if (!key && required) {
    const error = new Error(
      'Pollinations API key is not configured. Add POLLINATIONS_API_KEY in Vercel Project Settings → Environment Variables, then redeploy.'
    );
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  return key;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('The request body is not valid JSON.');
    error.code = 'INVALID_JSON';
    throw error;
  }
}

export async function readUpstreamError(response, fallback = 'Upstream request failed.') {
  const raw = await response.text();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed.error?.message || parsed.error || parsed.message || fallback;
  } catch {
    return raw.slice(0, 1200);
  }
}

export function handleError(res, error) {
  const status = error?.code === 'MISSING_API_KEY' ? 503 : error?.code === 'INVALID_JSON' ? 400 : 500;
  return json(res, status, {
    error: error?.message || 'Unexpected server error.',
    code: error?.code || 'SERVER_ERROR'
  });
}
