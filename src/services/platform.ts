import type {
  AppState,
  Book,
  BookChapterSlice,
  BookReadOptions,
  DesktopLuminancePayload,
  MoyuStatsSnapshot,
} from "../types";
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
  slice: BookChapterSlice;
} | null> {
  const encoding = options.encoding ?? "auto";
  const collapseBlankLines = options.collapseBlankLines !== false;
  const result = await bridge().pickAndReadBook(encoding, collapseBlankLines);
  if (!result.ok) {
    if (result.canceled) return null;
    throw new Error(result.error ?? "导入失败");
  }
  if (!result.book || !result.slice) {
    throw new Error("导入结果无效");
  }
  return { book: toPlain(result.book), slice: toPlain(result.slice) };
}

export async function platformReadBookSlice(
  bookId: string,
  filePath: string,
  globalOffset: number,
  options: BookReadOptions = {},
): Promise<BookChapterSlice> {
  const encoding = options.encoding ?? "auto";
  const collapseBlankLines = options.collapseBlankLines !== false;
  const result = await bridge().readBookSlice(
    bookId,
    filePath,
    globalOffset,
    encoding,
    collapseBlankLines,
  );
  if (!result.ok || !result.slice) {
    throw new Error(result.error ?? "读取章节失败");
  }
  return toPlain(result.slice);
}

export async function platformDeleteBookCache(bookId: string): Promise<void> {
  const result = await bridge().deleteBookCache(bookId);
  if (!result.ok) {
    throw new Error(result.error ?? "删除书籍缓存失败");
  }
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

export async function platformMoveMainWindow(
  dx: number,
  dy: number,
): Promise<void> {
  await bridge().moveMainWindow(dx, dy);
}

export async function platformSetFrameRestoreSuspended(
  value: boolean,
): Promise<void> {
  await bridge().setFrameRestoreSuspended(value);
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

export async function platformOpenMoyuWindow(): Promise<void> {
  await bridge().openMoyuWindow();
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

export function platformOnMainWindowWheel(
  callback: (payload: { deltaY: number }) => void,
): () => void {
  return bridge().onMainWindowWheel(callback);
}

export async function platformGetMoyuStats(): Promise<MoyuStatsSnapshot> {
  return bridge().getMoyuStats();
}

export async function platformResetMoyuStats(): Promise<void> {
  await bridge().resetMoyuStats();
}

export async function platformSetMoyuTracking(enabled: boolean): Promise<void> {
  await bridge().setMoyuTracking(enabled);
}

export function platformOnMoyuStatsTick(
  callback: (payload: MoyuStatsSnapshot) => void,
): () => void {
  return bridge().onMoyuStatsTick(callback);
}

export function platformOnDesktopLuminanceUpdated(
  callback: (payload: DesktopLuminancePayload) => void,
): () => void {
  return bridge().onDesktopLuminanceUpdated(callback);
}