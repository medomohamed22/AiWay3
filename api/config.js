export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  function cleanEnv(value) {
    return String(value || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
  }

  let supabaseUrl = cleanEnv(process.env.SUPABASE_URL)
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/+$/, "");

  const supabaseAnonKey = cleanEnv(
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");

  if (missing.length) {
    return res.status(500).json({
      ok: false,
      error: "Missing Vercel environment variables",
      missing
    });
  }

  try {
    const parsed = new URL(supabaseUrl);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must use http or https");
    }

    supabaseUrl = parsed.origin;
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "SUPABASE_URL is invalid",
      receivedValue: supabaseUrl,
      expectedExample: "https://project-ref.supabase.co",
      details: error.message
    });
  }

  return res.status(200).json({
    ok: true,
    supabaseUrl,
    supabaseAnonKey
  });
}
