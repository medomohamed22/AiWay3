import { getApiKey, json, methodNotAllowed } from './_lib/http.js';

const SOURCES = [
  ['chat', 'https://gen.pollinations.ai/text/models'],
  ['image', 'https://gen.pollinations.ai/image/models']
];

function arrayPayload(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.models)) return value.models;
  return [];
}

function modalities(model, key) {
  const snake = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
  const value = model[key] ?? model[snake] ?? model.capabilities?.[key] ?? model.capabilities?.[snake] ?? [];
  return Array.isArray(value) ? value.map(String) : [];
}

function normalize(model, source) {
  const id = String(model.id || model.name || model.modelId || model.model_id || model.slug || '');
  if (!id) return null;
  const inputModalities = modalities(model, 'inputModalities');
  const outputModalities = modalities(model, 'outputModalities');
  const hint = String(model.type || model.category || '').toLowerCase();
  const type = outputModalities.includes('video') || hint === 'video'
    ? 'video'
    : outputModalities.includes('image') || hint === 'image'
      ? 'image'
      : source;
  return {
    id,
    name: String(model.displayName || model.display_name || model.title || model.name || id),
    type,
    description: String(model.description || model.summary || model.provider || id),
    inputModalities,
    outputModalities
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const key = getApiKey();
    const settled = await Promise.allSettled(SOURCES.map(async ([source, url]) => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`${source} models: ${response.status}`);
      return arrayPayload(await response.json())
        .filter(m => !(m.paidOnly || m.paid_only || m.hidden || m.disabled || m.available === false))
        .map(m => normalize(m, source))
        .filter(Boolean);
    }));
    const dedup = new Map();
    settled.forEach(result => {
      if (result.status !== 'fulfilled') return;
      result.value.forEach(model => dedup.set(`${model.type}:${model.id}`, model));
    });
    const order = { image: 0, video: 1, chat: 2 };
    const models = [...dedup.values()].sort((a, b) => (order[a.type] - order[b.type]) || a.name.localeCompare(b.name));
    return json(res, 200, { models });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
