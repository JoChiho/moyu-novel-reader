import type { AppState, Book, BookReadOptions } from "../types";
import type { ShortcutBindResult } from "../types/electron";
import { toPlain } from "../utils/serialize";

function bridge() {
  if (!window.moyu) {
    throw new Error(
      "Electron bridge not available. Run with `npm run electron:dev`.",
    );
  }
  return window.moyu;
}

export async function platformLoadAppState(): Promise<AppState | null> {
  return bridge().loadAppState();
}

export async function platformSaveAppState(state: AppState): Promise<void> {
  const result = await bridge().saveAppState(toPlain(state));
  if (!result.ok) {
    throw new Error(result.error ?? "保存失败");
  }
}

export async function platformPickAndReadBook(
  options: BookReadOptions = {},
): Promise<{
  book: Book;
  content: string;
} | null> {
  const encoding = options.encoding ?? "auto";
  const collapseBlankLines = options.collapseBlankLines !== false;
  const result = await bridge().pickAndReadBook(encoding, collapseBlankLines);
  if (!result.ok) {
    if (result.canceled) return null;
    throw new Error(result.error ?? "导入失败");
  }
  if (!result.book || result.content === undefined) {
    throw new Error("导入结果无效");
  }
  return { book: toPlain(result.book), content: result.content };
}

export async function platformReadBookFile(
  filePath: string,
  options: BookReadOptions = {},
): Promise<string> {
  const encoding = options.encoding ?? "auto";
  const collapseBlankLines = options.collapseBlankLines !== false;
  const result = await bridge().readBookFile(
    filePath,
    encoding,
    collapseBlankLines,
  );
  if (!result.ok || result.content === undefined) {
    throw new Error(result.error ?? "读取文件失败");
  }
  return result.content;
}

export async function platformSetAlwaysOnTop(value: boolean): Promise<void> {
  await bridge().setAlwaysOnTop(value);
}

export async function platformToggleVisibility(): Promise<void> {
  await bridge().toggleVisibility();
}

export async function platformBindToggleShortcut(
  shortcut: string,
): Promise<ShortcutBindResult> {
  return bridge().bindToggleShortcut(shortcut);
}

export async function platformSetTransparent(enabled: boolean): Promise<void> {
  await bridge().setTransparent(enabled);
}

export async function platformFocusMainWindow(): Promise<void> {
  await bridge().focusMainWindow();
}

export async function platformOpenSettingsWindow(): Promise<void> {
  await bridge().openSettingsWindow();
}

export async function platformOpenShelfWindow(): Promise<void> {
  await bridge().openShelfWindow();
}

export async function platformShelfOpenBook(bookId: string): Promise<void> {
  await bridge().shelfOpenBook(bookId);
}

export function platformOnAppStateUpdated(
  callback: () => void,
): () => void {
  return bridge().onAppStateUpdated(callback);
}

export async function platformOpenNavigatorWindow(): Promise<void> {
  await bridge().openNavigatorWindow();
}

export async function platformNavigatorJump(offset: number): Promise<void> {
  await bridge().navigatorJump(offset);
}

export async function platformProbeGlobalShortcut(
  shortcut: string,
): Promise<{ available: boolean; error?: string }> {
  const result = await bridge().probeGlobalShortcut(shortcut);
  return { available: result.available, error: result.error };
}

export function platformOnDisplayMetricsChanged(
  callback: () => void,
): () => void {
  return bridge().onDisplayMetricsChanged(callback);
}

export function platformOnMainWindowBlur(callback: () => void): () => void {
  return bridge().onMainWindowBlur(callback);
}