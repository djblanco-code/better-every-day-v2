# Status after Phase 6 (2026-10-22)

Everything in Phases 0-3 that does not need the owner's accounts is built, merged and live (31 PRs, CI green on each).

New since the last status: the app is now phone-first on the web (bottom tab bar on phones, top bar on wide screens,
tables become cards under 768px, 16px inputs so iPhone does not zoom, safe-area padding, an Add-to-Home-Screen nudge
on the second phone visit), a per-minute AI rate limit (10 calls/user/min) on top of the monthly budget, and Next 16
(production `npm audit` is now 0). Research and sources: docs/NOTES.md, 2026-10-22 entries.

Phase 5 (system-design review, docs/ASSESSMENT.md §7): RLS policies evaluate `auth.uid()` once per statement, sessions
verify locally (no Auth round trip per page), the Jobs pages load in one RPC, a daily cron keeps the free database
awake, Speed Insights records real-user Core Web Vitals, and CI proves row isolation on every PR against a throwaway
local Supabase.

Phase 6: a fourth module, Life (habits, check-in, money), and Today rebuilt as "your day": check in, what needs you
today from Jobs and Network, the Recall plan sized to the time you have (slots past it wait as "if time allows"),
today's habits, and a glance at readiness and money. PRD §4.6.

Live: https://better-every-day-v2-neon.vercel.app (GitHub sign-in; invite code required once).

| App | Pages |
|---|---|
| Home | `/` journal (also parses expenses, health and existing habits into Life) (type or dictate; sorted into Recall reps, people, events once the key is set) + launcher with live counts |
| Recall | `/today`, `/practice`, `/practice/<track>/<id>`, `/history/<id>`, `/program`, `/settings` |
| Jobs | `/jobs` Pipeline (needs you, gone quiet, stage chips + table, next action per application), `/jobs/board` Kanban, `/jobs/todo` Leads, `/jobs/mail` Gmail suggestions, `/jobs/insights` charts |
| Network | `/network` people, events, follow-ups |
| Life | `/life` habits (14-day grid), daily check-in (sleep, energy, mood, exercise, weight), money (spent vs limits by category) |

Imported for the owner: 329 applications, 397 apply-yourself rows, 4 assessments, 6 intro-call actions, program start 2026-10-20.

Quality gates in place: CI (lint, typecheck, 162 tests, build, gitleaks, Lighthouse a11y >= 0.9), weekly audit workflow,
zod on every server action, per-minute AI rate limit, RLS on every table (proven in SQL), AI key in Vault, per-user budget + audit log.
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
- 4.3 onboard friends + isolation test in CI; 4.4 LinkedIn sign-in; vitest 5 upgrade (needs Node 22 in CI only: done; local Node is 22 via nvm).
