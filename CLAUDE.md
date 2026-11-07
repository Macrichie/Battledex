# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
vercel dev --yes   # start local dev server at http://localhost:3000
```

Requires Developer Mode enabled in Windows (Settings → System → For developers) — Vercel's build cache uses symlinks which Windows blocks otherwise.

API keys go in a `.env` file at the project root (not yet created). They are accessed inside serverless functions via `process.env`.

## Architecture

No framework, no build step. Plain HTML/CSS/JS served statically by Vercel, with serverless functions in `/api`.

**Single-page, view-toggling pattern** — `index.html` has four `<section>` elements (`#view-input`, `#view-loading`, `#view-result`, `#view-error`), all on one page. Only one is visible at a time. `app.js` controls which is shown by toggling the `hidden` attribute via `showView(id)`.

**Serverless functions** live in `/api`. Each file becomes an endpoint (e.g. `api/fight.js` → `/api/fight`). They handle all API key usage — keys never touch the frontend.

**Fight flow (Stage 2+):** User submits two fighter names → `app.js` calls `/api/fight` → serverless function sends names to Claude (validation + verdict in one call) then calls OpenAI for character art → response rendered into the result view.

**Claude system prompt** is defined as `SYSTEM_PROMPT` at the top of `api/fight.js`. It instructs Claude to return structured JSON in one of two shapes: `{ valid: false, error }` or `{ valid: true, winner, loser, reasoning }`.

**BattleDex** (Stage 5+) stores fighter labels and downsized images in `localStorage`. Images are downsized before write to conserve space.

## Build stages

Tracked in `project-build.md`. Current progress:
- Stage 1 complete: scaffold, view toggling, empty-input validation
- Stage 2 in progress: fight function (`api/fight.js`), system prompt written, API wiring next
