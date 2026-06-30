import type { AppState, Book } from "./index";

export interface ImportTxtResult {
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

export interface MoyuBridge {
  loadAppState: () => Promise<AppState | null>;
  saveAppState: (state: AppState) => Promise<{ ok: boolean; error?: string }>;
  pickAndReadTxt: () => Promise<ImportTxtResult>;
  readTextFile: (filePath: string) => Promise<ReadFileResult>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  toggleVisibility: () => Promise<void>;
  bindToggleShortcut: (shortcut: string) => Promise<ShortcutBindResult>;
  setTransparent: (enabled: boolean) => Promise<void>;
}

declare global {
  interface Window {
    moyu: MoyuBridge;
  }
}

export {};