export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  return res.status(200).json({
    clientId: process.env.PI_CLIENT_ID || '',
    redirectUri: process.env.PI_REDIRECT_URI || (appUrl ? `${appUrl}/` : '')
  });
}
