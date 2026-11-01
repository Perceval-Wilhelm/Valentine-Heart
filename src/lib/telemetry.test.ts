import { describe, expect, it } from "vitest";
import { parseErrorReport } from "./telemetry";

const valid = { type: "error", source: "window", message: "TypeError: x is undefined", path: "/" };

describe("parseErrorReport", () => {
  it("accepts a well-formed report", () => {
    expect(parseErrorReport({ ...valid, stack: "at line 1" })).toEqual({ ...valid, stack: "at line 1" });
  });

  it("drops the query string and fragment from the path", () => {
    expect(parseErrorReport({ ...valid, path: "/?name=private#note" })?.path).toBe("/");
  });

  it("truncates long fields instead of logging them whole", () => {
    const report = parseErrorReport({ ...valid, message: "x".repeat(5000), stack: "y".repeat(9000) });
    expect(report?.message).toHaveLength(300);
    expect(report?.stack).toHaveLength(2000);
  });

  it.each([
    null,
    "boom",
    { ...valid, type: "event" },
    { ...valid, source: "server" },
    { ...valid, message: "" },
    { ...valid, path: "https://example.com/" },
    { ...valid, message: 42 },
  ])("rejects %j", (value) => {
    expect(parseErrorReport(value)).toBeNull();
  });
});
