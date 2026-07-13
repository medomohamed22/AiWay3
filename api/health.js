import { fetchWithTimeout, getApiKey, handleError, sendJson, methodNotAllowed } from './_lib/http.js';

export const maxDuration = 15;

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const key = getApiKey({ required: false });
    const result = {
      ok: true,
      runtime: process.version,
      keyConfigured: Boolean(key),
      keyType: key ? (key.startsWith('sk_') ? 'secret' : key.startsWith('pk_') ? 'publishable' : 'unknown') : 'missing',
      environment: process.env.VERCEL_ENV || 'local',
      providerReachable: false
    };
    const response = await fetchWithTimeout('https://gen.pollinations.ai/models', {
      headers: key ? { Authorization: `Bearer ${key}`, Accept: 'application/json' } : { Accept: 'application/json' }
    }, 10000);
    result.providerReachable = response.ok;
    result.providerStatus = response.status;
    return sendJson(res, 200, result);
  } catch (error) {
    return handleError(res, error);
  }
}
