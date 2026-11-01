import { describe, expect, it } from "vitest";
import { skyTopColor } from "./skyChrome";

describe("skyTopColor", () => {
  it("uses the clear sky for each phase", () => {
    expect(skyTopColor("day", undefined)).toBe("#9ddcff");
    expect(skyTopColor("night", "clear")).toBe("#4b4e9c");
  });

  it("follows the weather tint", () => {
    expect(skyTopColor("day", "rain")).toBe("#94a9c0");
    expect(skyTopColor("night", "snow")).toBe("#3d446d");
  });

  it("treats partly cloudy as clear", () => {
    expect(skyTopColor("evening", "partly")).toBe("#ffb59e");
  });

  it("falls back to the day sky for an unknown phase", () => {
    expect(skyTopColor(undefined, "cloudy")).toBe("#b2c4d6");
  });
});
