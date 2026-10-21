# Status after the first build day (2026-10-21)

Phase 0 complete (0.1-0.8). Phase 1 Recall: 1.1-1.11 built; 1.12 (use v2 for 7 days) is the owner's.

Live: https://better-every-day-v2-neon.vercel.app (sign in with GitHub, invite code required once).
Pages: /today (daily plan), /practice (browse + start), /practice/<track>/<id> (session doc + grading), /history/<id>
(result), /program (26 weeks, metrics), /settings (key, provider, company focus, program start).

Owner steps still open (account actions):
1. Settings -> paste the Anthropic key -> Save -> Test the key (closes PR #11's and #12's remaining boxes).
2. Phone: open the production URL -> Add to Home Screen (closes 0.8's box).
3. Google OAuth client (Google sign-in) when wanted; GitHub works today.
4. Vercel -> Environment Variables: SUPABASE_SECRET_KEY as a Secret (Production + Preview) only if account deletion
   or the server-side seed/import scripts should run from Vercel; nothing else needs it.
