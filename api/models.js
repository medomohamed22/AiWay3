import { getApiKey, handleError, json, methodNotAllowed, readUpstreamError } from './_lib/http.js';

const CATALOG_URL = 'https://gen.pollinations.ai/models';

function arrayPayload(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.models)) return value.models;
  return [];
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return [value];
  return [];
}

function modalities(model, key) {
  const snake = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
  return asStringArray(
    model[key] ?? model[snake] ?? model.capabilities?.[key] ?? model.capabilities?.[snake]
  ).map(value => value.toLowerCase());
}

function modelType(model, inputModalities, outputModalities) {
  const hint = String(
    model.type || model.category || model.endpoint || model.family || model.object || ''
  ).toLowerCase();
  const id = String(model.id || model.name || '').toLowerCase();

  if (outputModalities.includes('video') || hint.includes('video') || id.includes('video')) return 'video';
  if (outputModalities.includes('image') || hint.includes('image')) return 'image';
  if (inputModalities.includes('text') || outputModalities.includes('text') || hint.includes('text') || hint.includes('chat')) return 'chat';
  return null;
}

function isAvailableFreeModel(model) {
  if (model.hidden || model.disabled || model.available === false) return false;
  if (model.paidOnly === true || model.paid_only === true) return false;
  return true;
}

function normalize(model) {
  const id = String(model.id || model.name || model.modelId || model.model_id || model.slug || '').trim();
  if (!id) return null;

  const inputModalities = modalities(model, 'inputModalities');
  const outputModalities = modalities(model, 'outputModalities');
  const type = modelType(model, inputModalities, outputModalities);
  if (!type || !['image', 'video', 'chat'].includes(type)) return null;

  return {
    id,
    name: String(model.displayName || model.display_name || model.title || model.name || id),
    type,
    description: String(model.description || model.summary || model.provider || `${type} model`),
    inputModalities,
    outputModalities,
    paidOnly: false
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    // The model catalogue is public. Do not make the whole model menu depend on a secret key.
    const key = getApiKey({ required: false });
    const headers = { Accept: 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;

    const response = await fetch(CATALOG_URL, { headers, cache: 'no-store' });
    if (!response.ok) {
      const message = await readUpstreamError(response, `Could not load models (${response.status}).`);
      return json(res, response.status, { error: message, models: [] });
    }

    const payload = await response.json();
    const dedup = new Map();
    arrayPayload(payload)
      .filter(isAvailableFreeModel)
      .map(normalize)
      .filter(Boolean)
      .forEach(model => dedup.set(`${model.type}:${model.id}`, model));

    const order = { image: 0, video: 1, chat: 2 };
    const models = [...dedup.values()].sort(
      (a, b) => (order[a.type] - order[b.type]) || a.name.localeCompare(b.name)
    );

    return json(res, 200, { models, count: models.length });
  } catch (error) {
    return handleError(res, error);
  }
}
