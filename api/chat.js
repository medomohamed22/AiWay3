import { getApiKey, fetchWithTimeout, handleError, sendJson, methodNotAllowed, readJson, readUpstreamError } from './_lib/http.js';

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { model, messages } = await readJson(req);
    if (!model || !Array.isArray(messages)) {
      return sendJson(res, 400, { error: 'model and messages are required.', code: 'INVALID_REQUEST' });
    }

    const response = await fetchWithTimeout('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({ model, messages })
    }, 55000);

    if (!response.ok) {
      const message = await readUpstreamError(response, `Chat request failed (${response.status}).`);
      return sendJson(res, response.status, { error: message, code: 'UPSTREAM_ERROR' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return sendJson(res, 502, {
        error: text || 'The AI provider returned an invalid response.',
        code: 'INVALID_UPSTREAM_RESPONSE'
      });
    }

    const data = await response.json();
    return sendJson(res, 200, data);
  } catch (error) {
    return handleError(res, error);
  }
}
