import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareMonitoringEvent } from "@/lib/monitoring";
import { SiteMonitoring } from "./site-monitoring";

const sdk = vi.hoisted(() => ({ analytics: vi.fn(() => null), speed: vi.fn(() => null) }));
vi.mock("@vercel/analytics/next", () => ({ Analytics: sdk.analytics }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: sdk.speed }));

beforeEach(() => vi.clearAllMocks());

describe("site monitoring", () => {
  it("does not mount monitoring SDKs when disabled for local and preview builds", () => {
    render(<SiteMonitoring enabled={false} />);
    expect(sdk.analytics).not.toHaveBeenCalled();
    expect(sdk.speed).not.toHaveBeenCalled();
  });

  it("connects the privacy filter to both SDKs without debug output", () => {
    render(<SiteMonitoring enabled />);
    for (const mock of [sdk.analytics, sdk.speed]) {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ beforeSend: prepareMonitoringEvent, debug: false }),
        undefined,
      );
    }
  });

  it.each(["pageview", "vital"])("redacts URL data for %s without mutating the source", (type) => {
    const event = {
      type,
      url: "https://name:password@happy-valentine-from-perceval.vercel.app/moments/love-sent?from=zalo#private-note",
      route: "/moments/[moment]",
    };
    expect(prepareMonitoringEvent(event)).toEqual({
      ...event,
      url: "https://happy-valentine-from-perceval.vercel.app/moments/love-sent",
    });
    expect(event.url).toContain("from=zalo");
  });

  it("drops custom events even if another caller adds one later", () => {
    expect(
      prepareMonitoringEvent({ type: "event", url: "https://happy-valentine-from-perceval.vercel.app/" }),
    ).toBeNull();
  });

  it.each(["not a URL", "javascript:alert(1)"])("drops invalid monitoring URLs: %s", (url) => {
    expect(prepareMonitoringEvent({ type: "pageview", url })).toBeNull();
  });
});
