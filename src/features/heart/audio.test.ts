import { afterEach, describe, expect, it, vi } from "vitest";
import { createHeartAudio } from "./audio";

/** Just enough of the Web Audio graph to count the sounds that get scheduled. */
class FakeAudioContext {
  static started = 0;
  state = "suspended";
  currentTime = 0;
  destination = {};
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
  createGain() {
    const param = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    return {
      gain: { ...param, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() },
      connect: (node: unknown) => node,
    };
  }
  createBiquadFilter() {
    return { type: "", frequency: { value: 0 }, connect: (node: unknown) => node };
  }
  createOscillator() {
    const param = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    return {
      type: "sine",
      frequency: param,
      detune: { value: 0 },
      connect: (node: unknown) => node,
      start: () => (FakeAudioContext.started += 1),
      stop: vi.fn(),
    };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeAudioContext.started = 0;
});

describe("createHeartAudio", () => {
  it("does nothing, and reports so, where Web Audio is missing", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const audio = createHeartAudio();
    await expect(audio.enable()).resolves.toBe(false);
    expect(() => {
      audio.heartbeat("lub");
      audio.chime();
      audio.disable();
      audio.dispose();
    }).not.toThrow();
  });

  it("plays only while enabled", async () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const audio = createHeartAudio();
    audio.heartbeat("lub");
    expect(FakeAudioContext.started).toBe(0);

    await expect(audio.enable()).resolves.toBe(true);
    const pad = FakeAudioContext.started;
    audio.heartbeat("lub");
    expect(FakeAudioContext.started).toBe(pad + 2);
    audio.chime();
    expect(FakeAudioContext.started).toBe(pad + 6);

    audio.disable();
    audio.heartbeat("dub");
    expect(FakeAudioContext.started).toBe(pad + 6);
  });
});
