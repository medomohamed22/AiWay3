# DealWay

## الجديد
- اسم الموقع أصبح DealWay.
- واجهة شبيهة بالنموذج المرسل.
- بدون رسالة ترحيب منبثقة.
- بدون البطاقة التي تعرض Pi SDK وSupabase.
- رفع حتى 3 صور لكل إعلان.
- ضغط الصور داخل المتصفح قبل الرفع.
- تخزين الصور في Supabase Storage داخل bucket باسم `ad-images`.
- تخزين روابط الصور في `ads.images`.
- عرض الصور كسلايدر في صفحة التفاصيل.

## التشغيل
1. ارفع المشروع كاملًا على Vercel.
2. شغّل `dealway_images_storage.sql` داخل Supabase SQL Editor.
3. تأكد من وجود متغيرات Vercel:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
4. نفّذ Redeploy.

## ملاحظة
الصور نفسها لا تُخزن كـ binary داخل جدول PostgreSQL. يتم رفعها إلى Supabase Storage، بينما الجدول يحتفظ بروابطها، وهذا هو الأسلوب الصحيح والأخف.
