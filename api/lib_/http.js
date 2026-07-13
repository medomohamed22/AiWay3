export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return sendJson(res, 405, { ok: false, error: `Method not allowed. Use ${methods.join(' or ')}.`, code: 'METHOD_NOT_ALLOWED' });
}

export function getApiKey({ required = true } = {}) {
  const key = String(process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY || '').trim();
  if (!key && required) {
    const error = new Error('مفتاح Pollinations غير موجود على الخادم. أضف POLLINATIONS_API_KEY لكل من Production وPreview ثم أعد النشر.');
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  return key;
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    if (!rawBody.trim()) return {};
    try { return JSON.parse(rawBody); } catch { /* continue to normalized error */ }
    const error = new Error('جسم الطلب ليس JSON صالحًا.');
    error.code = 'INVALID_JSON';
    throw error;
  }

  const chunks = [];
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch {
    const error = new Error('جسم الطلب ليس JSON صالحًا.');
    error.code = 'INVALID_JSON';
    throw error;
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 55000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function readUpstreamError(response, fallback = 'فشل طلب مزود الذكاء الاصطناعي.') {
  const raw = await response.text();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const value = parsed?.error?.message || parsed?.error || parsed?.message || parsed?.detail;
    return typeof value === 'string' ? value : JSON.stringify(value || parsed).slice(0, 1200);
  } catch {
    return raw.slice(0, 1200);
  }
}

export function handleError(res, error) {
  console.error('API_ERROR', error);
  const code = error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : (error?.code || 'SERVER_ERROR');
  const status = code === 'MISSING_API_KEY' ? 503 : code === 'INVALID_JSON' ? 400 : code === 'UPSTREAM_TIMEOUT' ? 504 : 500;
  return sendJson(res, status, { ok: false, error: error?.message || 'حدث خطأ داخلي غير متوقع.', code });
}
