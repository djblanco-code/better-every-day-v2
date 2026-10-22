# TASKS — ordered, small, checkable

Work top to bottom. One task per session. A task is done only when its "Done when" is true on the
**deployed staging URL**, not just locally. Tick the box in the same commit that finishes it.

## Phase 0 — foundations (deploy on day 2)

- [x] 0.1 Create the Supabase project (free tier). Record project URL and anon key in `.env.local`; service key only in Vercel env. **Done when:** `supabase status` shows the project and `.env.example` lists every variable name with no values.
- [x] 0.2 `npx create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint, src/ dir). Add `@supabase/ssr`, `zod`, `vitest`. **Done when:** `npm run build` and `npm test` pass on a hello page.
- [x] 0.3 Push to GitHub `djblanco-code/better-every-day-v2`, connect Vercel, set env vars. **Done when:** the hello page is live on a `*.vercel.app` URL (day 2).
- [x] 0.4 Auth: Supabase Auth with Google and GitHub providers; sign-in page; middleware that redirects signed-out users. **Done when:** you can sign in with Google and with GitHub on the live URL; a signed-out visit to `/today` redirects.
- [x] 0.5 Invite gate: `INVITE_CODE` env var checked once at first sign-in, stored on `users`. **Done when:** a new account without the code is shown "invite only" and cannot reach `/today`.
- [x] 0.6 `users` table + RLS + trigger that creates the row on sign-up. Export-all and delete-account routes. **Done when:** a vitest integration test proves user A cannot select user B's row with A's JWT.
- [x] 0.7 CI: GitHub Actions running lint, typecheck, vitest, and gitleaks on every push. **Done when:** a PR with a fake `sk-ant-` string fails CI.
- [x] 0.8 PWA: manifest, icons, `theme-color`, installable. **Done when:** "Add to Home Screen" works on your phone and opens full-screen.

## Phase 1 — Recall

- [x] 1.1 Seed data: copy v1 banks (`data/recall-*.json`, curriculum) into `supabase/seed/`, a `banks` table (shared, read-only via RLS) and a seed script. **Done when:** `select count(*) from banks` matches v1 item counts per track.
- [x] 1.2 Statements: script that fetches the open leetcode-problems dataset into Supabase Storage (private bucket) at deploy time. **Done when:** `two-sum` statement renders on staging; nothing from the dataset is committed.
- [x] 1.3 Port the engine to `src/lib/recall/`: `schedule`, `mastery`, `readiness`, `recommend`, `secondTrack`, `thirdSlot`, `buildPlan`, `metrics`. Pure functions over plain objects, no DB inside. **Done when:** golden test passes: 20 recorded v1 states (exported from `state/recall.json` snapshots) produce identical plans.
- [x] 1.4 Tables: `progress`, `sessions`, `plans`, `program`, `external_reps` with RLS. Server actions: `getToday`, `swapSlot`, `markDone`, `logMinutes`, `logRep`. **Done when:** Today page shows the plan for your account on staging and persists across reloads and devices.
- [x] 1.5 Session page: statement renderer (markdown subset + code), editor with autosave (DB, debounced), timer (start on click, pause, overtime), submit. **Done when:** a draft typed on the phone appears on the laptop.
- [x] 1.6 Key storage: settings page where the user pastes an Anthropic (or Gemini) key once; stored in Supabase Vault; "Test the key"; never returned to the browser. **Done when:** the key test succeeds and `select * from vault.decrypted_secrets` is denied for the anon role.
- [x] 1.7 Model gateway `src/lib/ai/`: `callModel(system, user, schema)` with provider switch, temperature 0, schema enforcement (Claude tool use / Gemini responseSchema), retries, budget check before the call, audit row after. **Done when:** a unit test with a fake transport verifies the request shape and the audit row; a budget of $0 blocks the call with a clear message.
- [x] 1.8 Grading: port the graders (general + debugging) with bands and versions; result page with ring, sub-scores, strengths, gaps, outline. **Done when:** one real graded session on staging costs < $0.05 (visible in the audit row).
- [x] 1.9 Program page: week N of 26, reading/homework checklists, mastery per category, readiness over time, adherence, under-time rate, score trend. **Done when:** numbers match v1 for your imported history.
- [x] 1.10 Import from v1: one-off script reading `state/recall.json` into your account. **Done when:** streak, sessions and readiness match v1 on the day of import.
- [x] 1.11 Practice page: filters (track, difficulty, topic, list, company), "start next", random. Company focus setting + `company_list` import script. **Done when:** choosing Google as focus changes tomorrow's first slot the same way v1 does.
- [ ] 1.12 Switch over: use v2 Recall for 7 days; log every gap in `docs/GAPS.md`. **Done when:** you no longer open v1's Recall.

## Phase 2 — Journal, Memory agent, Chat
- [x] 2.1 `journal_entries` + voice/text page on Home; parser with schema and dates; items fan out to `external_reps`, `people`, `events`.
- [ ] 2.2 `memories` table with pgvector; embeddings via the user's provider; importance job (Vercel Cron, nightly).
- [ ] 2.3 Consolidation job; archive, never delete; review card on Home.
- [ ] 2.4 Chat page: streaming, tools read-only by default, orchestrator → Memory agent; audit every call.
- [ ] 2.5 Drag-and-drop memory cards (dnd-kit): Pinned, goals, projects.

## Phase 3 — Jobs and Network
- [x] 3.1 `applications` + Kanban by stage with dnd-kit; import from v1.
- [x] 3.2 Add by link with auto-fill; named search windows.
- [x] 3.3 Funnel, assessments, intro calls.
- [x] 3.4 `people`, `events`, follow-ups; links to applications.
- [ ] 3.5 Gmail (MCP) read-only suggestions, approved by click; Jobs and Network agents.

## Phase 4 — hardening
- [x] 4.1 Observability: Vercel + Supabase alerts on error rate and latency; weekly cost report per user. (docs/OPERATIONS.md; the owner turns the notifications on)
- [x] 4.2 Backups: weekly `pg_dump` to your own storage; restore drill once. (command + drill in docs/OPERATIONS.md)
- [ ] 4.3 Onboard two friends with their own keys; isolation test in CI.
- [ ] 4.4 LinkedIn sign-in once the developer app is approved.
- [x] 4.5 `npm audit fix` and pin; scheduled weekly CI run of gitleaks + audit. (from docs/ASSESSMENT.md)
- [x] 4.6 zod-validate every server-action input; per-user rate limit on model-calling actions.
- [x] 4.7 Lighthouse in CI (`@lhci/cli`) with budgets; anything under 90 on mobile gets fixed.
- [x] 4.10 Next 16 upgrade: closes the postcss advisory (`npm audit --omit=dev` = 0), flat ESLint config, `middleware.ts` → `proxy.ts`, React Compiler lint fixes.
- [x] 4.9 Mobile shell: bottom tab bar on phones, top bar on wide screens, tables become cards under 768px, 16px inputs (no iOS zoom), safe-area padding, install nudge; per-minute AI rate limiter.
- [x] 4.8 Dialog focus trap + `aria-live` status messages; axe-core smoke test on the main pages.

## Phase 5 — scale and measure (from the 2026-10-22 system-design review; sources in docs/ASSESSMENT.md §7)
- [x] 5.1 RLS: wrap `auth.uid()` in a subselect in every policy (initPlan, ~95% faster policy checks).
- [x] 5.2 Index every policy column that is not already a key (verified: all covered; proof query in migration 0008).
- [x] 5.3 Local JWT verification (`getClaims()`) for page guards; `getUser()` only where revocation must be immediate.
- [x] 5.4 One RPC per page: `get_jobs_state` replaces the N queries behind the Jobs pages.
- [x] 5.5 Keep the free database awake: daily Vercel cron pings a health route that touches Postgres.
- [x] 5.6 Real-user Core Web Vitals (Speed Insights) with the 75th-percentile targets: LCP 2.5 s, INP 200 ms, CLS 0.1.
- [x] 5.9 Settings joins the app width tier: form left, help and data cards right on large windows.
- [x] 5.8 One fluid page shell with width tiers (app 1600px fluid, read/wide/form capped); Today and Home two columns on large windows.
- [x] 5.7 RLS isolation test runs in CI against a throwaway local Supabase (Docker), no secrets needed.

## Phase 6 — Life, and a Today that fits the day (PRD §4.6)
- [x] 6.1 Schema: habits, habit_logs, checkins, transactions, budgets (migration 0010, RLS, applied live).
- [x] 6.2 Life page (`/life`): habits grid + today's taps, check-in, money month view with limits; Life in the nav and on Home.
- [x] 6.3 Today = your day: check-in, needs-you-today, plan trimmed to time available, habits row, glance panel.
- [x] 6.5 One home: the day view IS the home page (`/`); the journal card lives at the end of it; `/today` redirects; nav is Home, Jobs, Network, Life, Settings.
- [x] 6.4 Journal parses expenses, health and existing habits into Life (parser v3).

## Phase 7 — Job Tracker that drives action (docs/JOBS-UX.md)
- [x] 7.1 Pipeline landing page: needs-you list (dated next actions, assessments, calls), gone-quiet list with Nudge / No reply, stage chips + table; next action + date on every application; inline "new search"; `/jobs/all` folded in; Insights holds the charts.
- [x] 7.2 Mail: Gmail app password in the Vault (Settings), IMAP check of the last 14 days, rule-based classification, suggestions you confirm (`/jobs/mail`).
- [x] 7.3 Insights is the landing page again (owner's call), rebuilt with the dataviz method: stat tiles, weekly bars, sorted horizontal bars for reach and stage, by-sender table, table view toggle; metrics module with tests.
- [ ] 7.4 Daily mail check from the cron once the owner has set it up and the first manual checks look right.

## Phase 8 — soul (docs/SOUL.md)
- [x] 8.1 Type and tokens: Fraunces for titles and the hero number, Inter for the body (it was Arial), warm paper neutrals, one accent for the next thing to do, a designed dark set, focus rings, cards that rise once.
- [x] 8.2 Home is three things: check-in, the hour, the journal; one line for everything else. Mornings open the check-in; evenings lead with the journal; a finished hour folds into one line.
- [x] 8.3 Insights keeps three numbers. Error copy sounds like a person.
- [x] 8.5 Home always has the same shape (the day-zero card was removed at the owner's request; the journal must always be on the page).
- [ ] 8.4 Keyboard: Return submits every form; a shortcut for Start on the first slot.

## Phase 9 — goals and the daily plan (PRD §4.7)
- [x] 9.1 Schema: goals, goal_profile, day_plans (migration 0012, RLS, applied live).
- [x] 9.2 Goals questionnaire (`/goals`): seven questions, WOOP shape, editable; the list it produces.
- [x] 9.3 Daily plan ritual on Home: the questionnaire owns the page (time, goal for today, energy, then the check-in: sleep, mood, exercise), "Making today's plan…" for a beat, then the plan; one line with Change afterwards; the separate check-in card is gone from Home (it lives in Life).
- [x] 9.4 One daily question (time); goals fixed; "what is possible" = the hour's slots that fit, then the goals' items with the minutes left; Home shows the next slot that fits, a one-sentence Today line, a collapsed "+ Add an update" line. Decided with the owner as PM/UX/HCI (session 2026-10-22).
