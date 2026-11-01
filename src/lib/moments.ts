import { pageview } from "@vercel/analytics";

export type Moment = "heart-formed" | "love-sent" | "name-held" | "sound-on" | "replayed" | "opened-2025" | "no-webgl";

const recorded = new Set<Moment>();

/**
 * Hobby plans drop custom events, so milestones are recorded as virtual pages: Web Analytics then shows
 * how visitors used the heart under /moments/*. Each counts once per visit. Without the analytics
 * script (local and preview builds) this does nothing.
 */
export function moment(name: Moment) {
  if (recorded.has(name)) return;
  recorded.add(name);
  pageview({ route: "/moments/[moment]", path: `/moments/${name}` });
}
