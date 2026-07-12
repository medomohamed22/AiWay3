function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('Supabase server variables are missing.'), { status: 500 });
  return { url, key };
}
export async function supabase(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey:key, Authorization:`Bearer ${key}`, Accept:'application/json', 'Content-Type':'application/json', ...options.headers }, signal:AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(data?.message || data?.hint || 'Supabase request failed.'), { status: 502 });
  return data;
}
export async function ensureUser(piUser) {
  const rows=await supabase('app_users?on_conflict=pi_uid',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({pi_uid:piUser.uid,username:piUser.username||null,wallet_address:piUser.wallet_address||null,granted_scopes:piUser.credentials?.scopes||[],last_login_at:new Date().toISOString()})});
  return rows[0];
}
