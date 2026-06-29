export interface Book {
  id: string;
  title: string;
  filePath: string;
  addedAt: number;
  charOffset: number;
  totalChars: number;
}

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  padding: number;
  alwaysOnTop: boolean;
  toggleVisibilityShortcut: string;
}

export interface AppState {
  version: number;
  books: Book[];
  settings: ReaderSettings;
  lastBookId: string | null;
}

export interface PageSlice {
  start: number;
  end: number;
  lines: string[];
}

export interface LayoutMetrics {
  width: number;
  height: number;
  lineHeightPx: number;
  maxLines: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  fontFamily:
    '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif',
  textColor: "#3d3d3d",
  backgroundColor: "#c7edcc",
  lineHeight: 1.75,
  padding: 16,
  alwaysOnTop: true,
  toggleVisibilityShortcut: "Ctrl+`",
};

export const APP_STATE_VERSION = 1;