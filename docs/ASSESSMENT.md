# Outside yardsticks: how the product measures up, and what to fix

Re-run after every phase. Each section names the framework, what was checked, the result, and the follow-up task.
Dates are when the check was run.

## 1. Security — OWASP ASVS 4.0 (Level 1), mapped to this app

| ASVS area | Check | Status (2026-10-22) | Follow-up |
|---|---|---|---|
| V2 Authentication | No passwords stored; OAuth via Supabase (Google/GitHub); sessions validated server-side with `getUser()` (not the cookie) | Pass | Google provider still to be enabled by the owner |
| V3 Session | HttpOnly cookies managed by `@supabase/ssr`; sign-out is POST-only; middleware refreshes on every request | Pass | Add explicit session max-age review in Supabase Auth settings |
| V4 Access control | Every table has RLS `user_id = auth.uid()` created in the same migration; proven in SQL for `users`, invite code (`private.config`) and Vault (`permission denied`) | Pass | Add the env-gated RLS integration test to CI with a Supabase CI project (4.x) |
| V5 Input validation | Server actions clamp lengths/ranges; dates validated by regex + within-a-day check; `renderDoc` escapes HTML before any markup; lookup reads only structured JSON/JSON-LD | Pass | Add zod schemas on every server-action input (currently manual) |
| V6 Cryptography / secrets | AI keys in Supabase Vault via security-definer functions; publishable key only in the browser; secret key only in Vercel env | Pass | `read_ai_key` is granted to `authenticated` (NOTES); move the gateway to the service role when friends join |
| V8 Data protection | Export-all endpoint; delete-account endpoint (needs `SUPABASE_SECRET_KEY`); no third-party analytics | Partial | Enable deletion on the deployment (owner sets the secret) |
| V9 Communications | HTTPS by Vercel; HSTS default | Pass | — |
| V10 Malicious code | gitleaks on every PR with rules for Anthropic/Supabase/Google keys; `npm audit` | Partial | 2 prod-dep advisories (1 high, 1 moderate) and dev-dep advisories open: `npm audit fix` task 4.5 |
| V13 API | Server actions are the only API; same-origin by Next.js; budgets per user on model calls; audit log per call | Pass | Rate limit server actions per user (Supabase does per-IP on auth only) |
| V14 Configuration | `.env.example` names only; CI builds with placeholders; `publicEnv()` fails loudly | Pass | — |
| LLM-specific (OWASP LLM Top 10) | Prompt injection: external content is data (journal parser only sees the user's own words; lookup never feeds a model); schema-enforced outputs; temperature 0; per-user budget; no autonomous side effects | Pass | When email/MCP agents arrive (phase 4), wrap every external text in an explicit untrusted-data envelope |

## 2. Reliability and operations — Google SRE / AWS Well-Architected (Operational Excellence, Reliability)

| Question | Status | Follow-up |
|---|---|---|
| Can you roll back? | `main` = production; revert PR = rollback; Vercel keeps previous deployments (instant rollback in the dashboard) | — |
| Do you know when it breaks? | Vercel error logs only | 4.1 Vercel alerts on error rate; Supabase log drain |
| Backups? | Supabase daily backups on free tier (7 days) | 4.2 weekly `pg_dump` to own storage + a restore drill |
| Golden tests for the core algorithm | 20-case golden test vs v1 (140 assertions) in CI | Add a second fixture set when the algorithm changes |
| Dependency on one vendor | Supabase (Postgres, Auth, Vault). Data is plain Postgres (`pg_dump` works) | Document the exit path (export + self-hosted Supabase) |

## 3. Performance — PageSpeed Insights / Lighthouse (mobile)

Run: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile`. The first run (2026-10-22)
returned no scores (API quota without a key); re-run with a key or from Chrome DevTools Lighthouse. Targets from the
PRD: Today page under 1 s on 4G; grading under 30 s.

Known costs today: each page is `force-dynamic` with 3-6 Supabase queries; banks are cached 10 min per server instance.

## 4. Scalability — 12-factor + Vercel/Supabase limits

| Factor | Status |
|---|---|
| Config in env | Yes (`NEXT_PUBLIC_*` + Vercel secrets) |
| Stateless processes | Yes; the only in-memory state is the banks cache (safe to lose) |
| Backing services attached | Supabase over HTTPS; swap by env |
| Logs as streams | Vercel + Supabase |
| Limits that matter first | Supabase free tier: 500 MB DB, 2 GB egress/month; Vercel Hobby: 100 GB bandwidth, 10 s function timeout (grading calls stay under; fine) |
| Per-user cost ceiling | `budget_cents` enforced before each model call |

## 5. System design review (what a senior reviewer would flag)

1. Server actions do N small queries per page; fine at 1-10 users, worth a single RPC (`get_jobs_state`) at 100+.
2. `applications.id` reuses v1's URL-hash id so imports are idempotent; new rows use random ids. OK, document it.
3. The invite code is one shared secret; rotate it by one SQL insert (NOTES) and consider per-invite codes later.
4. No background jobs yet (memory consolidation, snapshots happen on page load). Vercel Cron when 2.2+ lands.
5. `read_ai_key` reachable by the user's own session (see V6). Acceptable for own key; revisit before multi-user beyond friends.

## 6. Accessibility — WCAG 2.1 AA quick pass

Keyboard: dnd-kit board is keyboard-operable (Space, arrows); dialogs close on backdrop click and have focusable
controls; colour is never the only signal (pills carry text). Follow-up: focus trap in dialogs, `aria-live` for
"saved"/"grading" messages, contrast check on amber text.

## Open follow-up tasks (added to TASKS.md as 4.5-4.8)

- 4.5 `npm audit fix` and pin; re-run gitleaks and audit in CI weekly (scheduled workflow).
- 4.6 zod-validate every server-action input; add rate limiting per user on model-calling actions.
- 4.7 Lighthouse in CI (`@lhci/cli`) with budgets; fix anything under 90 on mobile.
- 4.8 Dialog focus trap + `aria-live`; axe-core smoke test on the main pages.
