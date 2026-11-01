/** Sound is synthesised, so there are no audio files to download: a heartbeat, a soft pad and a chime. */
export type HeartAudio = {
  /** Starts sound from a user gesture; resolves to whether the browser allowed it. */
  enable: () => Promise<boolean>;
  disable: () => void;
  heartbeat: (kind: "lub" | "dub") => void;
  chime: () => void;
  dispose: () => void;
};

type Audio = { context: AudioContext; master: GainNode };

export function createHeartAudio(): HeartAudio {
  let audio: Audio | null = null;
  let padStarted = false;
  let on = false;

  function open(): Audio | null {
    if (audio) return audio;
    if (typeof AudioContext === "undefined") return null;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    audio = { context, master };
    return audio;
  }

  /** A warm, slowly breathing A major chord, well below the heartbeat. */
  function startPad({ context, master }: Audio) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    const level = context.createGain();
    level.gain.value = 0.026;
    const breath = context.createOscillator();
    breath.frequency.value = 0.07;
    const depth = context.createGain();
    depth.gain.value = 0.012;
    breath.connect(depth).connect(level.gain);
    breath.start();
    [220, 277.18, 329.63, 440].forEach((frequency, i) => {
      const tone = context.createOscillator();
      tone.type = i === 3 ? "triangle" : "sine";
      tone.frequency.value = frequency;
      tone.detune.value = (i - 1.5) * 4;
      tone.connect(filter);
      tone.start();
    });
    filter.connect(level).connect(master);
  }

  function tone(
    { context, master }: Audio,
    { at, from, to, peak, length }: { at: number; from: number; to: number; peak: number; length: number },
  ) {
    const oscillator = context.createOscillator();
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + length * 0.7);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(master);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  }

  return {
    async enable() {
      const current = open();
      if (!current) return false;
      await current.context.resume().catch(() => undefined);
      on = current.context.state === "running";
      if (!on) return false;
      if (!padStarted) {
        padStarted = true;
        startPad(current);
      }
      const now = current.context.currentTime;
      current.master.gain.cancelScheduledValues(now);
      current.master.gain.setTargetAtTime(0.9, now, 0.25);
      return true;
    },
    disable() {
      on = false;
      if (!audio) return;
      const now = audio.context.currentTime;
      audio.master.gain.cancelScheduledValues(now);
      audio.master.gain.setTargetAtTime(0, now, 0.12);
    },
    heartbeat(kind) {
      if (!on || !audio) return;
      const at = audio.context.currentTime;
      const peak = kind === "lub" ? 0.8 : 0.5;
      tone(audio, { at, from: kind === "lub" ? 64 : 72, to: 38, peak, length: 0.24 });
      // An octave up, so phone speakers that cannot play 40–70 Hz still carry the beat.
      tone(audio, { at, from: 128, to: 80, peak: peak * 0.35, length: 0.18 });
    },
    chime() {
      if (!on || !audio) return;
      const at = audio.context.currentTime;
      [1046.5, 1318.51, 1567.98, 2093].forEach((frequency, i) => {
        tone(audio!, { at: at + i * 0.07, from: frequency, to: frequency, peak: 0.06, length: 1.4 });
      });
    },
    dispose() {
      on = false;
      void audio?.context.close().catch(() => undefined);
      audio = null;
    },
  };
}
