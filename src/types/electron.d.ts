import type { AppState, Book, TextEncoding } from "./index";

export interface ImportBookResult {
  ok: boolean;
  book?: Book;
  content?: string;
  error?: string;
  canceled?: boolean;
}

export interface ReadFileResult {
  ok: boolean;
  content?: string;
  error?: string;
}

export interface ShortcutBindResult {
  success: boolean;
  electronShortcut?: string;
  error?: string;
}

export interface ShortcutProbeResult {
  available: boolean;
  electronShortcut?: string;
  error?: string;
}

export interface MoyuBridge {
  loadAppState: () => Promise<AppState | null>;
  saveAppState: (state: AppState) => Promise<{ ok: boolean; error?: string }>;
  pickAndReadBook: (
    encoding?: TextEncoding,
    collapseBlankLines?: boolean,
  ) => Promise<ImportBookResult>;
  readBookFile: (
    filePath: string,
    encoding?: TextEncoding,
    collapseBlankLines?: boolean,
  ) => Promise<ReadFileResult>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  toggleVisibility: () => Promise<void>;
  bindToggleShortcut: (shortcut: string) => Promise<ShortcutBindResult>;
  setTransparent: (enabled: boolean) => Promise<void>;
  focusMainWindow: () => Promise<void>;
  openSettingsWindow: () => Promise<{ ok: boolean }>;
  openShelfWindow: () => Promise<{ ok: boolean }>;
  openNavigatorWindow: () => Promise<{ ok: boolean }>;
  shelfOpenBook: (bookId: string) => Promise<{ ok: boolean }>;
  navigatorJump: (offset: number) => Promise<{ ok: boolean }>;
  probeGlobalShortcut: (shortcut: string) => Promise<ShortcutProbeResult>;
  onAppStateUpdated: (callback: () => void) => () => void;
  onDisplayMetricsChanged: (callback: () => void) => () => void;
  onMainWindowBlur: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    moyu: MoyuBridge;
  }
}

export {};