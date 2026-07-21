# Shock of the Week

Weekly EKG interpretation challenges for residents, with instant scoring and a
leaderboard — built with Next.js (App Router) + Supabase (Postgres, Auth,
Storage), deployed on Vercel.

This machine didn't have Node.js/npm installed, so none of this has been run
or `npm install`-ed yet. Everything below gets you from zero to a live app.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a free account/project (any region near you).
2. Wait for provisioning (~2 min), then open **SQL Editor** in the left nav.
3. Paste the entire contents of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) and click **Run**.
   This creates every table, security policy, the `challenge-media` storage bucket, and seeds your 6 hospitals + 7 starter categories.
4. Go to **Authentication → Providers → Email** and turn **off** "Confirm email" (so residents can log in immediately after registering — no confirmation email step). You can turn this back on later without any code changes.
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Paste the Project URL and anon key from step 1 into `.env.local`.

## 3. Install Node.js (this machine doesn't have it)

Install Node 18+ (LTS) — easiest via [nodejs.org](https://nodejs.org) (download the macOS installer) or, if you install [Homebrew](https://brew.sh) first, `brew install node`.

Then, from this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you should see the login screen.

## 4. Create your admin account

1. On the running app, click **Create an account** and register normally (pick a username, hospital, PGY level — use "Attending/Faculty" for yourself).
2. Back in the Supabase **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
   ```
3. Log out and back in — you'll now land on `/admin` instead of the resident dashboard.

## 5. Try the full loop

- As admin: **Create Challenge** → fill in title/vignette, upload an EKG image (or short video), add 1-2 questions, set status to "Published (scheduled)", create it.
- Register a second (participant) test account, take the challenge, confirm your score/explanations show up immediately, and that it appears under "Past Challenges" if you publish a second one later.
- Check **Leaderboard** (global + per-hospital tabs) and **Profile** (category accuracy breakdown).

## 6. Deploy to Vercel

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-empty-github-repo-url>
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), **Add New Project**, import that repo.
3. Add the two environment variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Share the resulting `*.vercel.app` URL with residents (or point a custom domain at it later).

## What's in this MVP

Anonymous username-based registration/login (email is never shown to anyone,
including admins) · admin challenge builder (Google-Forms-style: multiple
choice or short answer, difficulty, category, image/video upload, scheduled
release) · take-flow with a confidence rating per question · instant scoring
and explanations · full history so a missed week stays completable any time ·
one comment per person per case + a community feed · global and per-hospital
leaderboards · per-category accuracy on your own profile ("great at ACS,
weak on AV blocks") · admin stats (answer distribution per question), users,
hospitals, and categories management.

## Deliberately deferred (schema won't need a rewrite to add these)

- Badges/medals, streaks, personalized recommendations
- Automated email reminders
- Self-service "forgot password" UI (Supabase's default flow can be wired in later)
- CSV import of any legacy roster

## Project layout

- `supabase/migrations/0001_init.sql` — schema, RLS policies, triggers, RPCs, views, seed data.
- `lib/supabase/` — server/browser/middleware Supabase clients.
- `lib/scoring.ts` — the points formula and short-answer grading.
- `app/` — pages (participant-facing) and `app/admin/` (admin-only, gated by middleware).
- `app/actions/` — Server Actions (all mutations go through these; reads happen directly in Server Components).
