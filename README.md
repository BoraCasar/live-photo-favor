# Live Photo Favor

A multi-tenant wedding photo-sharing web app. Guests scan a QR code, land on a branded subdomain (e.g. `smithwedding.yourdomain.com`), upload photos from their phone, and watch a live gallery update in real time.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres + Realtime subscriptions
- **Cloudflare R2** — direct-to-storage photo uploads via presigned URLs
- **Tailwind CSS** — mobile-first responsive UI

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd live-photo-favor
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Database → Replication**, enable Realtime for the `photos` table.
4. Copy your credentials from **Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Cloudflare R2

> **Note:** The Cloudflare API token (`cfat_…`) is for Cloudflare's main API. R2 uploads use a *separate* set of S3-compatible credentials.

1. Go to **Cloudflare Dashboard → R2 → Create Bucket** named `live-photo-favor`.
2. Under your bucket → **Settings → Custom Domain**, add e.g. `photos.yourdomain.com` for public access.
3. Go to **R2 → Manage R2 API Tokens** → Create token with **Object Read & Write** permission.
4. Copy:
   - Your **Account ID** (right sidebar of Cloudflare dashboard) → `R2_ACCOUNT_ID`
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | R2 S3-compatible secret key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g. `live-photo-favor`) |
| `R2_PUBLIC_URL` | Public URL of your R2 bucket |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Same as above — exposed to the browser |
| `ADMIN_PASSWORD` | Password for the `/admin` panel |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Same, exposed to browser for client-side check |

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`. In development there's no subdomain, so the home page shows a placeholder. To test multi-tenancy locally, add an entry to `/etc/hosts`:

```
127.0.0.1 testwedding.localhost
```

Then visit `http://testwedding.localhost:3000` — but note: subdomain detection requires 3 hostname parts (e.g. `sub.domain.tld`), so a production deployment on Vercel is the best way to test the full flow.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into [vercel.com](https://vercel.com).
3. Add all env vars in **Project Settings → Environment Variables**.
4. Under **Domains**, add your root domain (e.g. `yourdomain.com`).
5. Add a **wildcard subdomain**: `*.yourdomain.com` pointing to the same deployment.

Vercel automatically supports wildcard domains — the middleware handles routing each subdomain to the correct event.

---

## Adding a New Client / Event

### Option A — Admin UI

Visit `/admin` on your domain (or `admin.yourdomain.com/admin`), log in with your `ADMIN_PASSWORD`, and fill out the **New Event** form.

### Option B — Supabase Dashboard

Insert a row directly into the `events` table:

```sql
insert into public.events (subdomain, client_name, event_date, primary_color, welcome_message)
values ('smithwedding', 'Sarah & James Smith', '2026-09-14', '#D4A5A5', 'Thank you for celebrating with us!');
```

The event will be live immediately at `smithwedding.yourdomain.com`.

---

## Architecture Notes

- **Direct uploads**: Photos never pass through Next.js. The server only issues a 5-minute presigned PUT URL; the browser uploads straight to Cloudflare R2.
- **Tenant isolation**: Every query filters by `event_id`. Supabase Row Level Security adds a second layer of isolation.
- **Live gallery**: Uses Supabase Realtime `postgres_changes` subscriptions — new photos appear instantly without page refresh.
- **Rate limiting**: `/api/presigned-url` limits each IP to 20 uploads per minute (in-memory, resets on cold start).

---

## Out of Scope (v1)

- Payments
- Guest accounts / authentication
- Video uploads
