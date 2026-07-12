import { getApiKey, json, methodNotAllowed, readJson } from './_lib/http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const { model, messages } = await readJson(req);
    if (!model || !Array.isArray(messages)) return json(res, 400, { error: 'model and messages are required.' });
    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`
      },
      body: JSON.stringify({ model, messages })
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', response.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.end(text);
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
