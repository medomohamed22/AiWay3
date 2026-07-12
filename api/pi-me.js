const PI_ME_URL = 'https://api.minepi.com/v2/me';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = typeof req.body?.accessToken === 'string'
    ? req.body.accessToken.trim()
    : '';

  if (!accessToken || accessToken.length > 4096) {
    return res.status(400).json({ error: 'رمز تسجيل الدخول غير صالح.' });
  }

  try {
    const response = await fetch(PI_ME_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(12000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status === 401 ? 401 : 502).json({
        error: response.status === 401
          ? 'انتهت صلاحية تسجيل الدخول. حاول مرة أخرى.'
          : 'تعذر التحقق من حساب Pi.'
      });
    }

    return res.status(200).json({
      uid: data.uid,
      username: data.username || '',
      validUntil: data.credentials?.valid_until || null
    });
  } catch (error) {
    return res.status(502).json({ error: 'تعذر الاتصال بخدمة Pi الآن.' });
  }
}
