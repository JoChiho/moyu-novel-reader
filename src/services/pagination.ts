import type { LayoutMetrics, PageSlice, ReaderSettings } from "../types";

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
): PageSlice {
  const lines: string[] = [];
  let cursor = Math.min(Math.max(0, offset), text.length);

  while (lines.length < metrics.maxLines && cursor < text.length) {
    if (text[cursor] === "\n") {
      lines.push("");
      cursor += 1;
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