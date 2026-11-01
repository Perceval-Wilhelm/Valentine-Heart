# Design

Decisions behind the 2026 rebuild, recorded on 1 November 2026, and the ideas that were weighed and left out.

## Direction: a heart made of light

The 2025 page was a single canvas: little pink hearts streaming off a heart-shaped curve, with the message underneath. Its charm was the particles. The rebuild keeps that idea and gives it depth, rhythm and something to do:

- **Depth.** The heart is a puffy 3D shape (a bright rim that draws the silhouette, a front-and-back shell, a dim fill), sampled from the 2025 curve and slowly turning, so it reads as an object rather than a sticker.
- **Rhythm.** It beats like a resting heart, lub then a softer dub at 66 bpm, and each lub sends a ring of light across its surface. The halo behind it, the CSS fallback heart and the optional sound all keep the same time.
- **Story.** Stardust first, then the heart gathers out of it, so the page arrives rather than appears. The message is visible from the first paint, because it is the point of the page and because the largest text is what Core Web Vitals measures.
- **Play.** One obvious action (Send love: a firework burst that gathers again) and one secret (hold the heart: it writes the name), which the page also performs once by itself so nobody misses it.
- **Memory.** The 2025 heart is not thrown away. Its particle system, with the same lifetime, speed, deceleration and pink, is the aura around the new heart, and the original page is kept at `/2025.html`.

## Look

- A night palette rather than flat black: violet in one corner, a rose bloom where the heart sits, wine at the horizon, film grain to stop banding.
- Additive light: every particle is a soft glow added on top of the others, so dense areas bloom without a post-processing pass.
- Type: Fraunces italic with its "soft" axis at full and optical size at display, warm and a little hand-made; Be Vietnam Pro for small labels. The name carries a slow pink-to-gold shimmer.
- Controls are quiet glass circles; the only filled-looking element is the Send love button.

## Engineering choices

- **WebGL2 by hand, not three.js.** Everything on screen is point sprites with motion computed in shaders, so a 3D library would have added about 150 KB for a camera and a buffer. The whole scene is about 10 KB.
- **Motion in the GPU.** Each particle's dust, heart and name positions are attributes; the shader blends them from a few uniforms. JavaScript does the same small work per frame at 4,000 or 18,000 particles.
- **Even sampling.** The 2025 page spread particles by angle, which crowds the cusp and the tip into visible beams. The rebuild spreads the rim and the aura by arc length and the fill by area.
- **Resilience.** The frame step is capped (a hidden tab cannot flood the screen on return), the renderer rebuilds after a lost GPU context, thins itself if the first 90 frames after forming are slow, and stops drawing entirely under reduced motion once nothing changes.

## Ideas left out

- **A generator** ("make one for your person" with the name in the link). It would turn a personal page into a product and put names in URLs, which the telemetry deliberately never records.
- **A love letter section or a "together since" counter.** They need personal facts that only the sender should write; `src/content/valentine.ts` is the place to add them.
- **Device tilt parallax on phones.** iOS needs a permission prompt for motion sensors, which is a poor first impression for a gift.
- **Save as wallpaper.** Rendering a still with the message is feasible with `canvas.toBlob`, but it needs a preserved drawing buffer or an extra render pass; a natural next step.
- **Bloom post-processing.** Additive glow already reads as bloom; a blur pass would cost fill rate on phones for a small gain.
- **Music.** A recorded track needs licensing and a download; the synthesised heartbeat and chord need neither.
