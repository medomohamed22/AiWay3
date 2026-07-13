# حل خطأ api/_lib/http.js

هذا المشروع لا يحتوي أي استيراد من `api/_lib/http.js`.

## مهم قبل النشر

1. احذف الملف القديم من مستودع GitHub أو Vercel:
   - `api/health.js`
   - أي مجلد باسم `api/_lib`
2. استبدل المشروع بالملفات الموجودة في هذه الحزمة.
3. تأكد أن Root Directory في Vercel يشير إلى المجلد الذي يحتوي:
   - `index.html`
   - `package.json`
   - `vercel.json`
   - مجلد `api`
4. من Deployments اختر Redeploy مع تعطيل:
   - Use existing Build Cache
5. أو اعمل Commit جديد بعد حذف الملفات القديمة.

## بعد النشر

افتح:
- `/api/health`
- `/api/config`

إذا استمر ظهور `_lib/http.js`، فـ Vercel ينشر Branch أو Root Directory مختلفًا عن الذي عدّلته.
