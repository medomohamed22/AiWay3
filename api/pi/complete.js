import paymentHandler from '../pi-payment.js';

export default function handler(req, res) {
  req.body = { ...(req.body || {}), action: 'complete' };
  return paymentHandler(req, res);
}
