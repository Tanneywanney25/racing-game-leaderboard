# Top-Down Racer (racing-game-leaderboard)

Top-Down Racer is the one genuine racing game in this account's course-project batch, rebuilt into a four-player realtime racer on Firebase Realtime Database. Racers claim one of four color-coded lanes through a transactional lobby, then hold the throttle down a 4,000-pixel vertical track with accelerate–decay–cap physics and a camera that stays locked on your car. Only names, distances, and finish timestamps travel over the wire. A live leaderboard panel shows per-player progress bars and provisional ranks mid-race, then a final finish-order table with exact times; competition ranking handles ties (1-1-3), finished racers always outrank unfinished ones, and your fastest runs persist to a local best-times list. Firebase credentials live in env vars via `.env.example`. TypeScript throughout with a pure, Vitest-covered model for ranking, tie handling, and car physics; typed p5 rendering; ESLint, Prettier, GitHub Actions CI, and Vercel deploy config.

## How a race works

1. Enter a name and **Join** — a Firebase transaction assigns the lowest free lane
   (up to four; a disconnect frees the lane automatically).
2. The host (lane 1) presses **Start race** — solo time-trials are allowed.
3. Hold `↑` / `W` to accelerate (420 px/s²), release to coast (−300 px/s²), capped at
   520 px/s. Your distance syncs every 120 ms.
4. Crossing the 4,000 px finish line writes your `finishedAt` timestamp; when every
   racer has finished, the host flips the room to the results phase.
5. The panel shows the finish-order table; your time lands in the local best-times list.

## Ranking rules (src/game/model.ts)

- Finished racers rank by `finishedAt` ascending — always ahead of unfinished racers.
- Unfinished racers rank by distance descending (that's also the live position sort).
- Ties use competition ranking: equal finish times (or equal distances) share a rank
  and the next racer skips one (1, 1, 3).

## Firebase setup

`cp .env.example .env` and fill in `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_APP_ID` from your Firebase project (Realtime Database enabled).
Without a `.env` the app boots into a labeled "not configured" state.
On Vercel, add the same variables in Project → Settings → Environment Variables.

## Architecture

- `src/game/model.ts` — pure: ranking with tie handling, live sort, throttle physics,
  finish detection. No p5, no Firebase.
- `src/net/firebase.ts` — typed RTDB layer: transactional lane claim, presence,
  race phases, disconnect cleanup.
- `src/sketch.ts` — typed p5: tiled vertical track, follow camera, lane rendering.
- `src/ui/` — lobby overlay and the leaderboard/best-times panels.
- `src/systems/history.ts` — local best-times persistence (sorted, bounded).

## Tech stack

TypeScript (strict) · Vite · Firebase Realtime Database (v11 modular) · p5.js ·
Vitest · ESLint + Prettier · GitHub Actions

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Testing

`tests/ranking.test.ts` (finish order, live sort, tie handling incl. rank skipping),
`tests/physics.test.ts` (accel/decay/cap, purity, integration bounds, finish boundary),
`tests/history.test.ts` (sorted bounded best times, corrupt-data resilience).
CI runs lint, tests, and build on every push.

## Deploy

```bash
npm i -g vercel   # once
vercel deploy
```

Add the `VITE_FIREBASE_*` env vars in Vercel for online play.

## Project history

The 2022 original was a p5 course project: four cars, UP-arrow +10 distance, rank
recorded past a hardcoded 3860. Rebuilt in 2026 with real throttle physics, a
transactional lobby, tie-aware competition ranking, a live leaderboard UI, tests,
CI, env-var credentials, and deploy config — original car and track art retained.
