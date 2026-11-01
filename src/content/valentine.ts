/**
 * Everything personal lives here, so a new message is one edit. Keep added copy free of pronouns.
 * `to` is also drawn in particles, so keep it short (one or two words).
 */
export const valentine = {
  to: "Kim Tú",
  from: "Perceval",
  greeting: "Happy Valentine,",
  // The finger heart from the 2025 page's title.
  signature: "🫰🏻",
  tabTitle: "🫰🏻, Perceval",
  share: {
    title: "Happy Valentine, Kim Tú",
    description: "A heart made of light, from Perceval 🫰🏻",
  },
  actions: {
    send: "Send love",
    hint: "or press and hold the heart",
    sound: "Heartbeat sound",
    replay: "Replay",
    classic: "The 2025 heart",
  },
} as const;

export type ValentineContent = typeof valentine;
