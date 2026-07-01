import { describe, expect, it } from "vitest";
import {
  readerBackground,
  readerTextColor,
  resolveEffectiveTextColor,
  toRgba,
} from "./color";

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

  it("allows fully transparent background", () => {
    expect(readerBackground("#c7edcc", true, 0)).toBe(
      "rgba(199, 237, 204, 0)",
    );
  });

  it("uses rgba when transparent text enabled", () => {
    expect(readerTextColor("#3d3d3d", true, 50)).toBe("rgba(61, 61, 61, 0.5)");
  });

  it("allows fully transparent text", () => {
    expect(readerTextColor("#3d3d3d", true, 0)).toBe("rgba(61, 61, 61, 0)");
  });

  it("uses auto text color only when enabled", () => {
    expect(resolveEffectiveTextColor("#3d3d3d", "#ffffff", true)).toBe(
      "#ffffff",
    );
    expect(resolveEffectiveTextColor("#3d3d3d", "#ffffff", false)).toBe(
      "#3d3d3d",
    );
  });
});