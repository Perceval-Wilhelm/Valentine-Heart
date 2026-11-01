import type { Instrumentation } from "next";

// Server errors become one JSON line each, matching the browser reports from /api/telemetry.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const failure = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      source: "server",
      message: `${failure.name}: ${failure.message}`,
      digest: (failure as Error & { digest?: string }).digest,
      path: request.path.split(/[?#]/)[0],
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    }),
  );
};
