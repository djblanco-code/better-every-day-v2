# TASKS — ordered, small, checkable

Work top to bottom. One task per session. A task is done only when its "Done when" is true on the
**deployed staging URL**, not just locally. Tick the box in the same commit that finishes it.

## Phase 0 — foundations (deploy on day 2)

- [x] 0.1 Create the Supabase project (free tier). Record project URL and anon key in `.env.local`; service key only in Vercel env. **Done when:** `supabase status` shows the project and `.env.example` lists every variable name with no values.
- [x] 0.2 `npx create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint, src/ dir). Add `@supabase/ssr`, `zod`, `vitest`. **Done when:** `npm run build` and `npm test` pass on a hello page.
- [x] 0.3 Push to GitHub `djblanco-code/better-every-day-v2`, connect Vercel, set env vars. **Done when:** the hello page is live on a `*.vercel.app` URL (day 2).
- [ ] 0.4 Auth: Supabase Auth with Google and GitHub providers; sign-in page; middleware that redirects signed-out users. **Done when:** you can sign in with Google and with GitHub on the live URL; a signed-out visit to `/today` redirects.
- [ ] 0.5 Invite gate: `INVITE_CODE` env var checked once at first sign-in, stored on `users`. **Done when:** a new account without the code is shown "invite only" and cannot reach `/today`.
- [ ] 0.6 `users` table + RLS + trigger that creates the row on sign-up. Export-all and delete-account routes. **Done when:** a vitest integration test proves user A cannot select user B's row with A's JWT.
- [ ] 0.7 CI: GitHub Actions running lint, typecheck, vitest, and gitleaks on every push. **Done when:** a PR with a fake `sk-ant-` string fails CI.
- [ ] 0.8 PWA: manifest, icons, `theme-color`, installable. **Done when:** "Add to Home Screen" works on your phone and opens full-screen.

## Phase 1 — Recall

- [ ] 1.1 Seed data: copy v1 banks (`data/recall-*.json`, curriculum) into `supabase/seed/`, a `banks` table (shared, read-only via RLS) and a seed script. **Done when:** `select count(*) from banks` matches v1 item counts per track.
- [ ] 1.2 Statements: script that fetches the open leetcode-problems dataset into Supabase Storage (private bucket) at deploy time. **Done when:** `two-sum` statement renders on staging; nothing from the dataset is committed.
- [ ] 1.3 Port the engine to `src/lib/recall/`: `schedule`, `mastery`, `readiness`, `recommend`, `secondTrack`, `thirdSlot`, `buildPlan`, `metrics`. Pure functions over plain objects, no DB inside. **Done when:** golden test passes: 20 recorded v1 states (exported from `state/recall.json` snapshots) produce identical plans.
- [ ] 1.4 Tables: `progress`, `sessions`, `plans`, `program`, `external_reps` with RLS. Server actions: `getToday`, `swapSlot`, `markDone`, `logMinutes`, `logRep`. **Done when:** Today page shows the plan for your account on staging and persists across reloads and devices.
- [ ] 1.5 Session page: statement renderer (markdown subset + code), editor with autosave (DB, debounced), timer (start on click, pause, overtime), submit. **Done when:** a draft typed on the phone appears on the laptop.
- [ ] 1.6 Key storage: settings page where the user pastes an Anthropic (or Gemini) key once; stored in Supabase Vault; "Test the key"; never returned to the browser. **Done when:** the key test succeeds and `select * from vault.decrypted_secrets` is denied for the anon role.
- [ ] 1.7 Model gateway `src/lib/ai/`: `callModel(system, user, schema)` with provider switch, temperature 0, schema enforcement (Claude tool use / Gemini responseSchema), retries, budget check before the call, audit row after. **Done when:** a unit test with a fake transport verifies the request shape and the audit row; a budget of $0 blocks the call with a clear message.
- [ ] 1.8 Grading: port the graders (general + debugging) with bands and versions; result page with ring, sub-scores, strengths, gaps, outline. **Done when:** one real graded session on staging costs < $0.05 (visible in the audit row).
- [ ] 1.9 Program page: week N of 26, reading/homework checklists, mastery per category, readiness over time, adherence, under-time rate, score trend. **Done when:** numbers match v1 for your imported history.
- [ ] 1.10 Import from v1: one-off script reading `state/recall.json` into your account. **Done when:** streak, sessions and readiness match v1 on the day of import.
- [ ] 1.11 Practice page: filters (track, difficulty, topic, list, company), "start next", random. Company focus setting + `company_list` import script. **Done when:** choosing Google as focus changes tomorrow's first slot the same way v1 does.
- [ ] 1.12 Switch over: use v2 Recall for 7 days; log every gap in `docs/GAPS.md`. **Done when:** you no longer open v1's Recall.

## Phase 2 — Journal, Memory agent, Chat
- [ ] 2.1 `journal_entries` + voice/text page on Home; parser with schema and dates; items fan out to `external_reps`, `people`, `events`.
- [ ] 2.2 `memories` table with pgvector; embeddings via the user's provider; importance job (Vercel Cron, nightly).
- [ ] 2.3 Consolidation job; archive, never delete; review card on Home.
- [ ] 2.4 Chat page: streaming, tools read-only by default, orchestrator → Memory agent; audit every call.
- [ ] 2.5 Drag-and-drop memory cards (dnd-kit): Pinned, goals, projects.

## Phase 3 — Jobs and Network
- [ ] 3.1 `applications` + Kanban by stage with dnd-kit; import from v1.
- [ ] 3.2 Add by link with auto-fill; named search windows.
- [ ] 3.3 Funnel, assessments, intro calls.
- [ ] 3.4 `people`, `events`, follow-ups; links to applications.
- [ ] 3.5 Gmail (MCP) read-only suggestions, approved by click; Jobs and Network agents.

## Phase 4 — hardening
- [ ] 4.1 Observability: Vercel + Supabase alerts on error rate and latency; weekly cost report per user.
- [ ] 4.2 Backups: weekly `pg_dump` to your own storage; restore drill once.
- [ ] 4.3 Onboard two friends with their own keys; isolation test in CI.
- [ ] 4.4 LinkedIn sign-in once the developer app is approved.
