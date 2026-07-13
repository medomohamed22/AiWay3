export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const rawUrl = process.env.SUPABASE_URL || "";
  const supabaseUrl = rawUrl
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");

  res.setHeader("Cache-Control", "no-store");

  if (missing.length) {
    return res.status(500).json({
      ok: false,
      error: "Missing Vercel environment variables",
      missing
    });
  }

  return res.status(200).json({
    ok: true,
    supabaseUrl,
    supabaseAnonKey
  });
}
