# Battleground - Project Brief

## 1. What are we actually building? (Scope)

A web app where you type in two real athletes and get an AI-generated verdict on who would win in a fight, plus AI-generated character art for both. Invalid or unrecognized inputs are rejected with inline guidance.

## 2. What's the smallest, simplest version worth shipping (MVP)?

A single page with two text inputs and a Fight button. On submission, the app validates that both entries are real athletes — if not, it rejects the input and shows the user what to enter instead. If valid, it displays an animated winner's card with the predicted winner and the reasoning behind the result. Both fighters get one image each (one image per side, regardless of how many individuals are on that side).

## 3. What are we building this with (Tech Stack)?

HTML, CSS, Vanilla JavaScript for the frontend. Vercel for hosting and serverless functions. Claude's API for the verdict. OpenAI's image API for character art. LocalStorage for saving the BattleDex. Images are downsized before being written to LocalStorage to conserve space.

## 4. What is the BattleDex?

The BattleDex is a saved collection that serves as both a fighter roster and a fight history log. Each entry stores the fighter's name, their AI-generated image, and the fights they've been involved in. Images are generated and saved at the point an entry is created — not on every fight. The BattleDex lives in LocalStorage for now.

## 5. What are we NOT doing yet (Deferred)?

- Rate limiting (will be added later, 5 requests per minute per IP)
- Backend / cross-device BattleDex sync
- Quick re-fight from saved BattleDex entries

## 6. What's the long-term vision, beyond the MVP?

A real backend where BattleDex entries sync across devices. A quick re-fight option using fighters already saved in the BattleDex, so you don't have to retype names. Rate limiting to manage API costs.
