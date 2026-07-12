const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_BODY_BYTES = 14 * 1024 * 1024;
const MAX_MESSAGES = 80;
const MAX_FILES_PER_MESSAGE = 6;
const MAX_DATA_URL_CHARS = 12 * 1024 * 1024;
const ALLOWED_DATA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf"
]);

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const configured = getAllowedOrigins();
  const origin = req.headers.origin || "";
  if (!configured.length) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (configured.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function isOriginAllowed(req) {
  const configured = getAllowedOrigins();
  if (!configured.length) return true;
  return configured.includes(req.headers.origin || "");
}

function cleanText(value, max = 40000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("ملف غير صالح أو أكبر من الحد المسموح.");
  }
  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new Error("صيغة الملف غير صالحة.");
  const mime = match[1].toLowerCase();
  if (!ALLOWED_DATA_TYPES.has(mime)) throw new Error(`نوع الملف غير مسموح: ${mime}`);
  return { mime, dataUrl };
}

function toOpenRouterContent(message) {
  const text = cleanText(message.text);
  const files = Array.isArray(message.files)
    ? message.files.slice(0, MAX_FILES_PER_MESSAGE)
    : [];

  if (!files.length) return text;

  const content = [{ type: "text", text: text || "حلّل الملفات المرفقة." }];

  for (const file of files) {
    const { mime, dataUrl } = parseDataUrl(file.data);
    if (mime === "application/pdf") {
      content.push({
        type: "file",
        file: {
          filename: cleanText(file.name, 180) || "document.pdf",
          file_data: dataUrl
        }
      });
    } else {
      content.push({
        type: "image_url",
        image_url: { url: dataUrl }
      });
    }
  }
  return content;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) {
    throw new Error("عدد الرسائل غير صالح.");
  }

  return messages.map(message => {
    const role = message.role === "assistant" ? "assistant" : "user";
    return { role, content: toOpenRouterContent(message) };
  });
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isOriginAllowed(req)) return res.status(403).json({ error: "Origin غير مسموح." });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY غير مضبوط على الخادم." });

  const declaredLength = Number(req.headers["content-length"] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "حجم الطلب أكبر من الحد المسموح." });
  }

  try {
    const body = req.body || {};
    const model = cleanText(body.model, 180);
    if (!model || !/^[a-zA-Z0-9._:/-]+$/.test(model)) {
      return res.status(400).json({ error: "معرّف النموذج غير صالح." });
    }

    const messages = normalizeMessages(body.messages);
    const memory = cleanText(body.memory, 4000);

    const upstream = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-OpenRouter-Title": process.env.APP_NAME || "AiWay"
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "أنت AiWay، مساعد احترافي. أجب بالعربية ما لم يطلب المستخدم لغة أخرى. " +
              "استخدم Markdown بوضوح، ولا تدّعِ قراءة ملف لم يصلك. " +
              (memory ? `ذاكرة المستخدم:\n${memory}` : "")
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 8192,
        plugins: [{ id: "file-parser" }]
      }),
      signal: AbortSignal.timeout(55000)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      let message = `OpenRouter error ${upstream.status}`;
      try {
        message = JSON.parse(text)?.error?.message || message;
      } catch {}
      return res.status(upstream.status).json({ error: message });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      const status = /غير صالح|غير مسموح|عدد الرسائل/.test(error.message) ? 400 : 500;
      return res.status(status).json({
        error: status === 400 ? error.message : "حدث خطأ أثناء الاتصال بالنموذج."
      });
    }
    res.end();
  }
}
