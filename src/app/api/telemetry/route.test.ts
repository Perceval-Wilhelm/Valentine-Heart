// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const post = (body: string) => POST(new Request("http://localhost/api/telemetry", { method: "POST", body }));

describe("POST /api/telemetry", () => {
  it("logs a valid report as one JSON line", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post(JSON.stringify({ type: "error", source: "promise", message: "boom", path: "/" }));
    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      source: "promise",
      message: "boom",
      commit: "local",
    });
  });

  it("rejects malformed JSON and invalid reports without logging", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post("{not json")).status).toBe(400);
    expect((await post(JSON.stringify({ type: "error" }))).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });

  it("refuses oversized bodies", async () => {
    expect((await post("x".repeat(5000))).status).toBe(413);
  });
});
