import { describe, expect, it } from "vitest";
import { formatCharCount } from "./moyuReadVolume";

describe("moyuReadVolume", () => {
  it("formats small counts in characters", () => {
    expect(formatCharCount(1234)).toBe("1,234 字");
  });

  it("formats large counts in wan", () => {
    expect(formatCharCount(25_000)).toBe("2.5 万字");
  });
});