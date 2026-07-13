# AppHub — Vercel + Supabase + Pi Login

## What changed
- Removed **Submit App** from the desktop header.
- Header now contains Pi Login and Promote only.
- After Pi authentication, the username replaces the login button.
- Added a professional mobile bottom navigation bar.
- Apps load from Supabase through a Vercel API function.
- Pi access tokens are verified server-side with the Pi Platform `/v2/me` endpoint.
- App submissions require a signed AppHub session token and are stored as `pending`.
- Supabase service-role key is server-only and never exposed to the browser.

## 1. Create Supabase database
Open Supabase SQL Editor and run:

`sql/schema.sql`

Then sign in once with Pi. Your first user record will be created automatically. To publish an app after review:

```sql
update public.apps
set status = 'published', published_at = now()
where id = 'APP_UUID';
```

To feature it:

```sql
update public.apps
set is_featured = true
where id = 'APP_UUID';
```

## 2. Configure environment variables
Copy `.env.example` values into Vercel Project Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_JWT_SECRET` (at least 32 random characters)
- `PI_API_BASE_URL=https://api.minepi.com`

Never place the Supabase service-role key in `index.html` or in a variable beginning with `NEXT_PUBLIC_`.

## 3. Deploy to Vercel

```bash
npm install
npx vercel
```

Or import the folder/repository from the Vercel dashboard.

## 4. Pi Developer Portal
- Add the final Vercel domain to your Pi app configuration.
- Test inside Pi Browser.
- For sandbox testing, change `sandbox:false` to `sandbox:true` in `index.html`, and use the matching Pi sandbox API configuration.
- Real Pi payments require server-side approve/complete endpoints. The included promotion modal is intentionally informational until those endpoints are implemented.

## Security notes
- The browser receives only the short-lived AppHub token, not the Supabase service-role key.
- All exposed Supabase tables have RLS enabled.
- Public users can only read rows where `apps.status = 'published'`.
- Writes happen only from trusted Vercel functions.
- Validate uploaded media separately before adding direct file uploads. For production, use Supabase Storage with MIME, size, ownership and RLS policies.
