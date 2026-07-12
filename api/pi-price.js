import crypto from 'node:crypto';

const PACKAGES = new Map([[25, 2], [70, 5], [160, 10]]);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const credit = Number(req.query?.credit);
  const usd = PACKAGES.get(credit);
  const secret = process.env.PI_QUOTE_SECRET;
  if (!usd || !secret || secret.length < 32) return res.status(500).json({ error: 'Price quote configuration is incomplete.' });
  try {
    const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=PI-USDT', {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    const piUsd = Number(result?.data?.[0]?.last);
    if (!response.ok || result?.code !== '0' || !Number.isFinite(piUsd) || piUsd <= 0) throw new Error('Invalid OKX price');
    const amountPi = Math.ceil((usd / piUsd) * 1e7) / 1e7;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ credit, usd, piUsd, amountPi, expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return res.status(200).json({ credit, usd, piUsd, amountPi, expiresAt, quote: `${payload}.${signature}`, source: 'OKX PI-USDT' });
  } catch {
    return res.status(502).json({ error: 'تعذر جلب سعر PI-USDT من OKX الآن.' });
  }
}
