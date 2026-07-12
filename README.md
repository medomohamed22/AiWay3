# AiWay — OpenRouter + Vercel

واجهة عربية متجاوبة تستخدم أربعة نماذج محددة عبر OpenRouter:

- `openai/gpt-5.6-sol` — GPT-5.6 Sol — 4 كوين للمحاولة
- `anthropic/claude-fable-5` — Claude Fable 5 — 5 كوين للمحاولة
- `google/gemini-3.5-flash` — Gemini 3.5 Flash — 2 كوين للمحاولة
- `deepseek/deepseek-chat` — DeepSeek V3 — 1 كوين للمحاولة

## النشر على Vercel

أضف متغيرات البيئة التالية:

```env
OPENROUTER_API_KEY=sk-or-v1-...
APP_URL=https://your-project.vercel.app
APP_NAME=AiWay
ALLOWED_ORIGINS=https://your-project.vercel.app
```

ثم أعد النشر.

## نظام الكوينز

نظام الكوينز الحالي تجريبي ويحفظ الرصيد في `localStorage` على جهاز المستخدم. يبدأ كل متصفح بـ 10 كوين، ويعاد الرصيد تلقائيًا إذا فشل الطلب أو أوقفه المستخدم. زر الشراء تجريبي ولا ينفذ دفعًا حقيقيًا.

للإنتاج العام يجب نقل الرصيد إلى قاعدة بيانات وربطه بتسجيل دخول، مثل Supabase Auth + PostgreSQL، وإجراء الخصم داخل الخادم حتى لا يستطيع المستخدم تعديل الرصيد من أدوات المتصفح.

## الملفات

- الصور: JPEG / PNG / WEBP / GIF
- المستندات: PDF
- النصوص: TXT / CSV
- الحد الأقصى: 8MB للملف و6 ملفات في الرسالة
