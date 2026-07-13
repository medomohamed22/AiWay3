# فحص إعداد Vercel

بعد النشر افتح:

- `/api/config`
- `/api/health`

النتيجة الصحيحة لـ `/api/config`:

```json
{
  "ok": true,
  "supabaseUrl": "https://PROJECT.supabase.co",
  "supabaseAnonKey": "..."
}
```

النتيجة الصحيحة لـ `/api/health`:

```json
{
  "ok": true,
  "checks": {
    "SUPABASE_URL": true,
    "SUPABASE_ANON_KEY": true,
    "SUPABASE_SERVICE_ROLE_KEY": true
  }
}
```

يجب رفع المشروع كاملًا، وليس `index.html` فقط. المجلد `api` وملفا
`package.json` و`vercel.json` ضروريون لتشغيل Vercel Functions.

أضف المتغيرات في Vercel لكل البيئات المطلوبة ثم نفّذ Redeploy:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
