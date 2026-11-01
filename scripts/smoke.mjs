// Checks a running deployment from the outside: node scripts/smoke.mjs
//   SMOKE_URL           the site to check (default: the local test server)
//   SMOKE_EXPECT_BUILD  a commit SHA; wait until the site serves it before checking
//   SMOKE_WAIT_MS       how long to wait for that commit (default 15 minutes)

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs every check against `base` and returns the names of those that failed. */
export async function smoke(
  base,
  { expectBuild = "", waitMs = 0, request = fetch, sleep = pause, log = console.log } = {},
) {
  const url = (path) => new URL(path, base);
  const failures = [];
  const check = (name, ok, detail = "") => {
    log(`${ok ? "✓" : "✗"} ${name}${detail && !ok ? ` (${detail})` : ""}`);
    if (!ok) failures.push(name);
  };

  // Vercel moves the production domain only after the deployment checks pass, so a new commit can
  // take a few minutes to arrive.
  const build = expectBuild.slice(0, 7);
  const deadline = Date.now() + waitMs;
  let home = await request(url("/"), { headers: { "cache-control": "no-cache" } });
  while (build && home.headers.get("x-build") !== build && Date.now() < deadline) {
    log(`… waiting for ${build}; the site serves ${home.headers.get("x-build") ?? "an unknown build"}`);
    await sleep(15_000);
    home = await request(url("/"), { headers: { "cache-control": "no-cache" } });
  }

  const html = await home.text();
  check("home page responds", home.status === 200, `status ${home.status}`);
  if (build) check(`serves commit ${build}`, home.headers.get("x-build") === build, home.headers.get("x-build") ?? "");
  check("message is rendered on the server", /<h1 class="title"/.test(html));
  check(
    "content security policy is sent",
    (home.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"),
  );
  check("search engines are asked to stay away", (home.headers.get("x-robots-tag") ?? "").includes("noindex"));

  const image = await request(url("/opengraph-image"));
  check(
    "share image is a PNG",
    image.ok && image.headers.get("content-type") === "image/png",
    `status ${image.status}`,
  );

  const robots = await request(url("/robots.txt"));
  check("robots.txt disallows everything", robots.ok && /^Disallow: \/$/m.test(await robots.text()));

  const classic = await request(url("/2025.html"));
  check("the 2025 heart is still there", classic.ok && (await classic.text()).includes("pinkboard"));

  // An invalid report proves the function is up and validating, without writing to the logs.
  const telemetry = await request(url("/api/telemetry"), { method: "POST", body: "{}" });
  check("error reports are validated", telemetry.status === 400, `status ${telemetry.status}`);

  const missing = await request(url("/a-page-that-does-not-exist"));
  check("unknown pages return 404", missing.status === 404, `status ${missing.status}`);

  return failures;
}

if (import.meta.main) {
  const failures = await smoke(process.env.SMOKE_URL ?? "http://127.0.0.1:4340", {
    expectBuild: process.env.SMOKE_EXPECT_BUILD ?? "",
    waitMs: Number(process.env.SMOKE_WAIT_MS ?? 15 * 60_000),
  });
  if (failures.length > 0) {
    console.error(`${failures.length} smoke check(s) failed.`);
    process.exitCode = 1;
  }
}
