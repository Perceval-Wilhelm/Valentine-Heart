import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { valentine } from "@/content/valentine";
import { ValentineCard } from "./ValentineCard";

const analytics = vi.hoisted(() => ({ pageview: vi.fn() }));
vi.mock("@vercel/analytics", () => analytics);

beforeEach(() => {
  // jsdom has no WebGL, which is exactly the fallback path.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("ValentineCard", () => {
  it("renders the whole message on the server, before any WebGL", () => {
    render(<ValentineCard content={valentine} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${valentine.greeting} ${valentine.to}`);
    expect(screen.getByText(valentine.from, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: valentine.actions.classic })).toHaveAttribute("href", "/2025.html");
  });

  it("falls back to a drawn heart when WebGL is unavailable, and says so in analytics", async () => {
    const { container } = render(<ValentineCard content={valentine} />);
    const stage = container.querySelector(".stage");
    expect(stage).toHaveAttribute("data-scene", "pending");
    await waitFor(() => expect(stage).toHaveAttribute("data-scene", "fallback"));
    expect(analytics.pageview).toHaveBeenCalledWith({ route: "/moments/[moment]", path: "/moments/no-webgl" });
  });

  it("offers labelled controls, and leaves sound off when the browser has no audio", async () => {
    render(<ValentineCard content={valentine} />);
    const sound = screen.getByRole("button", { name: valentine.actions.sound });
    expect(sound).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(sound);
    await waitFor(() => expect(sound).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("button", { name: valentine.actions.replay })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: valentine.actions.send }));
    expect(analytics.pageview).toHaveBeenCalledWith({ route: "/moments/[moment]", path: "/moments/love-sent" });
  });
});
