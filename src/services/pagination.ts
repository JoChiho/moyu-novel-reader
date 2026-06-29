import type { LayoutMetrics, PageSlice, ReaderSettings } from "../types";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d")!;

function applyFont(settings: ReaderSettings) {
  measureCtx.font = `${settings.fontSize}px ${settings.fontFamily}`;
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
  settings: ReaderSettings,
): LayoutMetrics {
  const lineHeightPx = settings.fontSize * settings.lineHeight;
  const maxLines = Math.max(
    1,
    Math.floor(containerHeight / lineHeightPx),
  );
  return {
    width: containerWidth,
    height: containerHeight,
    lineHeightPx,
    maxLines,
  };
}

function measureTextWidth(text: string): number {
  return measureCtx.measureText(text).width;
}

function breakLine(
  text: string,
  start: number,
  maxWidth: number,
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

    const nextWidth = measureTextWidth(text.slice(start, end + 1));
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
  settings: ReaderSettings,
): PageSlice {
  applyFont(settings);
  const lines: string[] = [];
  let cursor = Math.min(Math.max(0, offset), text.length);

  while (lines.length < metrics.maxLines && cursor < text.length) {
    if (text[cursor] === "\n") {
      lines.push("");
      cursor += 1;
      continue;
    }

    const { line, next } = breakLine(text, cursor, metrics.width);
    if (line.length === 0 && next === cursor) break;
    lines.push(line);
    cursor = next;
  }

  while (lines.length < metrics.maxLines) {
    lines.push("");
  }

  return {
    start: offset,
    end: cursor,
    lines: lines.slice(0, metrics.maxLines),
  };
}

export function getPageCountEstimate(
  text: string,
  metrics: LayoutMetrics,
  settings: ReaderSettings,
): number {
  if (!text.length) return 1;
  let offset = 0;
  let pages = 0;
  while (offset < text.length) {
    const page = paginateFromOffset(text, offset, metrics, settings);
    if (page.end <= offset) break;
    offset = page.end;
    pages += 1;
    if (pages > 100_000) break;
  }
  return Math.max(1, pages);
}