# Changelog

## 2026-11-15 — Member-area redesign: Exercises + Scorecard (`feat/member-area-redesign`)

Rebuilt the two core member pages + the edit view to the new design canvas
(`design/power-club-this-week`, `-scorecard`, `-edit-exercises`), keeping the
existing data/logging logic intact. **Behind auth — verified by build/typecheck/
code review, not a logged-in click-through.**

### New features
- **Readiness selector** (Exercises): Ready / So-so / Not ready adjusts the
  *suggested* target weight per exercise. Chosen per day, remembered in
  localStorage. The weight input still starts empty and only persists what you
  enter/confirm — no weight is ever logged that you didn't lift. (This is the one
  deliberate deviation from the mockup's pre-filled input, to protect data.)
- **Show Up Guarantee** tracking: new `useShowUpGuarantee` hook counts distinct
  active days per week (target 3) over a 4-week window (target 12) from completed
  logs. Shown on the Scorecard (month card + 4-week dots) and Exercises (this-week card).
- **Current / best streak** card on the Scorecard (`useStreaks`/`computeStreaks`).

### Scorecard (`Leaderboard` + `ExerciseScorecard`)
- New layout: Show Up Guarantee + streak row; Activity (range toggle, stat tiles,
  graduated year heatmap, legend); Overall strength + strength-levels legend;
  Exercise progress list with group filters, **Level / Sessions / A–Z sort**, level
  segments, PR badges, and show-all. Preserves the exercise derivation, hide/unhide
  + Add exercise, and the `ExerciseDetail` drill-down. `ActivityOverview` and
  `StrengthSummary` folded in and removed.

### Exercises (`CurrentWeek`)
- New focused-day layout: week strip (click a day to focus it), a gradient "today"
  card with readiness + exercise list + finish, and a right column (Show Up
  Guarantee, Next up, Tip). **All logging preserved**: `exercise_logs` write path,
  `-1`=fail ("F"), blur/toggle saves, Complete/Undo, rest-day logging.

### Edit exercises (`ExerciseEditor`)
- Restyled to the design (numbered cards, single-select Type pills — Weights /
  Bodyweight / Time / Rounds / Assisted — Sets/amount/load/progression fields,
  video). Autosave model unchanged.

### Other
- Strength levels relabelled **Beginner / Leveling up / Strong / Advanced / Very
  strong** (ratio thresholds unchanged) across the engines + Profile.
- App sidebar colours aligned to the design (`#2B1736` ground, `#FF8AC4` logo,
  `#E8308C` active).


## 2026-11-15 — Homepage + login redesign (`feat/homepage-redesign`)

Rebuilt the public landing page ([src/pages/Landing.tsx](src/pages/Landing.tsx)) and the
log-in page ([src/pages/Auth.tsx](src/pages/Auth.tsx)) to match the approved design canvas
(the "Harley" palette). Source mockups kept in [design/](design/) for reference.

### "Keep me logged in" (now functional) + reset-password restyle
- `src/integrations/supabase/authStorage.ts`: a custom storage adapter so the
  checkbox is real — checked keeps the session in `localStorage` (survives a
  browser restart), unchecked uses `sessionStorage` (cleared when the browser
  closes). `client.ts` now uses it; `Auth.tsx` records the choice before sign-in
  (signups always persist). *Heads-up: `client.ts` is a Lovable-generated file;
  if it's ever regenerated, re-add the `storage: authStorage` line.*
- `src/pages/ResetPassword.tsx` rebuilt in the new design language (gradient +
  hard-shadow card, Bangers headings, pink buttons, show/hide password). Recovery
  logic and all three states (checking / invalid / ready) unchanged.

### Login page (`Auth.tsx`)
- Two-panel layout: gradient brand panel (logo + SVG heart, "Your plan is waiting. Let's
  lift.", a **static** "This week" tracker illustration) + form panel.
- Form: "Back to home", Email, Password with a **show/hide** toggle, "Keep me logged in",
  pink "Let's go!" button, "Join the club for €10/month" (lilac), footer links.
- **Existing auth logic unchanged** — still `signIn` / `signUp` / `resetPasswordForEmail`,
  the `?mode=` param, the signups feature flag, and the forgot-password flow; only the
  layout/styling changed. "Keep me logged in" reflects the app's default persistent
  session (unchecking is cosmetic for now).
- Mobile stacks form-first (brand panel below) so login stays immediately reachable.
- Scoped pink focus ring added in `index.css` (`.pc-auth input:focus`).

### Landing page

- New look: off-white `#FBF9FB` ground, deep-purple `#2B1736` ink/borders with hard
  `4px/8px` offset shadows, a pink→purple gradient hero, yellow CTA, lilac chips.
- New hero **product card** ("Leg day" with per-exercise weight progressions + streak).
- "Our philosophy" (6 cards incl. **Train by readiness** — Ready / So-so / Not ready),
  "Who it's for" chips, "What you get inside" (5 cards), "Stronger together" band,
  pricing, FAQ (`<details>`), dark footer.
- **Pricing model change (from the design):** dropped the "2-week free trial" framing
  in favour of **€10/month + a "Show Up Guarantee"** (train 3×/week for 4 weeks → next
  month free). CTAs now read "Join for €10" and point to `/auth?mode=signup`;
  "Log in" → `/auth?mode=login`; footer Privacy/Terms → their routes. No payment flow
  added — price is still display-only.
- Updated `index.html` meta/OG description to drop "2 weeks free"; hid the native
  `<summary>` disclosure marker in `index.css` for the FAQ.
- Verified desktop + mobile in preview; FAQ toggles; console clean; `tsc`/build pass.

## 2026-10-15 — Data backfill: normalize malformed plan rows (`fix/normalize-plan-exercise-rows`)

Follow-up to bug #3. The structured editor fixed *new* edits, but existing
rows in `default_workout_plans` / `user_workout_plans` still had kg jammed into
`reps` ("3 × 20 Bodyweight") or empty `reps` ("3 ×").

- `supabase/migrations/20261014120000_normalize_plan_exercise_rows.sql` — a
  one-off, **idempotent** backfill. For known weighted lifts whose weight slot
  reads "Bodyweight"/blank and whose `reps` is a number > 15, it moves the
  number to `suggestedWeight` (as kg), resets `reps` to 10, and clears the bogus
  bodyweight flag. Any empty `reps` defaults to 10. Bodyweight/cardio moves and
  rows with a real kg weight are never touched.
- **Not run here** — it mutates production data and there's no local Postgres in
  this environment to execute it against. Review + dry-run (the file documents
  how) before applying to prod. Logic was traced against the three QA-reported
  rows; it is conservative by design (`reps > 15` guard, weighted-lift allowlist).

## 2026-10-14 — Member-area QA bug fixes (`feat/public-landing-page`)

Ten fixes from the 13 Oct QA pass.

1. **Meals flag flash** — `FeatureGate` showed the gated children while the flag
   query was in flight, so a disabled feature briefly flashed its real UI (the
   meal "7-DAY PLAN BUILDER") before the "coming soon" placeholder. Now it shows
   a neutral loader while loading. Also **removed Meals from the nav** until it's
   ready (admins can still reach `/meals` by URL). The flag read/write code
   itself is correct (seed stores `'true'::jsonb`, writes store booleans).
2. **Workout counts** — the admin Users table counted *this-month* distinct days
   under a column headed just "Workouts" (→ 0), while the Scorecard counts
   *all-time* distinct days (→ 66). AdminUsersTable now counts all-time distinct
   workout days, matching the Scorecard (`workouts_this_month` → `workout_days`).
3. **Plan lines (sets/reps/weight)** — the editor had no weight field and a
   free-text reps box, so imports/edits jammed kg into reps ("3 × 40 Bodyweight")
   or left reps blank ("3 ×"). Editor now has structured **Sets / Reps / Weight
   (kg)** number inputs with a kg unit shown, a bodyweight/timed/assisted
   placeholder instead of a weight box where kg doesn't apply, and the mislabeled
   "Weight" flag button is now "Bodyweight". The plan renderer no longer prints
   "3 ×" when reps is empty (shows "3 sets"). *Note: pre-existing bad rows still
   need a re-save to pick up the structured shape — no DB migration was run.*
4. **Exercise names / categories / scale** — added `src/lib/exerciseNormalize.ts`
   (`canonicalExerciseName`) to merge duplicates (Romanian Deadlift/deadlift,
   Goblet Squat/Squats, Bike Sprint/Sprint, Pull Up/Pull Ups, …); the Scorecard
   now groups by canonical name. Gave Leg Extension, Reverse Lunges, Glute Bridges
   proper categories; Glute Bridges is tracked in reps (not the kg scale). Pull
   Ups (assisted) and Bike Sprint (rounds) stay off the kg scale once names merge.
5. **Strength-level gap** — `buildRangeLabel` made "Very Strong" end at
   `thresholds[3]` but "Elite" start at `thresholds[4]`, leaving a gap (e.g.
   76→101 kg). Elite now starts where Very Strong ends.
6. **Tooltips + HIIT filter** — the "NF" (e.g. 1F/2F/3F) badges now have a real
   tooltip explaining they're failed attempts (desktop had none before); "Weeks
   Won" and the other profile stats got explanatory tooltips; the Scorecard
   filter button "HIIT" is renamed "Cardio & Power" to match the exercise tag.
7. **Admin toggle + admin routes** — `AdminOnly` now gates on the *real* admin
   role, so admins can open `/dashboard`, `/learn`, `/meals`, etc. directly by
   URL even while previewing in "user" view (was bouncing to `/week`). The
   view switcher got a "Viewing as" label and a tooltip explaining it.
8. **Teams & Challenges for members** — removed the `AdminOnly` wrapper from
   `/teams`, added "Challenge" to the member nav (sidebar + bottom bar), and
   added an empty state explaining how a 4-week challenge works.
9. **Language vs This Week range** — "This Week" used `addWeeks(start, 1)` (Mon→
   next Mon, "Oct 12–19"); now `addDays(start, 6)` (Mon→Sun, "Oct 12–18") to
   match the Language page.
10. **Console noise + sidebar** — removed the per-load `console.log` debug
    statements in AdminUsersTable; made the desktop dark sidebar stretch to the
    full document height (inner sticky, viewport-tall column) so its background
    runs to the bottom of long pages.

### Not verified
The member area is behind auth, so these were checked via `tsc`, `npm run build`,
a clean dev-server compile, and code review — **not** a live logged-in click-through.
No DB migration was run (bug 2/3 are client-side; bug 3's structured editor fixes
new edits, existing malformed rows need a re-save). Specific member-area console
errors couldn't be reproduced without a session; the known debug noise was removed.

## 2026-10-14 — Public landing page + auth polish (`feat/public-landing-page`)

### Added
- **Public landing page** at `/` for logged-out visitors (`src/pages/Landing.tsx`).
  Sections: header (logo + Log in + Start free trial), hero, How it works (5 cards),
  Who it's for, What you get inside (5 feature cards), Stronger Together Anywhere,
  Pricing (€10/mo, 2 weeks free), FAQ accordion, footer (Caparica Founders Breakfast,
  Privacy, Terms, Contact). Uses the existing Bangers/Nunito + pink/purple comic-border
  design system.
- **`/privacy` and `/terms`** placeholder pages (`src/pages/Privacy.tsx`, `Terms.tsx`,
  shared `LegalPage.tsx`). Placeholder copy, clearly marked "to be reviewed before launch".
- **Branded 404 page** — unknown URLs now render `NotFound` instead of redirecting to `/auth`.

### Changed
- **Routing** (`src/App.tsx`): logged-out visitors see the landing page at `/`; logged-in
  users still go straight to the app shell (Leaderboard at `/`). `/privacy` and `/terms`
  are public for everyone.
  - **Decision:** logged-out visitors hitting a *known* app route (`/week`, `/profile`, …)
    are redirected to `/auth?mode=login` (so they can sign in and reach it), while genuinely
    unknown URLs fall through to the 404 page. This honours "404 for unknown URLs" without
    turning real-but-protected routes into dead ends.
- **Auth card** (`src/pages/Auth.tsx`):
  - Reads `?mode=signup` / `?mode=login` so landing-page CTAs open the right form.
  - Password placeholder is now real hint text ("Enter your password" / "Create a
    password…") in lighter grey, instead of `••••••••` that looked pre-filled.
  - Field labels darkened (`text-muted-foreground` → `text-foreground`) for contrast.
- **`index.html`**: title → "Power Club – Get strong in 30 minutes"; meta/OG/Twitter
  description → the product one-liner.

### Notes
- Verified in the dev preview (desktop + 375px mobile): all sections, FAQ accordion,
  `?mode` switching, `/privacy`, 404, and the logged-out `/week → /auth` redirect. Console clean.
- **Logged-in flow is structurally unchanged** (same `ProtectedLayout` for `/*` when a user
  is present) but was not exercised with a real login — no payments were added, pricing is
  display-only as requested.
- Dev server runs on port **8090** here because 8080 is taken by another local project;
  Vite's own config still defaults to 8080.
