import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Stardust drifts for 0.6 s and gathers for 2.8 s; the name writes itself 5 s after the heart forms.
// Playwright's fake clock skips through all of it.
const FORMED = 4_000;
const AUTO_NAME = 6_500;

function watchProblems(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`Page error: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(`Request failed: ${request.url()}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`Console error: ${message.text()}`);
  });
  return problems;
}

async function axeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map((violation) => `${violation.id}: ${violation.help}`);
}

/** Freezes the page clock, so frames only advance through clock.runFor() and screenshots are exact. */
async function freeze(page: Page) {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
}

/** Share of pixels in a region that the particles light up, read from a real screenshot. */
async function light(page: Page, selector = ".heart-room") {
  // The canvas fades in on the compositor's clock, which the fake clock does not control.
  await expect(page.locator(".sky")).toHaveCSS("opacity", "1");
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  const png = await page.screenshot({ clip: box, scale: "css" });
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 150 && pixels[i + 2] > 80) lit += 1;
    return lit / (pixels.length / 4);
  }, png.toString("base64"));
}

async function open(page: Page) {
  const problems = watchProblems(page);
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".stage")).toHaveAttribute("data-scene", "webgl");
  return problems;
}

test("gathers stardust into a heart, then writes the name in light", async ({ page }) => {
  const problems = await open(page);
  const stage = page.locator(".stage");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Happy Valentine, Kim Tú");
  await freeze(page);
  await page.clock.runFor(300);
  await expect(stage).toHaveAttribute("data-phase", "intro");
  await expect(page.getByRole("button", { name: "Send love" })).toBeHidden();
  const dust = await light(page);

  await page.clock.runFor(FORMED);
  await expect(stage).toHaveAttribute("data-phase", "heart");
  await expect(page.getByRole("button", { name: "Send love" })).toBeVisible();
  const heart = await light(page);
  expect(heart).toBeGreaterThan(0.02);
  expect(heart).toBeGreaterThan(dust * 3);

  await page.clock.runFor(AUTO_NAME);
  await expect(stage).toHaveAttribute("data-phase", "name");
  await page.clock.runFor(4_000);
  await expect(stage).toHaveAttribute("data-phase", "heart");

  await page.clock.resume();
  expect(await axeViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("bursts when love is sent and writes the name while the heart is held", async ({ page }) => {
  const problems = await open(page);
  const stage = page.locator(".stage");
  await freeze(page);
  await page.clock.runFor(FORMED);
  const resting = await light(page, ".stage");

  await page.getByRole("button", { name: "Send love" }).click();
  await page.clock.runFor(300);
  expect(await light(page, ".stage")).toBeGreaterThan(resting * 1.3);
  await page.clock.runFor(2_500);
  expect(await light(page, ".stage")).toBeLessThan(resting * 1.3);

  const room = await page.locator(".heart-room").boundingBox();
  await page.mouse.move(room!.x + room!.width / 2, room!.y + room!.height / 2);
  await page.mouse.down();
  await page.clock.runFor(600);
  await expect(stage).toHaveAttribute("data-phase", "name");
  await page.mouse.up();
  await page.clock.runFor(50);
  await expect(stage).toHaveAttribute("data-phase", "heart");
  expect(problems).toEqual([]);
});

test("turns the heartbeat sound on and off", async ({ page }) => {
  const problems = await open(page);
  const sound = page.getByRole("button", { name: "Heartbeat sound" });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(problems).toEqual([]);
});

test("keeps the heart but drops the movement for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const problems = await open(page);
  const stage = page.locator(".stage");
  await expect(stage).toHaveAttribute("data-phase", "heart");
  await page.clock.runFor(FORMED + AUTO_NAME);
  await expect(stage).toHaveAttribute("data-phase", "heart");
  await page.getByRole("button", { name: "Send love" }).click();
  expect(await light(page)).toBeGreaterThan(0.02);
  expect(await axeViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("draws a beating heart instead when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      if (args[0] === "webgl2") return null;
      return (original as (...rest: unknown[]) => RenderingContext | null).apply(this, args);
    } as typeof original;
  });
  const problems = watchProblems(page);
  await page.goto("/");
  await expect(page.locator(".stage")).toHaveAttribute("data-scene", "fallback");
  await expect(page.locator(".fallback-heart")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "Send love" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("fits every screen without sideways scrolling", async ({ page }) => {
  await open(page);
  await page.clock.runFor(FORMED);
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    width: innerWidth,
    height: innerHeight,
    actionsBottom: document.querySelector(".actions")!.getBoundingClientRect().bottom,
    roomBottom: document.querySelector(".heart-room")!.getBoundingClientRect().bottom,
    titleTop: document.querySelector(".title")!.getBoundingClientRect().top,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  expect(layout.actionsBottom).toBeLessThanOrEqual(layout.height);
  expect(layout.roomBottom).toBeLessThanOrEqual(layout.titleTop + 1);
  for (const control of await page.locator(".control, .send").all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe("release", () => {
  // Server responses do not depend on the screen, so these run once, at desktop size.
  test.skip(({ isMobile, viewport }) => isMobile || (viewport?.width ?? 0) < 1024, "Runs at desktop size only.");

  test("shows the message without JavaScript", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Happy Valentine, Kim Tú");
    await expect(page.locator(".fallback-heart")).toHaveCSS("opacity", "1");
    await expect(page.locator(".actions")).toBeHidden();
    await context.close();
  });

  test("passes the production smoke checks", ({ baseURL }) => {
    const output = execFileSync(process.execPath, ["scripts/smoke.mjs"], {
      env: { ...process.env, SMOKE_URL: baseURL, SMOKE_WAIT_MS: "0" },
      encoding: "utf8",
    });
    expect(output).not.toContain("✗");
  });

  test("logs a valid error report", async ({ request }) => {
    const response = await request.post("/api/telemetry", {
      data: { type: "error", source: "window", message: "Error: test", path: "/" },
    });
    expect(response.status()).toBe(204);
  });

  test("keeps the first load light", async ({ page }) => {
    // Measured on 1 November 2026: 149 KB of compressed script (the WebGL scene is about 10 KB of it)
    // and 175 KB of fonts. The budgets leave room for small changes and catch a new library.
    const sizes: Promise<[string, number]>[] = [];
    page.on("response", (response) => {
      const type = response.request().resourceType();
      sizes.push(
        response
          .request()
          .sizes()
          .then((size) => [type, size.responseBodySize]),
      );
    });
    await page.goto("/", { waitUntil: "networkidle" });
    const loaded = await Promise.all(sizes);
    const kilobytes = (type: string) =>
      loaded.filter(([kind]) => kind === type).reduce((sum, [, size]) => sum + size, 0) / 1024;
    expect(kilobytes("script")).toBeLessThan(180);
    expect(kilobytes("font")).toBeLessThan(200);
  });

  test("leads lost visitors back to the heart", async ({ page }) => {
    const response = await page.goto("/a-page-that-does-not-exist");
    expect(response?.status()).toBe(404);
    await page.getByRole("link", { name: "Back to the heart" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Happy Valentine, Kim Tú");
  });
});
