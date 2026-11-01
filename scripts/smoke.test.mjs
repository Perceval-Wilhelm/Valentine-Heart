import assert from "node:assert/strict";
import { test } from "node:test";
import { smoke } from "./smoke.mjs";

/** A stand-in for the deployed site; `overrides` breaks individual responses. */
function site(overrides = {}, builds = ["abc1234"]) {
  let visits = 0;
  const pages = {
    "GET /": () =>
      new Response('<main><h1 class="title">Happy Valentine</h1></main>', {
        headers: {
          "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
          "x-robots-tag": "noindex, nofollow",
          "x-build": builds[Math.min(visits++, builds.length - 1)],
        },
      }),
    "GET /opengraph-image": () => new Response("png", { headers: { "content-type": "image/png" } }),
    "GET /robots.txt": () => new Response("User-Agent: *\nDisallow: /\n"),
    "GET /2025.html": () => new Response('<canvas id="pinkboard"></canvas>'),
    "POST /api/telemetry": () => new Response(null, { status: 400 }),
    ...overrides,
  };
  return async (url, init = {}) => {
    const page = pages[`${init.method ?? "GET"} ${new URL(url).pathname}`];
    return page ? page() : new Response("missing", { status: 404 });
  };
}

const quiet = { log: () => {}, sleep: async () => {} };

test("a healthy site passes every check", async () => {
  assert.deepEqual(await smoke("https://example.test", { ...quiet, request: site() }), []);
});

test("a missing header or page is reported by name", async () => {
  const failures = await smoke("https://example.test", {
    ...quiet,
    request: site({
      "GET /2025.html": () => new Response("gone", { status: 404 }),
      "POST /api/telemetry": () => new Response(null, { status: 500 }),
    }),
  });
  assert.deepEqual(failures, ["the 2025 heart is still there", "error reports are validated"]);
});

test("waits for the expected commit, then checks it", async () => {
  const failures = await smoke("https://example.test", {
    ...quiet,
    request: site({}, ["old0000", "old0000", "abc1234"]),
    expectBuild: "abc1234def",
    waitMs: 60_000,
  });
  assert.deepEqual(failures, []);
});

test("fails when the commit never arrives", async () => {
  const failures = await smoke("https://example.test", {
    ...quiet,
    request: site({}, ["old0000"]),
    expectBuild: "abc1234",
    waitMs: 0,
  });
  assert.deepEqual(failures, ["serves commit abc1234"]);
});
