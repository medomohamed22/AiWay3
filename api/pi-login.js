import { allowMethods, db, handleError, json, rateLimit, signAppToken } from './_lib.js';

async function verifyPiAccessToken(base, accessToken) {
  const paths = ['/me', '/v2/me'];
  let lastStatus = 401;

  for (const path of paths) {
    const response = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    lastStatus = response.status;
    const data = await response.json().catch(() => null);

    if (response.ok && data?.uid && data?.username) return data;
    if (response.status !== 404) break;
  }

  const error = new Error('INVALID_PI_AUTH');
  error.status = lastStatus;
  throw error;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    await rateLimit(req, { key: 'pi-login', limit: 20, windowSeconds: 600 });

    const accessToken = String(req.body?.accessToken || '').trim();
    if (!accessToken) {
      return json(res, 400, { error: 'Pi access token is required' });
    }

    const base = (process.env.PI_API_BASE_URL || 'https://api.minepi.com')
      .replace(/\/$/, '');

    let piUser;
    try {
      piUser = await verifyPiAccessToken(base, accessToken);
    } catch (error) {
      console.error('Pi authentication verification failed:', error.status || error.message);
      return json(res, 401, { error: 'Invalid Pi authentication' });
    }

    const piUid = String(piUser.uid || '').trim();
    const username = String(piUser.username || '').trim();

    const supabase = db();
    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          pi_uid: piUid,
          username,
          last_login_at: new Date().toISOString()
        },
        { onConflict: 'pi_uid' }
      )
      .select('id, pi_uid, username, role, created_at')
      .single();

    if (error) throw error;

    const token = await signAppToken(user);
    return json(res, 200, { token, user });
  } catch (error) {
    return handleError(error, res, 'Unable to complete Pi sign-in');
  }
}
