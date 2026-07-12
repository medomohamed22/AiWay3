const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_SECONDS = 60 * 30;

function allowedOrigin(req) {
  const origin = req.headers.origin || "";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const ownOrigin = host ? `${proto}://${host}` : "";
  return origin && origin === ownOrigin ? origin : ownOrigin;
}

export default async function handler(req, res) {
  const origin = allowedOrigin(req);
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const headers = { Accept: "application/json" };
    if (process.env.OPENROUTER_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }

    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers,
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) throw new Error(`OpenRouter models error: ${response.status}`);

    const payload = await response.json();
    const models = (payload.data || [])
      .filter(model => {
        const input = model.architecture?.input_modalities || [];
        const output = model.architecture?.output_modalities || [];
        return output.includes("text") && (input.includes("text") || !input.length);
      })
      .map(model => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || "",
        contextLength: model.context_length || null,
        inputModalities: model.architecture?.input_modalities || ["text"],
        pricing: model.pricing || null
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader("Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
    return res.status(200).json({ models });
  } catch (error) {
    return res.status(502).json({
      error: "تعذر تحميل قائمة النماذج.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
