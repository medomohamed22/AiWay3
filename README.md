# Nano Banana AI Suite — Vercel

المشروع مقسوم إلى:

- ملفات الـ Frontend موجودة مباشرة في الـ root: `index.html`, `style.css`, `script.js`.
- `api/`: Vercel Functions تعمل كـ Backend وAPI proxy.
- `.env.example`: اسم متغير البيئة المطلوب بدون وضع المفتاح الحقيقي.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
```

ضع مفتاحك داخل `.env.local`:

```env
POLLINATIONS_API_KEY=your_real_key
```

ثم:

```bash
npm run dev
```

## النشر على Vercel

1. ارفع المشروع إلى GitHub.
2. اعمل Import للمستودع داخل Vercel.
3. من **Project Settings → Environment Variables** أضف:
   - Name: `POLLINATIONS_API_KEY`
   - Value: مفتاح Pollinations الحقيقي.
4. فعّل المتغير للـ Production وPreview وDevelopment حسب احتياجك.
5. اعمل Redeploy بعد إضافة أو تعديل المتغير.

## مسارات الـ API

- `GET /api/models`: تحميل النماذج المتاحة.
- `POST /api/chat`: الشات وتحليل الصور.
- `POST /api/media`: توليد الصور أو الفيديو وإرجاع الملف للواجهة.

المفتاح لا يُرسل إلى المتصفح ولا يوجد داخل ملفات الواجهة الأمامية.
