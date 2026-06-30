import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../types";
import {
  computeLayoutMetrics,
  createCanvasMeasure,
  paginateFromOffset,
} from "./pagination";

describe("pagination", () => {
  let measure: ReturnType<typeof createCanvasMeasure>;

  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: () => ({
        measureText: (text: string) => ({ width: text.length * 8 }),
        font: "",
      }),
    });
    measure = createCanvasMeasure(DEFAULT_SETTINGS);
  });

  it("computes max lines from line height", () => {
    const metrics = computeLayoutMetrics(300, 200, 28);
    expect(metrics.maxLines).toBe(7);
  });

  it("fills lines without trailing empty padding", () => {
    const text = "abcdefghijklmnopqrstuvwxyz";
    const metrics = computeLayoutMetrics(80, 100, 20);
    const page = paginateFromOffset(text, 0, metrics, measure);
    const trailingEmpty = page.lines.filter((l) => l === "").length;
    expect(trailingEmpty).toBe(0);
    expect(page.lines.length).toBeGreaterThan(0);
  });

  it("does not split a single CJK character across lines", () => {
    const text = "你好世界";
    const metrics = computeLayoutMetrics(40, 120, 24);
    const page = paginateFromOffset(text, 0, metrics, measure);
    expect(page.lines.join("")).toContain("你");
    expect(page.end).toBeGreaterThan(0);
  });
});