import { describe, expect, it } from "vitest";
import { readerBackground, toRgba } from "./color";

describe("color", () => {
  it("converts hex to rgba", () => {
    expect(toRgba("#c7edcc", 0.5)).toBe("rgba(199, 237, 204, 0.5)");
  });

  it("uses rgba when transparent window enabled", () => {
    expect(readerBackground("#c7edcc", true, 80)).toBe(
      "rgba(199, 237, 204, 0.8)",
    );
  });

  it("keeps hex when not transparent", () => {
    expect(readerBackground("#c7edcc", false, 80)).toBe("#c7edcc");
  });
});