import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.APP_JWT_SECRET;

export function requireEnv() {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!jwtSecret || jwtSecret.length < 32) missing.push('APP_JWT_SECRET (min 32 chars)');
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export function db() {
  requireEnv();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    json(res, 405, { error: 'Method not allowed' });
    return false;
  }
  return true;
}

export async function signAppToken(user) {
  requireEnv();
  return new SignJWT({ username: user.username, pi_uid: user.pi_uid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(jwtSecret));
}

export async function requireUser(req) {
  requireEnv();
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new Error('UNAUTHORIZED');
  const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
  if (!payload.sub) throw new Error('UNAUTHORIZED');
  return { id: payload.sub, username: payload.username, pi_uid: payload.pi_uid };
}

export function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export function safeUrl(value) {
  const url = new URL(String(value));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('INVALID_URL');
  return url.toString();
}
