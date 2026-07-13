# Pi Souq على Vercel

## المتغيرات المطلوبة في Vercel
أضف من Project Settings > Environment Variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

ثم أعد Deploy.

## الإعداد
1. فعّل Anonymous Sign-ins في Supabase.
2. شغّل `supabase_schema.sql` في SQL Editor.
3. ارفع المشروع إلى GitHub واربطه بـ Vercel، أو استخدم Vercel CLI.
4. أضف الدومين في Pi Developer Portal.
5. افتح الموقع من Pi Browser.

## ملاحظات أمنية
- `SUPABASE_SERVICE_ROLE_KEY` لا يصل إلى المتصفح؛ يُستخدم فقط داخل `/api/pi-login`.
- المتصفح يحصل فقط على URL وAnon Key من `/api/config`.
- تسجيل Pi يتم في خطوة واحدة للمستخدم، لكن التحقق الحقيقي يتم على الخادم قبل حفظ الحساب.
- `sandbox:false` يعني بيئة الإنتاج في Pi.
