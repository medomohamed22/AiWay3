import { ensureUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  if (!accessToken || accessToken.length > 4096) return res.status(400).json({ error: 'رمز تسجيل دخول Pi غير صالح.' });
  try {
    const response = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 401 ? 401 : 502).json({
      error: response.status === 401 ? 'انتهت جلسة Pi أو لم تكتمل الموافقة على الصلاحيات.' : 'تعذر التحقق من حساب Pi.'
    });
    const dbUser = await ensureUser(data);
    return res.status(200).json({
      id: dbUser.id, uid: data.uid, username: data.username || '', coinBalance: dbUser.coin_balance,
      walletAddress: data.wallet_address || '', scopes: data.credentials?.scopes || [],
      validUntil: data.credentials?.valid_until || null
    });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'تعذر الاتصال بخدمة Pi أو Supabase.' });
  }
}
