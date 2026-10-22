# Operations: what to watch, how to recover

## Where things run
- App: Vercel project `better-every-day-v2` (production = `main`, previews = PR branches).
- Data: Supabase project `tctuwcxbcldtsewsnhgg` (Postgres, Auth, Vault).
- CI: GitHub Actions (`ci.yml` on every PR; `audit.yml` weekly).

## Alerts (task 4.1, one-time owner setup)
1. Vercel → Project → Settings → Notifications: turn on *Deployment failed* and *Function errors* (email).
2. Supabase → Project → Reports: review *Database* and *Auth* weekly; set *Database size* and *Egress* alerts under Billing → Usage.
3. GitHub → Watch the repo for *Actions* failures (weekly audit and PR CI).

## Rollback
- Vercel → Deployments → previous Ready production deployment → ⋯ → *Promote to Production*. Instant.
- Code: open a revert PR against `main` (never force-push).
- Database: migrations are additive; to undo a bad data change, restore from Supabase's daily backup
  (Database → Backups) into a new project and copy the rows back, or use `pg_dump` from the weekly export (4.2).

## Backups (task 4.2)
- Supabase daily backups (free tier keeps 7 days).
- Weekly export the owner runs locally (needs the project's DB password from Supabase → Settings → Database):
  `pg_dump "postgresql://postgres:<password>@db.tctuwcxbcldtsewsnhgg.supabase.co:5432/postgres" --schema=public --schema=private -Fc -f bed-$(date +%F).dump`
  Keep the file somewhere private (OneDrive/USB), not in git. Restore with `pg_restore`.
- Restore drill: once a quarter, restore the dump into a scratch Supabase project and open `/today` against it.

## Cost ceilings
- Vercel Hobby: 100 GB bandwidth, serverless 10 s timeout. Supabase Free: 500 MB DB, 2 GB egress.
- AI: per-user `budget_cents` (default $10/month) enforced before every model call; spend visible in Settings.

## Adding a friend
1. They sign in with GitHub (or Google once enabled) at the production URL.
2. Give them the invite code (rotate it with the insert in `supabase/migrations/0002_invite_gate.sql` whenever you like).
3. They paste their own AI key in Settings. Their data is theirs: RLS on every table.

## Keep-alive and health (5.5)
`GET /api/health` runs `select public.ping()` and returns `{ ok, db_time, ms }`. `vercel.json` schedules it daily at
09:00 UTC (Hobby allows one run a day). A free Supabase project pauses after 7 idle days; this call is the activity
that prevents it. Set `CRON_SECRET` in Vercel (Production) to any random string: Vercel then sends it as a bearer
token and the route refuses everyone else. Without it the route is public but harmless (clock only). If the project
does pause anyway, restore it from the Supabase dashboard; the data is kept.

## Real-user performance (5.6)
Vercel Speed Insights (`<SpeedInsights />` in the root layout; enabled in the Vercel project under Speed Insights)
records Core Web Vitals from real visits. Read it at the 75th percentile over 28 days, the way Google scores it:
LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 are "good". The PRD target for /today (under 1 s on 4G) is stricter than the
standard. Lighthouse in CI stays as the lab check on every PR; this is the field check. Hobby keeps a limited number
of data points per month, enough for a few users.
