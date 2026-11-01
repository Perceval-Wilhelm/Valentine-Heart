# Valentine Heart contributor guide

A personal Valentine's page for one recipient. It is public on GitHub and on Vercel, so treat the recipient's name with care: never add more personal data than the page shows.

## Architecture

- Next.js App Router. `src/app/page.tsx` renders `ValentineCard` with `src/content/valentine.ts`, which holds every personal string. The page is static.
- `src/features/heart/ValentineCard.tsx` is the client component: the server-rendered message, controls and fallback heart, plus pointer handling (tap sends love, a 420 ms press writes the name), sound and layout. It loads `scene.ts` with a dynamic import after the page paints.
- `scene.ts` is framework-free WebGL2: it owns the timeline (stardust, intro, heart, name, burst), the heartbeat clock, adaptive particle count, reduced motion and GPU context loss. It reports phases through `onPhase`; `ValentineCard` mirrors them on `data-phase`, which the CSS and the tests read.
- `shaders.ts` holds all motion as GLSL. Keep per-particle work there, not in JavaScript loops. Do not put backticks in GLSL comments: the shaders are template literals.
- `geometry.ts` (curve, sampling, arc-length table) and `heartbeat.ts` (beat envelope, sound timing) are pure and unit-tested. `text-points.ts` samples the name from a canvas; `audio.ts` synthesises sound.
- The aura is the 2025 page's particle system ported to the GPU. Keep its physics (2 s life, 135 px/s, −0.35 deceleration, 160 px per unit, #ea80b0) unless the design changes deliberately. `public/2025.html` is the original page; leave it as it is.
- `src/app/opengraph-image.tsx` draws the share image from the same sampler and content. `next.config.ts` owns the security headers, including `X-Build`, which the smoke test reads.

## Development

Use Node.js from `.nvmrc` (the supported floor is 26.13.0, Vercel's current patch) and Yarn through Corepack (`npm install --global corepack@0.36.0` once on Node 25+).

```sh
corepack yarn install --immutable
corepack yarn dev
corepack yarn verify
```

`check:all` runs formatting, ESLint (zero warnings), route types, TypeScript, Vitest, lint and smoke-script regression tests and the production build. `verify` adds the Playwright tests; they freeze the page clock to step through the intro, burst and name, measure lit pixels from screenshots and scan with axe. The test server defaults to port 4340; set `PLAYWRIGHT_PORT` instead of killing unrelated processes.

For visual changes, check a 375 px phone and a 1440 px desktop, with and without reduced motion, and confirm there are no console errors or failed requests. WebGL changes also need a check of the no-WebGL fallback.

## Product boundaries

- Keep added copy free of pronouns, so personalising stays one edit in `valentine.ts`.
- Telemetry is milestone names (`/moments/*` virtual page views, once per visit) and error reports only. Never send names, text or query strings. Analytics mount only in Vercel production builds.
- The page must stay `noindex` with its robots rules and CSP. New third-party origins need a CSP change and a reason.
- Every interaction needs a fallback: the button for the tap, the automatic name reveal for the long press, the CSS heart without WebGL, and the server-rendered message without JavaScript.
- Respect `prefers-reduced-motion`: no gathering, beating, aura, bursts or automatic name; light and fades stay.
- Keep the first load within the budgets in `e2e/valentine.spec.ts` (script under 180 KB, fonts under 200 KB compressed).
- The repository is all rights reserved (`LICENSE`). List any new third-party code, fonts or images there with their terms.

## Dependencies and delivery

- Pin direct dependency versions and commit `yarn.lock` with intentional dependency changes. Prefer the newest stable versions that work together; do not force installs or add broad resolutions.
- Keep Vercel configured as Next.js through `vercel.json`, with install and build run through the pinned `npx --yes corepack@0.36.0 yarn …`; update it, the workflows and the README together.
- See `docs/deployment.md` before changing GitHub or Vercel settings. Keep actions pinned to full commit SHAs, keep read-only workflow permissions and the two check names (Vercel's deployment checks wait for them by name), and do not add deployment credentials: Vercel's Git integration deploys.
- Use Conventional Commits. Author every commit as the repository owner, `Bùi Quốc Thịnh <82101710+Perceval-Wilhelm@users.noreply.github.com>`, never with a work identity, and add no co-author or tool attribution. Push and open pull requests as Perceval-Wilhelm. Commit and push only when authorized.
