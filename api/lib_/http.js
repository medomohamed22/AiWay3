export function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return json(res, 405, { error: `Method not allowed. Use ${methods.join(' or ')}.` });
}

export function getApiKey() {
  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) throw new Error('POLLINATIONS_API_KEY is not configured.');
  return key;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
