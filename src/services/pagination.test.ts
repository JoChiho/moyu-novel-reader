import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../types";
import {
  computeLayoutMetrics,
  createCanvasMeasure,
  findPrevPageOffset,
  paginateAtOffset,
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

  it("skips blank lines from newlines without consuming line slots", () => {
    const text = "第一行\n\n\n第二行";
    const metrics = computeLayoutMetrics(200, 120, 20);
    const page = paginateFromOffset(text, 0, metrics, measure, true);
    expect(page.lines.every((line) => line.length > 0)).toBe(true);
    expect(page.lines.join("")).toContain("第二行");
  });

  it("renders blank lines when collapse is disabled", () => {
    const text = "第一行\n\n第二行";
    const metrics = computeLayoutMetrics(200, 120, 20);
    const page = paginateFromOffset(text, 0, metrics, measure, false);
    expect(page.lines).toContain("");
  });

  it("prev page offset mirrors next page steps", () => {
    const text = "abcdefghijklmnopqrstuvwxyz".repeat(20);
    const metrics = computeLayoutMetrics(80, 60, 20);

    const pageStarts = [0];
    let offset = 0;
    while (offset < text.length) {
      const page = paginateFromOffset(text, offset, metrics, measure);
      if (page.end <= offset) break;
      offset = page.end;
      pageStarts.push(offset);
    }

    for (let i = 1; i < pageStarts.length; i++) {
      const current = pageStarts[i];
      const prev = findPrevPageOffset(text, current, metrics, measure);
      expect(prev).toBe(pageStarts[i - 1]);
    }
  });

  it("carries over the last n lines from the previous page", () => {
    const text = "abcdefghijklmnopqrstuvwxyz".repeat(12);
    const metrics = computeLayoutMetrics(80, 60, 20);
    const settings = {
      ...DEFAULT_SETTINGS,
      carryOverLinesEnabled: true,
      carryOverLines: 2,
    };

    const first = paginateAtOffset(text, 0, metrics, measure, settings);
    const second = paginateAtOffset(text, first.end, metrics, measure, settings);

    expect(second.lines.slice(0, 2)).toEqual(
      first.lines.slice(-2),
    );
    expect(second.end).toBeGreaterThan(first.end);
  });

  it("keeps prev/next symmetric when carry-over is enabled", () => {
    const text = "abcdefghijklmnopqrstuvwxyz".repeat(20);
    const metrics = computeLayoutMetrics(80, 60, 20);
    const settings = {
      ...DEFAULT_SETTINGS,
      carryOverLinesEnabled: true,
      carryOverLines: 1,
    };

    const pageStarts = [0];
    let offset = 0;
    while (offset < text.length) {
      const page = paginateAtOffset(text, offset, metrics, measure, settings);
      if (page.end <= offset) break;
      offset = page.end;
      pageStarts.push(offset);
    }

    for (let i = 1; i < pageStarts.length; i++) {
      const current = pageStarts[i];
      const prev = findPrevPageOffset(text, current, metrics, measure, settings);
      expect(prev).toBe(pageStarts[i - 1]);
    }
  });

  it("does not split a single CJK character across lines", () => {
    const text = "你好世界";
    const metrics = computeLayoutMetrics(40, 120, 24);
    const page = paginateFromOffset(text, 0, metrics, measure);
    expect(page.lines.join("")).toContain("你");
    expect(page.end).toBeGreaterThan(0);
  });
});