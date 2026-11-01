# Valentine Heart 💗

A heart made of light for Kim Tú. Stardust drifts across a night sky, spirals in and gathers into a 3D heart of up to 18,000 glowing particles that beats, lub-dub, at a resting 66 beats a minute. Each beat sends a ripple of light across it. Send love and it bursts like fireworks and gathers again; press and hold it and the particles write "Kim Tú" in light.

**Live:** [happy-valentine-from-perceval.vercel.app](https://happy-valentine-from-perceval.vercel.app)

## The experience

| Moment    | What happens                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Stardust  | The message fades in under a sky of drifting dust, stars and the odd shooting star.                              |
| Gathering | The dust spirals in, like a galaxy settling, and becomes the heart.                                              |
| Heartbeat | The heart turns slowly, beats and glows; a soft halo pulses with it. The pointer parts the light around it.      |
| The aura  | Little hearts stream off the outline: the 2025 heart, with its exact physics, now living around the new one.     |
| Send love | The heart bursts outward with gold sparks and gathers again, with a chime and a tap of haptics.                  |
| The name  | Once by itself, and whenever the heart is held, the particles leave the heart and write "Kim Tú", then return.   |
| Sound     | Optional and off by default: a synthesised heartbeat in time with the visuals over a soft, breathing chord.      |
| 2025      | [The original 2025 page](https://happy-valentine-from-perceval.vercel.app/2025.html) is kept, exactly as it was. |

Reduced-motion settings get a still, glowing heart with no gathering, beating or bursting. Without WebGL there is a drawn heart that beats in CSS, and without JavaScript the message and the heart still appear.

## Make it for someone else

Everything personal is in [`src/content/valentine.ts`](src/content/valentine.ts): the name (also drawn in particles, so keep it to a word or two), the sender, the greeting, the tab title, the share-preview text and the button labels. The share image for Messenger, Zalo and iMessage previews is generated from the same file.

## Develop

Use Node.js 26 (see [`.nvmrc`](.nvmrc)) and the Yarn version pinned in `package.json` through Corepack. Node 25 and newer no longer bundle Corepack, so install it once: `npm install --global corepack@0.36.0`.

```sh
corepack yarn install --immutable
corepack yarn dev
corepack yarn verify
```

`verify` runs formatting, ESLint, route types, TypeScript, unit tests, lint and smoke-script regression tests, the production build and the Playwright browser tests at phone, tablet and desktop sizes. Browser tests need Chromium once: `corepack yarn exec playwright install chromium`.

## How it is built

- Next.js 16 (App Router), React 19 and TypeScript. The page is prerendered; only `/api/telemetry` runs as a function.
- Hand-written WebGL2 with no 3D library: three point clouds (stars, the aura and the heart) whose motion is computed entirely in GLSL from a few uniforms. The scene adds about 10 KB of compressed JavaScript and is loaded after the page has painted.
- The heart is sampled from the 2025 page's curve, `x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t`, spread by arc length and by area so the cusp and tip do not crowd, and puffed into 3D.
- The name is drawn with the page's own font onto a hidden canvas and sampled into particle targets.
- Sound is synthesised with Web Audio, so there are no audio files.
- Self-hosted Fraunces (with its soft and optical-size axes) and Be Vietnam Pro. `next/og` draws the share image from the same particle heart.
- A strict Content Security Policy and `noindex` headers keep the page private to the people it is shared with.
- The renderer pauses with the tab, rebuilds after a lost GPU context, thins its particles on slow devices and caps the frame step, so returning to the tab never floods the screen.

See [docs/design.md](docs/design.md) for the design direction and the ideas that were left out.

## Monitoring

Production builds on Vercel load Web Analytics and Speed Insights; local and preview builds do not.

- **How the heart was used:** milestones are recorded as virtual pages under `/moments/*` in Web Analytics: `heart-formed`, `love-sent`, `name-held`, `sound-on`, `replayed`, `opened-2025` and `no-webgl`. Each counts once per visit. Custom events need a paid plan; page views do not.
- **Speed:** Speed Insights reports real-device Core Web Vitals.
- **Errors:** browser errors are sent to `/api/telemetry` and server errors through `instrumentation.ts`; both appear in the deployment's runtime logs as one JSON line each, with the commit.
- **Uptime:** the **Production smoke** workflow checks the live site after every production deployment and every morning.

Only milestone names and error messages are collected: no names, text or query strings.

## Delivery

GitHub Actions runs **Valentine Heart quality** and **Valentine Heart browser** on every pull request; Vercel builds a preview of every branch and deploys `main` to production once both checks pass. See [docs/deployment.md](docs/deployment.md) for the full setup and release routine.

## Credits

Made by [Bùi Quốc Thịnh](https://github.com/Perceval-Wilhelm). The 2025 page started from the widely shared "pinkboard" canvas heart; its original author is not named in the copy it came from. The heart distance function in the aura shader is [Inigo Quilez's](https://iquilezles.org/articles/distfunctions2d/).

## License

All rights reserved. The repository is public for viewing as a personal project and portfolio piece. No licence is granted to reuse its code, shaders, design, copy or images, and the recipient's name and message may not be reused in any form. The 2025 page, Inigo Quilez's distance function, the Fraunces and Be Vietnam Pro typefaces and open-source dependencies keep their own terms. See [LICENSE](LICENSE).
