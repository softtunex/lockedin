# LockedIn

A strict-accountability goal tracker: daily execution, mandatory proof of work, long-term goal breakdown into daily action steps, and real consequences for missed days.

## Stack

- Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, lucide-react
- NextAuth.js (Credentials, JWT sessions)
- Prisma ORM + Postgres (Neon in production; also used for local dev — see Setup)
- UploadThing for proof-of-work image storage
- Resend for transactional email (password reset, buddy invites)
- Web Push (VAPID) for reminders
- `node-cron` local worker for the midnight penalty sweep + reminder pushes; a GitHub Actions workflow (`.github/workflows/cron.yml`) does the same job in production

## Setup

1. Create a free Postgres database on [Neon](https://neon.tech) and copy both connection strings (pooled + direct) into `.env` as `DATABASE_URL` / `DIRECT_URL`.
2. (Optional for local dev, required in production) Create free accounts on [Resend](https://resend.com) and [UploadThing](https://uploadthing.com) and add `RESEND_API_KEY` / `UPLOADTHING_TOKEN` to `.env`. Without these, email falls back to a console.log stub and image proof uploads will fail (URL/text proof still work).
3. Install and run:

```bash
npm install
npm run dev   # runs `prisma generate && prisma migrate deploy` first, then http://localhost:3001
```

(Runs on 3001, not the usual 3000 — avoids a port clash with other local projects. Change the `-p` flag in `package.json`'s `dev`/`start` scripts and `NEXTAUTH_URL` in `.env` together if you want a different port.)

In a second terminal, run the background worker (midnight penalty sweep + scheduled reminder pushes):

```bash
npm run worker
```

`.env` needs `NEXTAUTH_SECRET`, `CRON_SECRET`, and VAPID keys generated once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # NEXTAUTH_SECRET / CRON_SECRET
npx web-push generate-vapid-keys                                              # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

If you change `VAPID_PUBLIC_KEY`, mirror it into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the client needs it to subscribe.

## Deploying (Vercel + Neon + Resend + UploadThing, all free tier)

1. **Neon**: create a project, grab the pooled and direct connection strings.
2. **Resend**: create an API key. Works immediately from `onboarding@resend.dev` with no domain setup; verify a custom domain later if you want mail to come from your own address.
3. **UploadThing**: create an app, copy the `UPLOADTHING_TOKEN` value from its dashboard.
4. **Vercel**: import the repo, set the env vars listed in `.env.example` (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — fill this in after the first deploy gives you a URL, `RESEND_API_KEY`, `UPLOADTHING_TOKEN`, `VAPID_*`, `CRON_SECRET`), deploy. The build runs `prisma migrate deploy` automatically, so the database schema is applied on every deploy.
5. **GitHub Actions cron**: add two repo secrets — `CRON_SECRET` (same value as Vercel) and `APP_URL` (your Vercel URL). `.github/workflows/cron.yml` then hits `/api/cron/eod-sweep` daily and `/api/cron/reminders` every 5 minutes, standing in for `npm run worker` since Vercel's serverless functions can't host a long-running cron process.

## How it fits together

- **Goals** (`/goals/new`) — Daily, 1-Month, 6-Month, or 1-Year. Non-daily goals require at least one recurring daily action step. Steps are stored as JSON templates on `Goal.dailyStepTemplates` and materialized into a `DailyTask` row for "today" lazily (`lib/daily-steps.ts`) — a yearly goal doesn't pre-create 365 rows.
- **Dashboard** (`/dashboard`) — today's standalone tasks + materialized goal steps. Checking a task off opens the **Proof Modal** (photo, link, or text) — nothing completes without proof. Completed tasks stay in the list, struck through and dimmed (`DailyTask.status = COMPLETED`, `isMuted = true`), never removed.
- **Do Later** reschedules a task (`status = POSTPONED`, new `scheduledDate`) — it moves off today's list and is exempt from that day's penalty sweep since it's no longer due that day.
- **Penalty engine** (`lib/penalty-engine.ts`) — `runEodSweep()` finds every task still `PENDING` for the day that just ended, marks it `FAILED_PENALIZED`, and applies the user's chosen consequence (mandatory penalty task + goal-creation lock, public shame feed post, streak reset, or virtual financial stake). Streak accounting is universal: any failed day resets it, a fully completed day extends it. The sweep is idempotent via `User.lastSweepDate`.
  - `POST /api/cron/eod-sweep` — `CRON_SECRET`-protected HTTP endpoint, wire this to Vercel Cron / Upstash QStash in production.
  - `npm run worker` — runs the same logic locally on a real midnight schedule via `node-cron`, and also sends push reminders at each user's configured times.
- **Mandatory task lock** — while an unresolved `MANDATORY_TASK` penalty exists, `/goals/new` and `POST /api/goals` redirect/reject; the generated penalty task shows up on the dashboard like any other task, and submitting proof on it auto-resolves the lock.
- **History** (`/history`) — monthly heatmap (green = perfect day, amber = partial, red = failed) plus long-term goal progress bars; `/history/[date]` is the EOD recap for a single day with a proof gallery.

## Known MVP limitations / production swap points

- **Timezone**: the midnight cut-off is the server's local time for all users. Per-user timezones would need a `timezone` column on `User` and per-user sweep windows.
- **Database**: SQLite via a Prisma driver adapter (`@prisma/adapter-better-sqlite3`), configured in `prisma.config.ts` and `lib/prisma.ts` (Prisma 7 moved datasource URLs out of `schema.prisma`). To move to Postgres: install `@prisma/adapter-pg`, swap the adapter in `lib/prisma.ts`, set `provider = "postgresql"` in `prisma/schema.prisma`, and point `DATABASE_URL` at a real instance. The `String` fields documented as enums in `prisma/schema.prisma` (SQLite has no native enum support) can become real `enum` blocks again at that point — `lib/enums.ts` is already the single source of truth for the valid values either way.
- **File storage**: `lib/storage.ts` saves proof images to `storage/uploads/<userId>/...` on disk, served via `GET /api/uploads/[...path]`. Swap this one file for Uploadthing (or Supabase Storage/Cloudinary) — nothing else references the filesystem directly.
- **Auth**: Credentials-only for now. Adding OAuth providers is a `lib/auth.ts` change; the `User` model already has what's needed.
- **Email**: `User.accountabilityEmail` is captured but not yet wired to an SMTP/Resend send — the shame-post penalty currently only posts to the in-app `/feed` community wall.
