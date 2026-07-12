# AiWay OpenRouter — نسخة الهواتف المحسّنة

المشروع يدعم ثلاثة اختيارات فقط، وكل اختيار يستخدم alias من OpenRouter يتحدث تلقائياً إلى أحدث نسخة في العائلة:

- `~openai/gpt-latest`
- `~anthropic/claude-opus-latest`
- `~google/gemini-pro-latest`

## تشغيل محلي

```bash
npm i -g vercel
cp .env.example .env.local
vercel dev
```

## متغيرات Vercel

```env
OPENROUTER_API_KEY=sk-or-v1-...
APP_URL=https://your-project.vercel.app
APP_NAME=AiWay
ALLOWED_ORIGINS=https://your-project.vercel.app
```

## التعديلات الجديدة

- إصلاح كامل لعرض الهاتف ومنع التمرير الأفقي للصفحة.
- قائمة نماذج مختصرة ومنظمة تضم ChatGPT وClaude وGemini فقط.
- المساعد يعرّف نفسه باسم النموذج المختار عند سؤاله.
- Streaming منظم باستخدام `requestAnimationFrame` لتقليل الاهتزاز.
- لا يتم إجبار المستخدم على النزول أثناء القراءة؛ التمرير التلقائي يعمل فقط إذا كان المستخدم عند أسفل المحادثة.
- زر عائم للنزول مباشرة إلى آخر الرسائل.
- إصلاح عرض الأكواد الطويلة داخل الهاتف مع تمرير أفقي داخل صندوق الكود فقط.
