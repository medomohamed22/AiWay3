import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization || "";
    const supabaseAccessToken = authHeader.replace(/^Bearer\s+/i, "");
    const { piAccessToken } = req.body || {};
    if (!supabaseAccessToken || !piAccessToken) {
      return res.status(400).json({ error: "Missing token" });
    }

    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${supabaseAccessToken}` } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Invalid Supabase session" });

    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${piAccessToken}` }
    });
    if (!piResponse.ok) return res.status(401).json({ error: "Invalid Pi token" });

    const piUser = await piResponse.json();
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: linked } = await admin
      .from("profiles")
      .select("id")
      .eq("pi_uid", piUser.uid)
      .maybeSingle();

    if (linked && linked.id !== user.id) {
      return res.status(409).json({ error: "Pi account already linked" });
    }

    const { data: profile, error } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        pi_uid: piUser.uid,
        pi_username: piUser.username,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
