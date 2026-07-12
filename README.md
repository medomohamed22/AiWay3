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


## تسجيل الدخول عبر Pi Network

تمت إضافة Pi SDK بالإعداد التالي:

```js
Pi.init({ version: "2.0", sandbox: false });
```

زر **دخول** يطلب صلاحية `username`، ثم يعرض اسم المستخدم في الشريط العلوي. يجب فتح التطبيق من داخل Pi Browser وربط نطاق Vercel بتطبيقك في Pi Developer Portal. اسم المستخدم المعروض في الواجهة للاستخدام التقديمي؛ أي صلاحيات أو أرصدة مرتبطة بالحساب يجب التحقق منها في الخادم عبر Pi Platform API.

## إصلاح تسجيل دخول Pi

أضف متغيرات Vercel التالية ثم أعد النشر:

```env
PI_CLIENT_ID=ضع_oAuth_Client_ID_من_Pi_Developer_Portal
PI_REDIRECT_URI=https://ai-way-3new.vercel.app/
```

داخل Pi Developer Portal:

1. اجعل Production App URL هو `https://ai-way-3new.vercel.app`.
2. أكمل App Domain Verification لهذا النطاق.
3. فعّل Pi Sign-in.
4. أضف Redirect URI حرفيًا: `https://ai-way-3new.vercel.app/`.
5. انسخ oAuth Client ID إلى `PI_CLIENT_ID` في Vercel.
6. نفّذ Redeploy بعد إضافة المتغيرات.

المشروع يستخدم `Pi.signIn` عند وجود Client ID، ويتحقق من الرمز على الخادم عبر `/api/pi-me`. ويوجد fallback إلى `Pi.authenticate` للتطبيقات القديمة.
