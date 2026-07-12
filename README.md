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


## تكامل Pi Network للإنتاج

يستخدم المشروع Pi SDK 2.0 على الشبكة الرئيسية:

```js
Pi.init({ version: '2.0', sandbox: false });
```

تسجيل الدخول يتم بالطريقة الرسمية `Pi.authenticate` ويطلب الصلاحيات الثلاث:

```js
Pi.authenticate(['username', 'payments', 'wallet_address'], onIncompletePaymentFound)
```

يتم التحقق من access token في الخادم عبر `GET https://api.minepi.com/v2/me`. وتنفّذ المدفوعات دورة Pi الكاملة: إنشاء العملية في SDK، ثم `/approve` و`/complete` من الخادم فقط.

أضف متغير الخادم السري التالي في Vercel ثم نفّذ Redeploy:

```env
PI_API_KEY=ضع_Server_API_Key_من_Pi_Developer_Portal
PI_QUOTE_SECRET=ضع_قيمة_عشوائية_سرية_32_حرفا_على_الأقل
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ضع_Service_Role_Key_هنا
```

شغّل ملف `supabase-schema.sql` المرفق في Supabase SQL Editor مرة واحدة. لا تضع `PI_API_KEY` أو `PI_QUOTE_SECRET` أو `SUPABASE_SERVICE_ROLE_KEY` داخل `assets/app.js` أو أي ملف يصل إلى المتصفح.

الباقات ثابتة بالدولار ($2 و$5 و$10). قبل الدفع يجلب الخادم سعر `PI-USDT` الحالي من OKX، يحسب كمية Pi، ويوقّع عرض السعر لمدة 5 دقائق. الخادم يرفض أي مبلغ أو باقة أو توقيع تم تعديله.

داخل Pi Developer Portal:

1. اجعل Production App URL مطابقًا لرابط Vercel حرفيًا وبـ HTTPS.
2. أكمل Domain Verification وضع ملف التحقق في المسار المطلوب.
3. فعّل `username` و`payments` و`wallet_address` للتطبيق.
4. استخدم Server API Key الخاص ببيئة الإنتاج، وليس Sandbox.
5. افتح التطبيق من داخل Pi Browser؛ تسجيل Pi لا يعمل كدخول عادي من Chrome.
