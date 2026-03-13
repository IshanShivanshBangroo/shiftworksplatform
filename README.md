# Shiftworks Platform

Created by **Ishan Bangroo**.

Shiftworks is a browser-based platform of short scenario games about overload management, interruption recovery, prioritization, selective attention, and cleaner handoffs. The platform is written as static HTML, CSS, and JavaScript, with one bounded Cloudflare Pages Function used by the Quayline debrief inside Kindline Switchboard.

## Modules

- **Harbor of Drift** — top-down action-adventure shooter with touch controls, signal triage, and relay restoration
- **Kindline Switchboard** — narrative communications module with optional bounded Quayline debrief
- **Ward Relay** — turn-based planning board for now / next / noise sorting and handoff quality
- **Emberline** — mobile-first side-scrolling courier action game about filtering false urgency while moving
- **Breakwater Watch** — mobile-friendly harbor signal game for sorting real need, safe wait, and false urgency

## Working research question

How can a browser-based, genre-diverse platform of adult-oriented scenario games help players practice overload-management micro-skills such as signal triage, interruption recovery, selective attention under motion, and clean handoffs, while keeping AI guidance bounded to scene-specific operational debriefs rather than open-ended mental health advice?

## Why this artifact is positioned the way it is

This repo is best framed as a systems + design artifact rather than as a clinical efficacy claim. The games aim to operationalize concrete skills and design patterns in playable form. The platform does **not** present itself as diagnosis, therapy, or crisis support.

## Repo layout

- `public/` — static HTML files for the platform and all modules
- `functions/api/quayline.js` — Cloudflare Pages Function used by Kindline
- `functions/api/health.js` — small health route
- `wrangler.jsonc` — Pages + Workers AI config
- `public/_headers` — security headers for static deployment

## Local run

```bash
npm install
npx wrangler pages dev public --ai AI
```

Then open the local Pages URL printed by Wrangler.

## Cloudflare Pages

- Framework preset: **None**
- Build command: leave empty
- Build output directory: `public`
- Add a Workers AI binding named `AI`

Kindline Switchboard calls `/api/quayline` when deployed with Pages Functions. The other modules are static and run fully in the browser.

## Notes

- The platform is intentionally dependency-light for easy inspection and static deployment.
- Session note export is optional and stays in the browser until the player chooses to download it.
- Quayline is intentionally narrow and scene-bounded. It should not be described as a therapist or mental health professional.
