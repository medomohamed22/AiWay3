# AppHub v21 — Security-Hardened Build

This package keeps the existing AppHub features and adds server-side payment verification, atomic payment finalization, live admin-role checks, real image decoding/re-encoding, request throttling, safer media validation, and security headers. The Pi mark in the header was replaced with the supplied AppHub wordmark.

## Required deployment order

### 1. Back up Supabase

Create a database backup before applying the migration.

### 2. Run the existing SQL, if this is a new database

In Supabase Dashboard → SQL Editor, run:

1. `sql/schema.sql`
2. `sql/engagement-features.sql`
3. Any optional upgrade SQL files you previously used.

Do not rerun `schema.sql` on a working production database unless you understand the changes.

### 3. Run the new mandatory migration

In Supabase SQL Editor, run the complete file:

`sql/security-hardening-v21.sql`

This creates:

- Database-backed API rate limiting.
- `finalize_app_submission(...)`, which creates the app and consumes the payment in one transaction.
- `finalize_app_promotion(...)`, which activates a promotion and consumes its payment in one transaction.

The new backend depends on these functions. Deploying the code before running this migration will cause payment completion to fail safely.

### 4. Configure Vercel environment variables

Vercel Project → Settings → Environment Variables:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
APP_JWT_SECRET=A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
PI_SECRET_KEY=YOUR_PI_PLATFORM_SERVER_API_KEY
PI_API_BASE_URL=https://api.minepi.com
```

Generate a strong JWT secret locally, for example:

```bash
openssl rand -base64 48
```

Never put `SUPABASE_SERVICE_ROLE_KEY`, `APP_JWT_SECRET`, or `PI_SECRET_KEY` in HTML or client-side JavaScript.

### 5. Upload the project

#### Git + Vercel

```bash
npm install
npm run dev
```

After testing:

```bash
git add .
git commit -m "Deploy AppHub v21 security hardening"
git push
```

Import or redeploy the repository in Vercel.

#### Vercel CLI

```bash
npm install
npx vercel
npx vercel --prod
```

### 6. Pi Developer Portal

Confirm that:

- The production App URL matches the Vercel/custom domain.
- The app uses the correct Mainnet or Testnet configuration.
- The server API key in Vercel belongs to this Pi app.
- Payment callbacks are opened inside Pi Browser.

## Important behavior changes

- App submission still costs **1 Pi**.
- Promotion plans remain **3 days / 10 Pi**, **14 days / 20 Pi**, and **30 days / 30 Pi**.
- The browser may still send `purpose` or `amountPi`, but the backend ignores those untrusted values and reads the real amount, Pi user UID, direction, and metadata from Pi Platform.
- New logos and screenshots must be uploaded through AppHub. This prevents users from supplying arbitrary external media URLs for new submissions or edits.
- Uploaded files are decoded and converted to WebP. A renamed executable or corrupt file is rejected even if its Data URL says `image/png`.
- Login state now uses `sessionStorage`, so it is cleared when the browser tab/session ends. Navigating between pages in the same tab remains signed in.
- Admin access is checked against the current database role on every request. Removing an admin role takes effect immediately.
- `/api/submit-app` is retained only as a compatibility endpoint and returns a clear instruction to use the secure payment-completion flow. The live frontend already uses `/api/payment-complete`.

## Post-deployment checks

1. Sign in with a normal Pi account.
2. Upload a logo and one screenshot.
3. Pay 1 Pi and verify that exactly one pending app is created.
4. Refresh/retry the completion callback and verify that no duplicate app is created.
5. Publish the app from the admin page.
6. Buy each promotion plan in the correct Pi test environment and verify the expiry date.
7. Change an admin user to `user` in Supabase and verify that the old session loses admin access immediately.
8. Try uploading a text file renamed to `.png`; it should be rejected.
9. Confirm `/assets/apphub-logo.webp` appears in the main and admin headers.

## Files added or changed

- `assets/apphub-logo.webp`
- `sql/security-hardening-v21.sql`
- Security and validation updates in `api/`
- Updated `vercel.json`
- Updated header branding in `index.html` and `admin.html`

## v22 login and logo fix

- Pi sign-in now requests only the `username` permission. The `payments` permission is requested later, only when a payment is needed.
- Server identity verification uses Pi's documented `/me` endpoint and falls back to `/v2/me` for compatibility.
- Pi Browser embedding is allowed through CSP without allowing arbitrary websites.
- The AppHub wordmark was tightly cropped and resized so it is fully visible in the header.

After uploading this version, redeploy Production in Vercel. Keep `PI_API_BASE_URL=https://api.minepi.com`. The app configured in Pi Developer Portal must use the exact deployed domain.
