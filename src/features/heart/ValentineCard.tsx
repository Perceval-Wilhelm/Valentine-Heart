"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ValentineContent } from "@/content/valentine";
import { moment } from "@/lib/moments";
import { reportClientError } from "@/lib/telemetry";
import { createHeartAudio, type HeartAudio } from "./audio";
import { heartPath } from "./geometry";
import type { HeartScene, Phase } from "./scene";

type SceneState = "pending" | "webgl" | "fallback";

/** Pressing the heart this long (ms) writes the name instead of sending love. */
const HOLD = 420;
const HEART_PATH = heartPath();

export function ValentineCard({ content }: { content: ValentineContent }) {
  const stageRef = useRef<HTMLElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<HeartScene | null>(null);
  const audioRef = useRef<HeartAudio | null>(null);
  const [scene, setScene] = useState<SceneState>("pending");
  const [phase, setPhase] = useState<Phase>("intro");
  const [sound, setSound] = useState(false);
  // Restarts the fallback heart's pulse when WebGL is unavailable.
  const [love, setLove] = useState(0);

  function sendLove() {
    sceneRef.current?.burst();
    audioRef.current?.chime();
    navigator.vibrate?.(18);
    setLove((count) => count + 1);
    moment("love-sent");
  }

  const onTap = useEffectEvent(sendLove);

  async function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (sound) {
      audio.disable();
      sceneRef.current?.listen(false);
      setSound(false);
      return;
    }
    const running = await audio.enable();
    sceneRef.current?.listen(running);
    setSound(running);
    if (running) moment("sound-on");
  }

  function replay() {
    sceneRef.current?.replay();
    moment("replayed");
  }

  useEffect(() => {
    const stage = stageRef.current;
    const room = roomRef.current;
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const name = nameRef.current;
    if (!stage || !room || !canvas || !glow || !name) return;

    const audio = createHeartAudio();
    audioRef.current = audio;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let instance: HeartScene | null = null;
    let disposed = false;
    let pressing = false;
    let held = false;
    let timer = 0;

    const layout = () => {
      const box = stage.getBoundingClientRect();
      const area = room.getBoundingClientRect();
      instance?.layout({
        x: area.left - box.left + area.width / 2,
        y: area.top - box.top + area.height / 2,
        size: Math.min(area.width * 0.84, area.height * 0.8, 640),
      });
    };
    const observer = new ResizeObserver(layout);
    const onMotion = () => instance?.setReducedMotion(motion.matches);

    const point = (event: PointerEvent, active: boolean) => {
      const box = stage.getBoundingClientRect();
      instance?.pointer(event.clientX - box.left, event.clientY - box.top, active);
    };
    const release = () => {
      window.clearTimeout(timer);
      if (held) instance?.holdName(false);
      held = false;
      pressing = false;
    };
    const onDown = (event: PointerEvent) => {
      const control = event.target instanceof Element && event.target.closest("button, a");
      if (!instance || control || event.button > 0) return;
      pressing = true;
      point(event, true);
      timer = window.setTimeout(() => {
        held = true;
        instance?.holdName(true);
        moment("name-held");
      }, HOLD);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || pressing) point(event, true);
    };
    const onUp = (event: PointerEvent) => {
      if (!pressing) return;
      // A cancelled touch (the browser took the gesture over) is not a tap.
      const tapped = !held && event.type === "pointerup";
      release();
      if (tapped) onTap();
      if (event.pointerType !== "mouse") point(event, false);
    };
    const onLeave = (event: PointerEvent) => {
      if (pressing) release();
      point(event, false);
    };
    // A long press would otherwise open the phone's context menu.
    const onMenu = (event: Event) => {
      if (pressing) event.preventDefault();
    };

    import("./scene")
      .then(({ createHeartScene }) => {
        if (disposed) return;
        const style = getComputedStyle(name);
        instance = createHeartScene(canvas, {
          reducedMotion: motion.matches,
          name: content.to,
          font: `${style.fontStyle} ${style.fontWeight} 160px ${style.fontFamily}`,
          onPhase: (next) => {
            setPhase(next);
            if (next === "heart") moment("heart-formed");
          },
          onSound: (kind) => audio.heartbeat(kind),
          onFrame: (beat, presence) => {
            glow.style.opacity = String(presence * (0.45 + 0.55 * beat));
            glow.style.transform = `scale(${1 + 0.07 * beat})`;
          },
        });
        if (!instance) {
          setScene("fallback");
          moment("no-webgl");
          return;
        }
        sceneRef.current = instance;
        setScene("webgl");
        observer.observe(stage);
        observer.observe(room);
        layout();
      })
      .catch((error: unknown) => {
        reportClientError(error, "window");
        if (!disposed) setScene("fallback");
      });

    motion.addEventListener("change", onMotion);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("contextmenu", onMenu);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      instance?.dispose();
      sceneRef.current = null;
      audio.dispose();
      audioRef.current = null;
    };
  }, [content.to]);

  const { actions } = content;
  return (
    <main ref={stageRef} className="stage" data-scene={scene} data-phase={phase} data-sound={sound ? "on" : "off"}>
      <canvas ref={canvasRef} className="sky" aria-hidden="true" />
      <div className="shooting-stars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div ref={roomRef} className="heart-room" aria-hidden="true">
        <div ref={glowRef} className="heart-glow" />
        <svg key={love} className="fallback-heart" viewBox="-1.2 -1.1 2.4 2.2">
          <defs>
            <linearGradient id="fallback-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9cc0" />
              <stop offset="1" stopColor="#e23d78" />
            </linearGradient>
          </defs>
          <path d={HEART_PATH} fill="url(#fallback-fill)" />
        </svg>
      </div>

      <div className="message">
        <h1 className="title">
          <span className="greeting">{content.greeting}</span>{" "}
          <span ref={nameRef} className="name">
            {content.to}
          </span>
        </h1>
        <p className="signature">
          <span aria-hidden="true">{content.signature}</span> {content.from}
        </p>
        <div className="actions">
          <button type="button" className="send" onClick={sendLove}>
            <svg viewBox="-1.2 -1.1 2.4 2.2" aria-hidden="true">
              <path d={HEART_PATH} fill="currentColor" />
            </svg>
            {actions.send}
          </button>
          <p className="hint">{actions.hint}</p>
        </div>
      </div>

      <div className="controls">
        <button
          type="button"
          className="control"
          aria-label={actions.sound}
          aria-pressed={sound}
          onClick={() => void toggleSound()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" />
            {sound ? <path className="wave" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.7 7.7 0 0 1 0 11" /> : null}
            {sound ? null : <path className="wave" d="M16 9.5l5 5M21 9.5l-5 5" />}
          </svg>
        </button>
        <button type="button" className="control" aria-label={actions.replay} onClick={replay}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path className="wave" d="M5 12a7 7 0 1 0 2.1-5" />
            <path d="M4.2 3.6 7.7 7l-4.6 1.1z" />
          </svg>
        </button>
      </div>

      {content.classic ? (
        <a className="classic" href="/2025.html" onClick={() => moment("opened-2025")}>
          <span aria-hidden="true">♡</span>
          {content.classic}
        </a>
      ) : null}

      <noscript>
        <style>{".stage .fallback-heart { opacity: 1; } .stage .actions { display: none; }"}</style>
      </noscript>
    </main>
  );
}
