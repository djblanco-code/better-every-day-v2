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
