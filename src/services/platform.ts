import type { AppState, Book } from "../types";
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

export async function platformPickAndReadTxt(): Promise<{
  book: Book;
  content: string;
} | null> {
  const result = await bridge().pickAndReadTxt();
  if (!result.ok) {
    if (result.canceled) return null;
    throw new Error(result.error ?? "导入失败");
  }
  if (!result.book || result.content === undefined) {
    throw new Error("导入结果无效");
  }
  return { book: toPlain(result.book), content: result.content };
}

export async function platformReadTextFile(filePath: string): Promise<string> {
  const result = await bridge().readTextFile(filePath);
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