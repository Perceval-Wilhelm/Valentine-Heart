export type ErrorSource = "window" | "promise" | "boundary";
export type ErrorReport = { type: "error"; source: ErrorSource; message: string; stack?: string; path: string };

const SOURCES: ReadonlySet<string> = new Set(["window", "promise", "boundary"]);
const MAX_REPORTS = 5;
let sent = 0;

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;

/** Accepts only well-formed, size-limited error reports; anything else is dropped. */
export function parseErrorReport(value: unknown): ErrorReport | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const message = text(input.message, 300);
  const path = text(input.path, 200);
  if (input.type !== "error" || typeof input.source !== "string" || !SOURCES.has(input.source)) return null;
  if (!message || !path?.startsWith("/")) return null;
  const stack = text(input.stack, 2000);
  return {
    type: "error",
    source: input.source as ErrorSource,
    message,
    // Query strings and fragments can carry personal data; keep the path only.
    path: path.split(/[?#]/)[0],
    ...(stack ? { stack } : {}),
  };
}

/** Sends a browser error to /api/telemetry, which writes it to the deployment's runtime logs. */
export function reportClientError(error: unknown, source: ErrorSource) {
  if (process.env.NODE_ENV !== "production" || sent >= MAX_REPORTS) return;
  sent += 1;
  const report: ErrorReport = {
    type: "error",
    source,
    message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    path: location.pathname,
  };
  navigator.sendBeacon?.("/api/telemetry", JSON.stringify(report));
}
