import { describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({ pageview: vi.fn() }));
vi.mock("@vercel/analytics", () => analytics);

const { moment } = await import("./moments");

describe("moment", () => {
  it("records a milestone as a virtual page, once per visit", () => {
    moment("love-sent");
    moment("love-sent");
    moment("heart-formed");
    expect(analytics.pageview.mock.calls).toEqual([
      [{ route: "/moments/[moment]", path: "/moments/love-sent" }],
      [{ route: "/moments/[moment]", path: "/moments/heart-formed" }],
    ]);
  });
});
