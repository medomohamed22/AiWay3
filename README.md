# AiWay + OpenRouter + Vercel

نسخة منظّمة من AiWay تفصل الواجهة عن الخادم، وتستخدم OpenRouter للوصول إلى نماذج GPT وClaude وGemini وDeepSeek وغيرها.

## البنية

```text
aiway-openrouter-vercel/
├─ api/
│  ├─ chat.js       # يرسل الطلب إلى OpenRouter ويعيد SSE streaming
│  └─ models.js     # يجلب قائمة النماذج المتاحة
├─ assets/
│  ├─ app.js        # منطق الواجهة والمحادثات والملفات
│  └─ styles.css
├─ index.html
├─ vercel.json
├─ package.json
└─ .env.example
```

## التشغيل محليًا

1. ثبّت Vercel CLI:

```bash
npm i -g vercel
```

2. انسخ ملف البيئة:

```bash
cp .env.example .env.local
```

3. ضع مفتاحك في `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
APP_URL=http://localhost:3000
APP_NAME=AiWay
```

4. شغّل:

```bash
vercel dev
```

## النشر على Vercel

1. ارفع المشروع إلى GitHub أو نفّذ `vercel`.
2. من Vercel افتح:
   **Project → Settings → Environment Variables**
3. أضف:
   - `OPENROUTER_API_KEY`
   - `APP_URL` = رابط مشروعك النهائي
   - `APP_NAME` = `AiWay`
   - اختياريًا `ALLOWED_ORIGINS` = رابط موقعك، أو عدة روابط مفصولة بفواصل.
4. أعد النشر بعد إضافة أو تعديل المتغيرات.

## الأمان

- مفتاح OpenRouter لا يُرسل للمتصفح ولا يُحفظ في `localStorage`.
- الخادم يفحص Origin عند ضبط `ALLOWED_ORIGINS`.
- الطلبات محدودة بعدد رسائل وملفات وحجم أقصى.
- الملفات المقبولة: JPEG وPNG وWEBP وGIF وPDF وTXT وCSV.
- TXT وCSV يتحولان إلى نص في المتصفح، أما الصور وPDF فتُرسل بصيغة data URL.
- لا ترفع `.env.local` إلى GitHub.

## ملاحظة إنتاجية مهمة

الحماية الحالية مناسبة لتطبيق شخصي أو MVP. عند فتح الموقع للعامة أضف تسجيل دخول وقاعدة بيانات وحدود استخدام حقيقية، مثل:
- Vercel Firewall / WAF أو Upstash Rate Limit.
- Supabase Auth أو Clerk.
- تخزين المحادثات في قاعدة بيانات بدل `localStorage`.
- رصيد فعلي محسوب على الخادم، وليس في الواجهة.
