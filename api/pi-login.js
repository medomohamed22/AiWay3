import { allowMethods, db, handleError, json, rateLimit, signAppToken } from './_lib.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  try {
    await rateLimit(req,{key:'pi-login',limit:15,windowSeconds:600});
    const accessToken = String(req.body?.accessToken || '').trim();
    if (!accessToken) return json(res, 400, { error: 'Pi access token is required' });

    const base = process.env.PI_API_BASE_URL || 'https://api.minepi.com';
    const response = await fetch(`${base}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) return json(res, 401, { error: 'Invalid Pi authentication' });

    const piUser = await response.json();
    const piUid = String(piUser.uid || '').trim();
    const username = String(piUser.username || '').trim();
    if (!piUid || !username) return json(res, 401, { error: 'Incomplete Pi user profile' });

    const supabase = db();
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ pi_uid: piUid, username, last_login_at: new Date().toISOString() }, { onConflict: 'pi_uid' })
      .select('id, pi_uid, username, role, created_at')
      .single();
    if (error) throw error;

    const token = await signAppToken(user);
    return json(res, 200, { token, user });
  } catch (error) { return handleError(error,res,'Unable to complete Pi sign-in'); }
}
