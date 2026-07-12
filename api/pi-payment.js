const PI_API_BASE = 'https://api.minepi.com/v2';
const PACKAGES = new Map([[25, 0.2], [70, 0.5], [160, 1]]);

const validId = (value, max = 256) =>
  typeof value === 'string' && value.length > 0 && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);

function validPackage(payment) {
  const credit = Number(payment?.metadata?.credit);
  const expectedAmount = PACKAGES.get(credit);
  return expectedAmount !== undefined && Number(payment?.amount) === expectedAmount && payment?.direction === 'user_to_app';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.PI_API_KEY?.trim();
  if (!apiKey) return res.status(500).json({ error: 'PI_API_KEY is not configured on the server.' });

  const { action, paymentId, txid } = req.body || {};
  if (!['approve', 'complete'].includes(action) || !validId(paymentId)) {
    return res.status(400).json({ error: 'Invalid Pi payment request.' });
  }
  if (action === 'complete' && !validId(txid, 512)) {
    return res.status(400).json({ error: 'Invalid transaction id.' });
  }

  try {
    if (action === 'approve') {
      const inspection = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Key ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      const payment = await inspection.json().catch(() => ({}));
      if (!inspection.ok || !validPackage(payment)) {
        return res.status(400).json({ error: 'Payment amount or package metadata is invalid.' });
      }
    }
    const response = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Key ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: action === 'complete' ? JSON.stringify({ txid }) : '{}',
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status < 500 ? response.status : 502).json({
      error: data.error_message || data.message || `Pi payment ${action} failed.`
    });
    if (action === 'complete' && !validPackage(data)) {
      return res.status(400).json({ error: 'Completed payment does not match a valid package.' });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'Could not connect to Pi Platform API.' });
  }
}
