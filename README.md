# Battleground

A retro arcade-style web app that settles hypothetical fights between any two real athletes. Pick two fighters, get an AI-generated verdict with hype commentary, and collect your favorites in the BattleDex.

**Live:** Deployed on Vercel

## How It Works

1. Enter two real athlete names (any sport, any era)
2. AI judges deliberate while custom character art is generated
3. A winner is declared with hype-commentator reasoning
4. Save fighters to your BattleDex collection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Plain HTML, CSS, JavaScript (no framework, no build step) |
| Hosting | Vercel (static files + serverless functions) |
| Fight Verdicts | Claude API (Haiku) via `/api/fight` |
| Character Art | OpenAI Image Generation via `/api/image` |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase Postgres (BattleDex storage with RLS) |

## Project Structure

```
battleground/
├── index.html            # Main fight page (single-page, view-toggling)
├── battledex.html        # BattleDex collection page
├── auth.html             # Login / signup page
├── app.js                # Fight flow, result rendering, confetti
├── battledex.js          # BattleDex gallery, remove/clear handlers
├── storage.js            # Supabase client, auth, dual-path storage
├── auth-ui.js            # Navbar sign-in/out button component
├── style.css             # All styles (retro arcade aesthetic)
├── api/
│   ├── fight.js          # Serverless: Claude verdict + input validation
│   └── image.js          # Serverless: OpenAI character art generation
├── supabase-migration.sql # Database schema + RLS policies
├── vercel.json           # Vercel config (function timeouts)
└── .env                  # API keys (not committed)
```

## Architecture

### Frontend

Single-page view-toggling pattern. `index.html` contains four `<section>` elements (`#view-input`, `#view-loading`, `#view-result`, `#view-error`). Only one is visible at a time, controlled by toggling a CSS `.active` class via `showView(id)` in `app.js`.

### Serverless Functions

Each file in `/api` becomes a Vercel serverless endpoint:

- **`POST /api/fight`** — Sends two fighter names to Claude with a system prompt that enforces structured JSON output. Returns `{ valid, winner, loser, reasoning }` or `{ valid: false, error }`. Includes IP-based rate limiting (5 requests/minute).
- **`POST /api/image`** — Sends a fighter name to OpenAI's image generation API with an arcade art style prompt. Returns base64 image data. Handles content policy violations gracefully.

API keys stay server-side and never reach the frontend.

### Authentication

Supabase Auth with two methods:
- **Google OAuth** — redirect-based flow
- **Email/password** — signup with email confirmation, login with `signInWithPassword`

Auth state is managed in `storage.js`. The navbar (`auth-ui.js`) renders contextually: "Log in / Sign up" when signed out, avatar + name + "Sign out" when signed in.

### Data Storage

Dual-path architecture in `storage.js`:

- **Signed out:** localStorage only (same as before auth was added)
- **Signed in:** Supabase Postgres is the source of truth. localStorage serves as a synchronous read cache.

All reads go through `loadDex()` (synchronous, reads localStorage). Writes go through async functions (`addFighter`, `removeFighter`, `clearAllFighters`) that write to Supabase first, then sync the cache.

**First sign-in merge:** When a user authenticates for the first time, any existing localStorage entries are uploaded to their Supabase account (union merge, skipping duplicates by name). On sign-out, localStorage is cleared.

### BattleDex

A fighter collection with trading-card-style display. Each entry stores a name and a downsized image (200px JPEG at 0.6 quality, ~5-15KB). Images are downsized client-side via canvas before storage.

The BattleDex page supports:
- Viewing all saved fighters in a color-coded grid
- Removing individual fighters
- Clearing all fighters (with confirmation modal)
- Viewing the last fight result

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- A [Supabase](https://supabase.com/) project
- API keys for [Anthropic](https://console.anthropic.com/) and [OpenAI](https://platform.openai.com/)
- Windows: Developer Mode enabled (Settings > System > For developers) for Vercel symlinks

### 1. Clone and install

```bash
git clone https://github.com/Macrichie/Battledex.git
cd Battledex
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-migration.sql` in **Dashboard > SQL Editor**
3. Enable Google auth in **Authentication > Providers > Google** (add your Google OAuth client ID and secret)
4. Set your **Site URL** in **Authentication > URL Configuration** to your production domain
5. Add your production domain to the **Redirect URLs** allowlist
6. Copy your project URL and anon key from **Settings > API**

### 4. Configure Supabase client

Update the two constants at the top of `storage.js`:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

The anon key is safe to expose in frontend code — it's rate-limited and protected by Row Level Security.

### 5. Run locally

```bash
vercel dev --yes
```

The app will be available at `http://localhost:3000`.

## Deployment

```bash
vercel --prod
```

After deploying, make sure your Supabase **Site URL** and **Redirect URLs** point to your production domain (not localhost), otherwise email confirmation links will break.

## API Rate Limiting

The `/api/fight` endpoint enforces a rate limit of **5 requests per minute per IP** using an in-memory map. This resets on cold starts (serverless function recycling).

## Security

- API keys are only used in serverless functions, never exposed to the client
- Supabase Row Level Security ensures users can only access their own BattleDex data
- Fighter name inputs are validated for length (max 50 chars) and trimmed
- The Claude system prompt includes prompt injection defenses
- Email/password auth enforces minimum 8-character passwords with client-side validation
- The Supabase anon key is safe to expose (RLS + rate limiting protect the database)

## License

ISC
