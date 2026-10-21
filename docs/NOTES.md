# NOTES — things the next person needs to know

- 2026-10-21: `@supabase/supabase-js` 2.118 requires Node >= 22. CI and Vercel run Node 22; the dev machine still has Node 20.0.0 (works with EBADENGINE warnings). Upgrade local Node to 22 LTS when convenient: https://nodejs.org.
- 2026-10-21: Vercel env vars are per environment. Add NEXT_PUBLIC_* to Production AND Preview, or PR previews run unconfigured (the hello page says so instead of failing the build).
- 2026-10-21: a transient `npm ci` ECONNRESET in CI is a re-run, not a bug.
