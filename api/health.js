export default function handler(req, res) {
  const checks = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY: Boolean(
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };

  const ok = Object.values(checks).every(Boolean);

  res.setHeader("Cache-Control", "no-store");
  return res.status(ok ? 200 : 500).json({
    ok,
    checks
  });
}
