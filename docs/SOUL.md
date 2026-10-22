# The soul of the thing (2026-10-22)

One sentence: **one hour a day until you're hired.** Everything on the first screen serves that hour. Jobs's test,
not ours: does it feel inevitable, and did someone care about the parts you never see.

## Who we are designing for (archetypes, reused from docs/JOBS-UX.md and Recall)

| | The volume applier (the owner) | The first-timer | The referral hunter |
|---|---|---|---|
| What they need the first screen to say | "Here is your hour. Start." Not twelve numbers. | "You are not behind. This is day one." | "Who do you owe, and what is today's hour." |
| Where the old UI failed them | Five tiles, three panels, a money card, all competing with the plan | An empty dashboard with no first step | Follow-ups buried under analytics |
| What soul means to them | Calm. Fewer things, better made. | A hand on the shoulder. One button. | A page that remembers people, not rows. |

## Principles (the eight, made concrete)

1. **One sentence, then no.** Home = check-in, plan, journal. Jobs, Network, Life are one tap away and say in
   one line whether they need you. The readiness-by-track panel lives in Program; money lives in Life.
2. **Design the first minute.** With no sessions yet the title reads "Your first hour." and nothing else changes:
   the owner asked for one home page, always the same shape (a day-zero card that hid the journal was tried and
   removed on 2026-10-22).
3. **Two rituals.** Morning (before noon): the check-in is open and greets you. Evening (after five): the journal
   leads, asks "How did today go?", and the check-in folds away. Cards rise in, 400 ms, once, never on reduced motion.
4. **Celebrate quietly.** When the hour is done the plan folds and one line says "Day 12. Readiness 34%." No
   confetti, no badges, no streak freeze.
5. **Typography and space are the product.** Fraunces (variable, optical sizes) for the page title and the one
   hero number; Inter for everything else; an 8-point rhythm; warm paper surfaces instead of gray; one accent,
   used only for the next thing to do (Start, Save, Done). Dark mode is its own set of steps, not an inversion.
6. **One voice.** Short sentences, second person, no database words. Errors sound like a friend.
7. **Craft in the unseen.** Return submits every form; focus rings are visible; the install prompt waits for the
   second visit; the home page stays under one second on 4G (Lighthouse gate in CI).
8. **Taste over metrics.** A number earns its place only if it changes what you do next. Insights keeps three
   tiles: last 7 days (with the delta), response rate, interview rate. The rest moved into subtitles.

## Reference points (open source and products we studied)

- Linear: one accent, restrained neutrals, keyboard-first, every screen a list of what to do next.
- Things 3 and Sunsama: the day as a ritual with a beginning and an end; the "today" list is sacred.
- cal.com and Twenty (open source, Next.js): warm neutral surfaces, generous spacing, serif only where it earns it.
- Fraunces + Inter pairing: fontalternatives.com/pairings/fraunces-and-inter, maxibestof.nuxt.dev/typefaces/fraunces/pairing/inter.
- Chart rules: the dataviz method already used on Insights (one hue, honest lengths, table views).

## What shipped in the soul pass

- Fonts (`src/app/layout.tsx`): Fraunces for `h1` and the `.display` class, Inter for the body (the body was Arial).
- Tokens (`src/app/globals.css`): warm paper neutrals and a designed dark set, both mapped onto Tailwind's
  neutral/white tokens so every page follows without edits; `.rise` entrance; focus-visible rings.
- Home (`src/app/today/today-client.tsx`): three things, always the same shape; morning/evening order; day-done line;
  one-line "elsewhere" strip for Jobs, Network, Life.
- Insights: three tiles.
- Copy: "signed out" → "You're signed out. Sign in again."; "Loading…" stays (it is honest).
