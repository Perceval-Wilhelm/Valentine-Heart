/**
 * Everything personal or language-specific lives here, so sending the heart to someone else is an edit
 * to this file only: the page, the share preview, the 404 and error pages and the tests all read it.
 * Change the four values below first; the rest is built from them and can be reworded freely.
 * Keep added copy free of pronouns.
 */

/** Who the heart is for. It is also written in particles, so keep it to a word or two. */
const to = "Kim Tú";
/** Who it is from, shown under the name and in the share preview. */
const from = "Perceval";
/** The line above the name. */
const greeting = "Happy Valentine,";
/** Shown before the sender's name (here, the finger heart from the 2025 page's title). */
const signature = "🫰🏻";

export type ValentineContent = {
  to: string;
  from: string;
  greeting: string;
  signature: string;
  /** The browser tab's title. */
  tabTitle: string;
  /** Language of the copy, for screen readers ("en", "vi", …), and the share card's locale. */
  lang: string;
  locale: string;
  /** What Messenger, Zalo and iMessage show for a shared link; the share image uses `byline` too. */
  share: { title: string; description: string; byline: string };
  actions: { send: string; hint: string; sound: string; replay: string };
  /** The corner link to the original 2025 page; `null` hides it. */
  classic: string | null;
  notFound: { title: string; body: string; back: string };
  failure: { title: string; body: string; retry: string };
};

export const valentine: ValentineContent = {
  to,
  from,
  greeting,
  signature,
  tabTitle: `${signature}, ${from}`,
  lang: "en",
  locale: "en_US",
  share: {
    title: `${greeting} ${to}`,
    description: `A heart made of light, from ${from} ${signature}`,
    byline: `from ${from}`,
  },
  actions: {
    send: "Send love",
    hint: "or press and hold the heart",
    sound: "Heartbeat sound",
    replay: "Replay",
  },
  classic: "The 2025 heart",
  notFound: {
    title: "This page drifted off into the night",
    body: "The heart is still where it was.",
    back: "Back to the heart",
  },
  failure: {
    title: "The light flickered",
    body: "Something went wrong while drawing the heart.",
    retry: "Try again",
  },
};
