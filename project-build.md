# Battleground - Build Plan

---

## Stage 1: Project Scaffold
Set up the bare minimum structure before writing any real logic.

- Create `index.html` with four views on one page, toggled via the `hidden` attribute:
  - **Input view** — two text inputs and a Fight button (visible by default)
  - **Loading view** — a loading indicator (hidden)
  - **Result view** — winner card, reasoning, and image placeholder (hidden)
  - **Error view** — error message display (hidden)
- Create `style.css` linked to the HTML (no real styling yet, just structure)
- Create `app.js` — wires the Fight button and view-toggling logic (no API calls yet)
- Open in browser locally and confirm the shell loads

Milestone: A local page showing the input form. JS can toggle between all four views.

---

## Stage 2: Fight Function
One function that runs the entire fight — validation, verdict, and image generation.

- Create a single fight function that:
  - Sends both names to Claude for validation + verdict in one call
  - If either name is invalid, reject with inline guidance
  - If valid, Claude returns the predicted winner and reasoning
  - Calls OpenAI image API for the winner's art
- Display the winner's card with reasoning and generated image on the page
- Store API keys as local environment variables (`.env`)

Milestone: Submitting two real fighters returns a verdict with reasoning and a generated image. Submitting junk is rejected.

---

## Stage 3: System Prompt Hardening
Lock Claude down to only judge fights and resist prompt injection.

- Write a system prompt that scopes Claude strictly to fight judging
- Claude must always name one winner — no ties, no refusals, no "it depends". Even identical matchups (same fighter vs themselves) must produce a winner
- Verdict tone must be fun and playful while staying logical — 2 to 4 sentences max
- Reject attempts to hijack the prompt (e.g. "ignore previous instructions")
- All generated images must follow a shared art style template:
  - Bold flat-color illustration, thick black outlines, dynamic action pose, dramatic lighting, video game character art style. Keep it centered, filling most of the frame, isolated on a plain solid light grey background with no scenery. Absolutely no text, words, letters, numbers, logos, watermarks, UI elements, borders or frames of any kind. Illustration only, nothing else on canvas.
- Handle moderation-blocked as its own distinct error case, separate from a generic image failure (e.g. show a specific "content blocked" message instead of a generic error)
- Test with adversarial inputs to confirm it holds

Milestone: Claude refuses off-topic requests and prompt injection attempts, always picks a definitive winner (including identical matchups), delivers the verdict in a punchy 2–4 sentence format, and all images share a consistent art style. Moderation blocks surface a clear, specific message.

---

## Stage 4: Rate Limiting
Prevent abuse, built into the fight function.

- Add rate limiting (5 req/min per IP) inside the fight function
- Return a clear error when the limit is hit

Milestone: Rapid-fire requests get blocked after 5 per minute.

---

## Stage 5: BattleDex — Save & Display
Let users save individual fighters.

- Build a BattleDex UI section on the page (collapsed or below the fight area)
- After a fight, give the user an option to save each fighter to the BattleDex
- On save: store fighter label and downsized image to LocalStorage
- Display saved fighters in the BattleDex as a gallery of labels and images

Milestone: A fighter can be saved and viewed in the BattleDex with their label and image.

---

## Stage 6: Polish + Edge Cases
Tighten the experience before considering it shippable.

- Loading states for verdict and image generation
- Error states for failed API calls
- Image downsizing before writing to LocalStorage
- Basic responsive layout for mobile

Milestone: The full flow works cleanly on desktop and mobile with no broken states.

---

## Deferred (Not in scope yet)
- Backend / cross-device BattleDex sync
- Quick re-fight from saved BattleDex entries
- Vercel deployment
