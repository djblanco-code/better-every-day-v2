# Job Tracker: who uses it, how a search actually runs, and the redesign (2026-10-22)

Written before task 7.x after reviewing Teal, Huntr, Simplify, Careerflow, Callings and the Notion job-search
templates (sources at the end). The one finding that mattered: **a tracker that works is a next-action list, not a
diary.** Every open application needs a next action and a date; the page should open on what is due, not on charts.

## 1. Three archetypes (the people this page is built for)

| | A. The volume applier (the owner today) | B. The referral hunter | C. The first-timer |
|---|---|---|---|
| Situation | 300+ applications, most sent by the agent; several live loops; assessments arrive by email | 20-40 targeted applications, each with a person attached; warm intros | First real search; few applications; unsure what "normal" looks like |
| What they open the page for | "What needs me today, and what is stale?" | "Who do I owe a message, and which intro has not moved?" | "Did anyone reply? What do I do next?" |
| Pain with the old page | Five tabs; the overview is analytics; due things split across Action needed, follow-ups and the table | Follow-ups are free text with no date, so nothing surfaces | Stages and jargon ("ghosted", "passed") with no guidance |
| Must have | One list of due items; stale detection; one-click stage changes; mail suggestions | Next-action dates; person on the card; "nudge" cadence | Plain-language stages; a funnel that explains itself |

## 2. The end-to-end workflow we support

1. **Find** a role (agent, board, referral) → it lands as a lead ("Apply yourself") or as an application.
2. **Apply** (agent or by hand) → row with company, role, posting URL, applied date, source.
3. **Wait and nudge**: 7-10 business days with no reply is normal; after 14 days the row is *stale*. The page proposes:
   nudge (sets a next action "follow up" due today) or mark ghosted. Nothing is auto-changed.
4. **Hear back**: recruiter screen, assessment, interview. Each is a stage change plus a dated next action.
   Assessments and intro calls are their own small lists because they have deadlines of their own.
5. **Decide**: offer, rejected, or passed. Closed rows leave the active list but stay in the record.
6. **Review** per search window: funnel, response rate, applications per day. Analytics, not the landing view.

Email is where steps 3-5 arrive. Mail check (task 7.4) reads the inbox with a Gmail app password the user pastes
into Settings (stored in the Vault like the AI key), matches messages to companies in the tracker, classifies by
rules (interview, assessment, rejection, offer, other) and proposes a change. The user confirms each one.

## 3. Information architecture after the redesign

- **Pipeline** (`/jobs`, the landing page): search window + inline "new search"; **Needs you** (next actions due or
  overdue, assessments and calls due, stale applications with nudge/ghost buttons); stage chips that filter the
  **Applications** table below; row click opens the card (stage, next action + date, notes, history).
- **Board** (`/jobs/board`): the same applications as a Kanban. Drag = stage change.
- **Leads** (`/jobs/todo`): roles the agent could not submit, add by link.
- **Mail** (`/jobs/mail`): suggestions from the inbox; confirm or dismiss.
- **Insights** (`/jobs/insights`): the old overview charts and the funnel, per search window.
- `/jobs/all` and `/jobs/action` redirect to Pipeline; their content lives there.

Stage labels in plain words: Applied · Intro call · Interviewing · Final round · Offer · No reply · Rejected · I passed.

## 4. Rules the page applies (deterministic, no model)

- Stale: stage Applied, applied 14+ days ago, no next action set, no stage history beyond Applied.
- Due: `next_action_on <= today` on an open application; assessments with `due <= today + 3`; calls with
  `due <= today + 3`; all overdue first.
- Nudge sets `next_action = "Follow up with the recruiter"`, `next_action_on = today`, and bumps `last_contact_on`
  when marked done.
- Mail classification (subject + first 2 KB of body, lower-cased): "interview|phone screen|schedule a call|
  availability" → interview; "assessment|hackerrank|codesignal|take-home|coding challenge" → assessment;
  "unfortunately|not moving forward|other candidates|will not be proceeding" → rejection; "offer letter|
  pleased to offer|extend an offer" → offer; else other. Company match: tracker company name (lower-cased,
  first word of 4+ letters) in sender address, sender name or subject.

## 5. Sources
- Callings job tracker docs (board shows what needs attention): https://www.callings.ai/docs/job-tracker/kanban-view
- Job Wizard, "a tracker should be a next-action list", keep a next-action date on every card:
  https://jobwizard.ai/blog/how-to-track-job-applications-with-a-kanban-board-chrome-extension
- Happenstance, best CRMs for a job search 2026: https://happenstance.ai/guides/best-crm-for-job-search
- Teal vs Huntr vs Simplify comparison: https://bestjobsearchapps.com/articles/en/teal-vs-huntr-vs-simplify-job-search-comparison
- Huntr vs Teal (vendor): https://huntr.co/blog/huntr-vs-teal
- Prentus, best job tracker tools: https://prentus.com/blog/best-job-tracker-tools
- ImapFlow (Gmail IMAP from Node, app password + 2FA): https://socket.dev/npm/package/imapflow/overview/2.0.1
