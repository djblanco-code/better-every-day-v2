# Better Every Day v2 — Product Requirements Document

Status: draft 1, 2026-10-21. Owner: Dominick. Nothing here is code yet.
Companion files: `TASKS.md` (ordered work), `PROCESS.md` (how each task is executed).

## 1. One paragraph

A personal web platform, installable on a phone, where a person who is interviewing for software jobs
spends one hour a day getting measurably better (Recall), keeps every application and its stage in one
board (Jobs), remembers the people who can help (Network), and tells the app what happened today in
their own words (Journal) so an AI sorts it into the right place. It is a wrapper around Claude with the
user's own data and the user's own key, multi-user from day one, with each user's data isolated by the
database itself.

## 2. Who it is for

- **Primary:** Dominick, every day, for the next six months of interview prep and job search.
- **Secondary:** a handful of friends in the same situation, each with their own account and their own AI key.
- **Later:** anyone; the architecture must not need a rewrite to get there, but no marketing, billing or
  support is in scope.

## 3. Decisions already made (do not reopen without a reason)

| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript full-stack, Next.js App Router | one type system from DB row to component; AI tools refactor across layers safely |
| Hosting | Vercel (app) + Supabase (Postgres, Auth, storage) | fastest validation; RLS gives per-user isolation in the database, not in app code |
| Deploy | day 2, staging URL live before the first feature | avoids "works locally" drift (env vars, Edge vs Node, CORS) |
| Repo | this repo, clean history, no fork lineage | AI editors index one modern codebase; v1 stays open as a reference |
| Login | Supabase Auth with Google, GitHub and LinkedIn (OIDC) | no passwords to store; pick any of the three on the sign-in page |
| Multi-user | from the first table | every table has `user_id`, RLS policy `user_id = auth.uid()` |
| AI key | **bring your own** (each user pastes an Anthropic key once; stored with Supabase Vault, never returned to the browser) | cost scales to zero for the platform; same model as v1 |
| Budget guard | $10/month default per user, editable | Sonnet for grading/parsing, Haiku for routing; the app refuses calls past the cap |
| First module | Recall | highest daily value; its engine already exists in v1 and has no UI dependency |
| Phone | responsive web + PWA (Add to Home Screen), no offline sync | voice journal and timers work in the browser; offline is a later option |
| Drag and drop | dnd-kit | sortable lists and boards, accessible, mobile |

## 4. Modules and requirements

### 4.1 Recall (phase 1, the first thing shipped)
Goal: one hour a day, six months, with the same engine as v1 and a better UI.
- R1. **Today**: a fixed daily plan of three slots: 25 min LeetCode, 25 min rotating track (Python, System
  Design, DSA, Debugging), one reading or homework item. Generated once per day per user; swap allowed.
- R2. **Session**: a document-style page: problem statement on top, the user's writing below, 25-minute
  timer that starts only on Start, autosave, submit for grading. Nothing is executed.
- R3. **Grading**: structured output (schema-enforced), temperature 0, anchored bands, grader version stored
  per session. Sub-scores: correctness, complexity, code quality, communication (debugging: root cause,
  method, fix, communication).
- R4. **Recommender** (deterministic, no model): due reviews → company-focus list → week focus → earliest
  unmastered category → weak attempts; difficulty steps up with strong scores; interleaving; mastery at 3×8+.
  Must produce the same plan as v1 for the same state (golden test).
- R5. **Program**: 26-week curriculum (reading, homework), readiness per track, adherence, minutes/day,
  readiness-over-time, under-time rate, score trend.
- R6. **Banks**: LeetCode (NeetCode 150/250, company lists), Python, System Design, DSA, Debugging, as
  seed data; per-user progress separate from the shared bank.
- R7. **Problem statements** from the open dataset, fetched per deployment into storage, never committed.
- R8. **Real reps**: mock and real interviews logged (from Journal later, by form now) count toward minutes,
  streak and metrics.

### 4.2 Journal + Memory agent (phase 2)
- J1. Text or voice (browser dictation) note → typed items: mock_interview, interview, event, person,
  study, other; each with its own date.
- J2. Items land in Recall (reps), Network (people, events) and Memory.
- J3. **Memory store**: typed memories (`fact|person|decision|goal|insight|task`) with source, timestamps,
  use count, pinned flag, embedding.
- J4. **Importance** = recency decay (30-day half-life) + log(use count) + pinned + similarity to active goals;
  recomputed nightly. Retrieval is top-k by importance × similarity; agents never get the whole store.
- J5. **Consolidation** nightly: merge near-duplicates, supersede contradicted facts, archive below a floor.
  Nothing deleted.
- J6. Drag a memory card to Pinned / a goal / a project = explicit importance signal.

### 4.3 Jobs (phase 3)
- B1. Kanban by stage (applied → intro call → interviewing → final → offer; ghosted, rejected, passed), drag
  between columns, notes and follow-ups per card, search, named job-search windows.
- B2. Import from v1 (`state/tracker.json` + `logs/job-tracker.md`) once.
- B3. Add by link with auto-fill (Greenhouse, Ashby, Lever, JobPosting JSON-LD).
- B4. Funnel (Sankey) and assessments/intro-calls to do.
- B5. Gmail-derived stage suggestions (agent proposes, user clicks).

### 4.4 Network (phase 3)
- N1. People (name, company, role, relationship, met at, how they can help, follow-up), events, follow-ups.
- N2. Links between people, companies and applications.

### 4.6 Life (phase 6): habits, health, money, and a Today that fits the day
Goal: the three work modules were missing the rest of the day. Life holds habits, a daily check-in and money,
and Today becomes "your day" instead of only the Recall plan.
- L1. **Habits**: a short list (name, cadence daily/weekdays/weekly, weekly target), one tap per day, a 14-day
  grid and a weekly completion rate. Misses are shown, never punished; no streak freezes, no gamification.
- L2. **Check-in**: one row per day: sleep hours, energy 1-5, mood 1-5, exercise minutes, optional weight, and
  "time for Recall today" (20/40/60/90 min). Takes under 20 seconds. From Today or from Life.
- L3. **Money**: expenses and income by category with a standing monthly limit per category; the month view
  leads with "spent vs limit" per category, then a list. Manual entry and journal entry only; no bank sync.
- L4. **Home = your day** (there is no separate Today page): check-in on top; "needs you today" (assessments and intro calls due or overdue,
  network follow-ups); the Recall plan trimmed to the time available (slots that do not fit are shown as
  "if time allows", never dropped from the plan); today's habits; readiness and money at a glance.
  Low energy (1-2) with no time set suggests 40 minutes with the review slot first. The journal box closes the
  page (end of day), so one screen covers morning, work and evening.
- L5. **Journal** also parses expenses ("spent $14 on lunch"), health ("slept 6 hours, ran 30 min") and
  habits that already exist by name. It never creates a habit or a category from a note.
Sources: Sunsama's morning ritual (short fixed sequence, realistic commitment, shutdown review); TickTick for
tasks + habits in one view; contribution-style habit grids; budget dashboards that lead with the period and
the remaining decision before analytics.

### 4.7 Goals and the daily plan (phase 9)
Goal: the day starts with a question, not a dashboard, and the plan bends to the answer.
- G1. **Goals questionnaire** (`/goals`, once, editable): seven questions, under five minutes, shaped by WOOP
  (wish → what done looks like per area → obstacle → if-then plan) plus two constraints (hours a week, best time
  and days off). Up to three areas, one goal each. Research: implementation intentions raise goal attainment
  (d ≈ .61, Gollwitzer & Sheeran 2006); onboarding questionnaires should stay under ten mixed questions.
- G2. **Daily plan ritual**: Home asks "Let's make your daily plan": how much time today, which goal gets today,
  how much energy. Three taps. Asked once per planning day and then shown as one line with "Change".
- G3. **Planning day** rolls over at 06:00 America/New_York, so a 1 a.m. session still belongs to the day before.
- G4. **The plan bends**: time trims the hour (slots past it wait as "if time allows"); the focus goal is what
  the page leads with; energy 1-2 shortens the hour to 40 minutes with the review first. The engine's plan is
  never rewritten (golden tests stay valid); only what is asked of you today changes.
- G5. With no goals yet, the ritual still asks time and energy and points at the questionnaire.

### 4.5 Chat (the Claude wrapper, phase 2+)
- C1. A chat page with the user's own key, streaming, with tools scoped per request (read-only by default).
- C2. Orchestrator routes to Memory / Recall coach / Jobs / Network agents; each has its own prompt, output
  schema and tool list. Side-effect tools (send, submit, delete) always require a click.
- C3. Every tool call is audited (user, agent, tool, input hash, result, tokens, cost).

## 5. Non-functional requirements
- **Security**: keys only server-side; user keys in Supabase Vault; RLS on every table; allowlist is not
  needed since each user only sees their own rows, but sign-ups are gated by an invite code stored in `private.config` and checked by a security-definer function (not an env var: nothing client-side can read or bypass it).
- **Safety**: external content (email, postings, web) is untrusted data; prompt-injection boundary in every
  agent prompt; no autonomous side effects.
- **Reliability**: model calls retried with backoff; structured outputs; grader/parser versions stamped.
- **Performance**: Today page under 1 s on a phone over 4G; grading under 30 s.
- **Cost**: per-user monthly budget enforced in the DB before the call is made.
- **Privacy**: no analytics vendors; Vercel and Supabase built-in logs only; export-all and delete-account
  endpoints from phase 1.
- **Accessibility**: keyboard-operable drag and drop (dnd-kit), prefers-color-scheme, 16 px minimum text.

## 6. Data model (first cut)
`users`(id, email, created_at, budget_cents, key_ref) · `banks`(track, id, json) shared, read-only ·
`progress`(user_id, track, item_id, attempts, best, interval, next_due) · `sessions`(user_id, track,
item_id, score, sub, verdict, strengths, gaps, answer, minutes_used, timer_minutes, grader, model, created_at) ·
`plans`(user_id, date, json) · `program`(user_id, start, done json, minutes json, snapshots json) ·
`external_reps`(user_id, date, kind, with, rating, minutes) · `journal_entries`(user_id, date, text, summary,
items json, parser) · `memories`(user_id, type, content, source, embedding vector(1536), importance,
use_count, pinned, archived_at) · `applications`(user_id, company, role, url, stage, applied_on, notes,
search_id) · `people`, `events`, `audit_log`(user_id, agent, tool, input_hash, result, tokens, cost_cents) ·
`habits`(user_id, id, name, cadence, target_per_week, active) · `habit_logs`(user_id, habit_id, date, done) ·
`checkins`(user_id, date, sleep_hours, energy, mood, exercise_minutes, weight, time_available) ·
`transactions`(user_id, id, date, kind, amount_cents, category, merchant) · `budgets`(user_id, category, limit_cents) ·
`goals`(user_id, id, area, title, why, priority, active) · `goal_profile`(user_id, wish, obstacle, if_then, hours_per_week, best_time, days_off) ·
`day_plans`(user_id, day, time_available, energy, focus_goal_id).
Every table: `user_id` + RLS.

## 7. Success metrics
- You use v2 Recall instead of v1 within 4 weeks of starting.
- Golden test: v2 recommender = v1 recommender on 20 recorded states.
- Adherence: 60 min/day hit on ≥ 80% of days over the first month of use.
- A second user signs in, runs a week, and no row of theirs is visible to you (verified by test).
- Monthly AI cost per user ≤ $10 at one graded session + one journal entry per day.

## 8. Out of scope (v2)
Billing, marketing site, offline sync, native apps, the ATS application agent (stays in the v1 repo),
any agent that acts without a click.

## 9. Open questions (answer before the task that needs them)

Resolved 2026-10-21 by default (owner was asked three times and did not override; change any by editing
the decisions table): (1) Google + GitHub first, LinkedIn when approved; (2) invite code required;
(3) strictly bring-your-own key; (4) sign-in page name "Better Every Day".

1. LinkedIn sign-in needs a LinkedIn developer app with "Sign In with LinkedIn using OpenID Connect";
   approval can take days. Ship Google + GitHub first and add LinkedIn when the app is approved? (default: yes)
2. Invite code for sign-ups, or open sign-up with per-user budgets as the only limit? (default: invite code)
3. Should a friend be allowed to use *your* key with a budget, or strictly bring their own? (default: strictly own)
4. Name of the product on the sign-in page: "Better Every Day" (default) or something else?
