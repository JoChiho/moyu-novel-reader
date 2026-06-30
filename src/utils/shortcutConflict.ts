import type { ReaderSettings } from "../types";

function normKey(key: string): string {
  const k = key.trim();
  if (k === "Space" || k === " ") return " ";
  if (k.length === 1) return k.toLowerCase();
  return k;
}

/** Detect conflicts among reader-local page-turn keys. */
export function getPageKeyConflicts(settings: ReaderSettings): string[] {
  const issues: string[] = [];
  const next = normKey(settings.nextPageKey);
  const prev = normKey(settings.prevPageKey);

  if (next && prev && next === prev) {
    issues.push("下一页键与上一页键不能相同");
  }

  const blocked = new Set([" ", "arrowright", "arrowdown", "arrowleft", "arrowup"]);
  if (blocked.has(next)) {
    issues.push("下一页键请勿与内置方向键/空格重复");
  }
  if (blocked.has(prev)) {
    issues.push("上一页键请勿与内置方向键/空格重复");
  }

  return issues;
}