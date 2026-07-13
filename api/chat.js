import { getApiKey, handleError, json, methodNotAllowed, readJson, readUpstreamError } from './_lib/http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { model, messages } = await readJson(req);
    if (!model || !Array.isArray(messages)) {
      return json(res, 400, { error: 'model and messages are required.', code: 'INVALID_REQUEST' });
    }

    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
      const message = await readUpstreamError(response, `Chat request failed (${response.status}).`);
      return json(res, response.status, { error: message, code: 'UPSTREAM_ERROR' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return json(res, 502, {
        error: text || 'The AI provider returned an invalid response.',
        code: 'INVALID_UPSTREAM_RESPONSE'
      });
    }

    const data = await response.json();
    return json(res, 200, data);
  } catch (error) {
    return handleError(res, error);
  }
}
