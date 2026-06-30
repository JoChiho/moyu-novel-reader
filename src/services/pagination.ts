import type { LayoutMetrics, PageSlice, ReaderSettings } from "../types";

export type PaginationSettings = Pick<
  ReaderSettings,
  "collapseBlankLines" | "carryOverLinesEnabled" | "carryOverLines"
>;

export interface PaginateOptions {
  carryOverLines?: string[];
}

export interface TextMeasure {
  measureWidth: (text: string) => number;
}

function isCjk(char: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(char);
}

function isBreakableBefore(char: string): boolean {
  return /[\s，。！？；：、）】》"』」》]/.test(char);
}

export function computeLayoutMetrics(
  containerWidth: number,
  containerHeight: number,
  lineHeightPx: number,
): LayoutMetrics {
  const maxLines = Math.max(1, Math.floor(containerHeight / lineHeightPx));
  return {
    width: containerWidth,
    height: containerHeight,
    lineHeightPx,
    maxLines,
  };
}

function breakLine(
  text: string,
  start: number,
  maxWidth: number,
  measure: TextMeasure,
): { line: string; next: number } {
  if (start >= text.length) {
    return { line: "", next: start };
  }

  if (text[start] === "\n") {
    return { line: "", next: start + 1 };
  }

  let end = start;
  let lastBreak = -1;

  while (end < text.length) {
    const ch = text[end];
    if (ch === "\n") break;

    const slice = text.slice(start, end + 1);
    const nextWidth = measure.measureWidth(slice);
    if (nextWidth > maxWidth) {
      if (end === start) {
        return { line: ch, next: start + 1 };
      }
      if (lastBreak > start) {
        return {
          line: text.slice(start, lastBreak),
          next: lastBreak,
        };
      }
      return { line: text.slice(start, end), next: end };
    }

    if (/\s/.test(ch) || isBreakableBefore(ch)) {
      lastBreak = end;
    } else if (
      end + 1 < text.length &&
      isCjk(ch) &&
      isCjk(text[end + 1]) &&
      !isCjk(text[start])
    ) {
      lastBreak = end + 1;
    }
    end += 1;
  }

  return { line: text.slice(start, end), next: end };
}

export function paginateFromOffset(
  text: string,
  offset: number,
  metrics: LayoutMetrics,
  measure: TextMeasure,
  collapseBlankLines = true,
  options: PaginateOptions = {},
): PageSlice {
  const carryOver = options.carryOverLines ?? [];
  const lines = [...carryOver.slice(-metrics.maxLines)];
  let cursor = Math.min(Math.max(0, offset), text.length);

  while (lines.length < metrics.maxLines && cursor < text.length) {
    if (text[cursor] === "\n") {
      if (collapseBlankLines) {
        cursor += 1;
        while (cursor < text.length && text[cursor] === "\n") {
          cursor += 1;
        }
      } else {
        lines.push("");
        cursor += 1;
      }
      continue;
    }

    const { line, next } = breakLine(text, cursor, metrics.width, measure);
    if (line.length === 0 && next === cursor) break;
    lines.push(line);
    cursor = next;
  }

  return {
    start: offset,
    end: cursor,
    lines,
  };
}

function resolveCarryOverLines(
  displayedLines: string[],
  settings: PaginationSettings,
): string[] {
  if (!settings.carryOverLinesEnabled || settings.carryOverLines <= 0) {
    return [];
  }
  return displayedLines.slice(-settings.carryOverLines);
}

/** Find the previous page start offset for symmetric prev/next navigation. */
export function findPrevPageOffset(
  text: string,
  currentOffset: number,
  metrics: LayoutMetrics,
  measure: TextMeasure,
  settings: PaginationSettings | boolean = true,
): number {
  const resolved: PaginationSettings =
    typeof settings === "boolean"
      ? {
          collapseBlankLines: settings,
          carryOverLinesEnabled: false,
          carryOverLines: 0,
        }
      : settings;

  if (currentOffset <= 0) return 0;

  let offset = 0;
  let previousPageStart = 0;
  let prevDisplayedLines: string[] = [];

  while (offset < currentOffset) {
    const slice = paginateFromOffset(
      text,
      offset,
      metrics,
      measure,
      resolved.collapseBlankLines,
      { carryOverLines: resolveCarryOverLines(prevDisplayedLines, resolved) },
    );
    if (slice.end <= offset) break;

    if (slice.end > currentOffset) {
      return previousPageStart;
    }

    previousPageStart = offset;
    prevDisplayedLines = slice.lines;
    offset = slice.end;

    if (offset >= currentOffset) {
      return previousPageStart;
    }
  }

  return previousPageStart;
}

/** Build the page slice shown at a given text offset (handles carry-over context). */
export function paginateAtOffset(
  text: string,
  targetOffset: number,
  metrics: LayoutMetrics,
  measure: TextMeasure,
  settings: PaginationSettings,
): PageSlice {
  const safeOffset = Math.min(Math.max(0, targetOffset), text.length);
  if (safeOffset <= 0) {
    return paginateFromOffset(
      text,
      0,
      metrics,
      measure,
      settings.collapseBlankLines,
    );
  }

  let offset = 0;
  let prevDisplayedLines: string[] = [];

  while (offset < safeOffset) {
    const slice = paginateFromOffset(
      text,
      offset,
      metrics,
      measure,
      settings.collapseBlankLines,
      { carryOverLines: resolveCarryOverLines(prevDisplayedLines, settings) },
    );
    if (slice.end <= offset) {
      return paginateFromOffset(
        text,
        safeOffset,
        metrics,
        measure,
        settings.collapseBlankLines,
        { carryOverLines: resolveCarryOverLines(prevDisplayedLines, settings) },
      );
    }

    const nextOffset = slice.end;
    if (nextOffset > safeOffset) {
      return paginateFromOffset(
        text,
        safeOffset,
        metrics,
        measure,
        settings.collapseBlankLines,
        { carryOverLines: resolveCarryOverLines(prevDisplayedLines, settings) },
      );
    }

    prevDisplayedLines = slice.lines;
    offset = nextOffset;
    if (offset === safeOffset) {
      return paginateFromOffset(
        text,
        safeOffset,
        metrics,
        measure,
        settings.collapseBlankLines,
        { carryOverLines: resolveCarryOverLines(prevDisplayedLines, settings) },
      );
    }
  }

  return paginateFromOffset(
    text,
    safeOffset,
    metrics,
    measure,
    settings.collapseBlankLines,
    { carryOverLines: resolveCarryOverLines(prevDisplayedLines, settings) },
  );
}

/** @deprecated canvas helper kept for tests that inject custom measure */
export function createCanvasMeasure(settings: ReaderSettings): TextMeasure {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
  return {
    measureWidth: (text: string) => ctx.measureText(text).width,
  };
}