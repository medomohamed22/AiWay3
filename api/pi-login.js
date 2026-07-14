import { allowMethods, db, handleError, json, rateLimit, signAppToken } from './_lib.js';

const PI_BASE = (process.env.PI_API_BASE_URL || 'https://api.minepi.com').replace(/\/$/, '');

async function readPiUser(accessToken) {
  // Pi's documented identity endpoint is /me. The /v2/me fallback keeps
  // compatibility with deployments that previously used that route.
  const paths = ['/me', '/v2/me'];
  let lastStatus = 0;

  for (const path of paths) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${PI_BASE}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      lastStatus = response.status;
      const body = await response.json().catch(() => null);

      if (response.ok && body?.uid && body?.username) return body;
      if (response.status !== 404) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  const error = new Error('INVALID_PI_TOKEN');
  error.status = lastStatus;
  throw error;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    await rateLimit(req, { key: 'pi-login', limit: 20, windowSeconds: 600 });

    const accessToken = String(req.body?.accessToken || '').trim();
    if (accessToken.length < 20 || accessToken.length > 4096) {
      return json(res, 400, { error: 'Pi access token is missing or invalid' });
    }

    const piUser = await readPiUser(accessToken);
    const piUid = String(piUser.uid).trim();
    const username = String(piUser.username).trim().slice(0, 80);

    const supabase = db();
    const { data: existing, error: readError } = await supabase
      .from('users')
      .select('id, pi_uid, username, role, created_at')
      .eq('pi_uid', piUid)
      .maybeSingle();
    if (readError) throw readError;

    let user = existing;
    if (existing) {
      const { data, error } = await supabase
        .from('users')
        .update({ username, last_login_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, pi_uid, username, role, created_at')
        .single();
      if (error) throw error;
      user = data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({ pi_uid: piUid, username, role: 'user', last_login_at: new Date().toISOString() })
        .select('id, pi_uid, username, role, created_at')
        .single();
      if (error) throw error;
      user = data;
    }

    const token = await signAppToken(user);
    return json(res, 200, { token, user });
  } catch (error) {
    if (error?.message === 'INVALID_PI_TOKEN') {
      console.error('Pi identity verification failed', { status: error.status });
      return json(res, 401, { error: 'Pi authentication failed. Please reopen the app in Pi Browser and try again.' });
    }
    return handleError(error, res, 'Unable to complete Pi sign-in');
  }
}
