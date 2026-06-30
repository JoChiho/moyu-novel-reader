import type { LayoutMetrics, PageSlice, ReaderSettings } from "../types";

const MAX_ENTRIES = 256;
const cache = new Map<string, PageSlice>();

export function settingsLayoutHash(settings: ReaderSettings): string {
  return [
    settings.fontSize,
    settings.fontFamily,
    settings.lineHeight,
    settings.padding,
    settings.collapseBlankLines,
    settings.carryOverLinesEnabled,
    settings.carryOverLines,
  ].join("|");
}

export function buildPageCacheKey(
  offset: number,
  metrics: LayoutMetrics,
  contentLength: number,
  settingsHash: string,
): string {
  return [
    offset,
    metrics.width,
    metrics.height,
    metrics.maxLines,
    metrics.lineHeightPx,
    contentLength,
    settingsHash,
  ].join(":");
}

export function getCachedPage(key: string): PageSlice | undefined {
  return cache.get(key);
}

export function setCachedPage(key: string, slice: PageSlice): void {
  if (cache.size >= MAX_ENTRIES) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, slice);
}

export function clearPageCache(): void {
  cache.clear();
}