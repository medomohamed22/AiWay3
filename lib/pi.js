export async function verifyPiAccessToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token.length > 4096) throw Object.assign(new Error('Pi login is required.'), { status: 401 });
  const response = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user.uid) throw Object.assign(new Error('Pi session is invalid or expired.'), { status: 401 });
  return { token, user };
}
