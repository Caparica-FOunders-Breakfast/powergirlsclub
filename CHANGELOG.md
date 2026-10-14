# Changelog

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
