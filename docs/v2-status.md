# Status after the second build night (2026-10-22)

Everything in Phases 0-3 that does not need the owner's accounts is built, merged and live (21 PRs, CI green on each).

Live: https://better-every-day-v2-neon.vercel.app (GitHub sign-in; invite code required once).

| App | Pages |
|---|---|
| Home | `/` journal (type or dictate; sorted into Recall reps, people, events once the key is set) + launcher with live counts |
| Recall | `/today`, `/practice`, `/practice/<track>/<id>`, `/history/<id>`, `/program`, `/settings` |
| Jobs | `/jobs` (overview, funnel, search windows), `/jobs/board` (Kanban, drag = stage change), `/jobs/all`, `/jobs/action`, `/jobs/todo` (apply-yourself + add by link) |
| Network | `/network` people, events, follow-ups |

Imported for the owner: 329 applications, 397 apply-yourself rows, 4 assessments, 6 intro-call actions, program start 2026-10-20.

Quality gates in place: CI (lint, typecheck, 161 tests, build, gitleaks, Lighthouse a11y >= 0.9), weekly audit workflow,
zod on every server action, RLS on every table (proven in SQL), AI key in Vault, per-user budget + audit log.
Assessment against OWASP ASVS / LLM Top 10 / SRE / 12-factor / WCAG: `docs/ASSESSMENT.md`. Runbook: `docs/OPERATIONS.md`.

## Owner steps still open (account actions only)
1. `/settings`: paste your Anthropic key -> Save -> Test the key. Unlocks grading and journal parsing.
2. Phone: open the URL -> Add to Home Screen.
3. Vercel + Supabase notifications (docs/OPERATIONS.md, 2 minutes).
4. Optional: Google sign-in (Google Cloud OAuth client), project rename (the `-neon` URL), `SUPABASE_SECRET_KEY`
   in Vercel if you want account deletion live.

## Not built yet (next phases)
- 2.2-2.5 memory store with importance scoring, nightly consolidation, chat with the orchestrator, drag-to-pin.
- 3.5 Gmail (read-only) suggestions via MCP; Jobs and Network agents. The v1 Gmail IMAP sync stays local in v1.
- 4.3 onboard friends + isolation test in CI; 4.4 LinkedIn sign-in; Next 16 / vitest 5 upgrades.
