export type TextEncoding = "auto" | "utf-8" | "gbk";

export interface BookReadOptions {
  encoding?: TextEncoding;
  collapseBlankLines?: boolean;
}

export interface Bookmark {
  id: string;
  charOffset: number;
  label: string;
  createdAt: number;
}

export interface ChapterEntry {
  title: string;
  charOffset: number;
}

export interface Book {
  id: string;
  title: string;
  filePath: string;
  addedAt: number;
  charOffset: number;
  totalChars: number;
  bookmarks: Bookmark[];
  chapters: ChapterEntry[];
  fileMissing?: boolean;
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
  transparentBackground: boolean;
  backgroundOpacity: number;
  transparentText: boolean;
  textOpacity: number;
  textEncoding: TextEncoding;
  collapseBlankLines: boolean;
  titleBarBackgroundColor: string;
  titleBarTransparent: boolean;
  titleBarOpacity: number;
  titleBarTextColor: string;
  titleBarTextTransparent: boolean;
  titleBarTextOpacity: number;
  titleBarButtonColor: string;
  titleBarButtonTransparent: boolean;
  titleBarButtonOpacity: number;
  nextPageKey: string;
  prevPageKey: string;
  carryOverLinesEnabled: boolean;
  carryOverLines: number;
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
  lineHeight: 1.2,
  padding: 8,
  alwaysOnTop: true,
  toggleVisibilityShortcut: "Ctrl+`",
  transparentBackground: false,
  backgroundOpacity: 88,
  transparentText: false,
  textOpacity: 100,
  textEncoding: "auto",
  collapseBlankLines: true,
  titleBarBackgroundColor: "#f5f5f5",
  titleBarTransparent: false,
  titleBarOpacity: 92,
  titleBarTextColor: "#2f2f2f",
  titleBarTextTransparent: false,
  titleBarTextOpacity: 100,
  titleBarButtonColor: "#2f2f2f",
  titleBarButtonTransparent: true,
  titleBarButtonOpacity: 0,
  nextPageKey: "J",
  prevPageKey: "K",
  carryOverLinesEnabled: false,
  carryOverLines: 2,
};

export const APP_STATE_VERSION = 6;