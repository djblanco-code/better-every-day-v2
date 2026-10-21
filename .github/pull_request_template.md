## Task

<!-- Exactly one task from docs/TASKS.md, e.g. "0.4 Auth: Supabase Auth with Google and GitHub" -->
Task:
PRD section:

## What changed

<!-- 3 lines max. Files touched are in the diff; say the *why* here. -->

## Done when (copied from TASKS.md) — verified on the preview URL

- [ ] <paste the task's "Done when" sentence>
- Preview URL:

## Checklist

- [ ] One task only; nothing unrelated in the diff
- [ ] Test added or updated for any logic (engine, gateway, RLS); UI-only tasks say so
- [ ] `npm run check` passes locally (lint, typecheck, test, build)
- [ ] New table → migration includes its RLS policy (`user_id = auth.uid()`)
- [ ] No secrets, keys or connection strings in any committed file
- [ ] Model calls (if any) go through `src/lib/ai/callModel`
- [ ] `docs/TASKS.md` box ticked in this PR; `docs/NOTES.md` updated if something non-obvious was learned
