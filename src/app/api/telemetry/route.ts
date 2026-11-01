import { parseErrorReport } from "@/lib/telemetry";

const MAX_BODY = 4096;

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY) return new Response(null, { status: 413 });

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = parseErrorReport(value);
  if (!report) return new Response(null, { status: 400 });

  // One JSON line per report, so Vercel Logs and Observability can filter on its fields.
  console.error(
    JSON.stringify({
      level: "error",
      ...report,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      userAgent: request.headers.get("user-agent")?.slice(0, 160),
    }),
  );
  return new Response(null, { status: 204 });
}
