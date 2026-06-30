import {
  APP_STATE_VERSION,
  DEFAULT_MOYU_STATS,
  DEFAULT_SETTINGS,
  type AppState,
  type Book,
  type Bookmark,
  type ChapterEntry,
  type ReaderSettings,
} from "../types";
import { toPlain } from "../utils/serialize";
import {
  platformLoadAppState,
  platformSaveAppState,
} from "./platform";

function defaultState(): AppState {
  return {
    version: APP_STATE_VERSION,
    books: [],
    settings: { ...DEFAULT_SETTINGS },
    lastBookId: null,
    moyuStats: { ...DEFAULT_MOYU_STATS },
  };
}

function normalizeBook(book: Book): Book {
  return {
    ...book,
    bookmarks: book.bookmarks ?? [],
    chapters: book.chapters ?? [],
    fileMissing: book.fileMissing ?? false,
  };
}

export async function loadAppState(): Promise<AppState> {
  const saved = await platformLoadAppState();
  if (!saved) return defaultState();
  return {
    ...defaultState(),
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    books: (saved.books ?? []).map(normalizeBook),
    moyuStats: {
      ...DEFAULT_MOYU_STATS,
      ...saved.moyuStats,
      sessions: saved.moyuStats?.sessions ?? [],
      trackingEnabled: saved.moyuStats?.trackingEnabled !== false,
    },
  };
}

export async function saveAppState(state: AppState): Promise<void> {
  await platformSaveAppState(toPlain(state));
}

export async function upsertBook(book: Book, state: AppState): Promise<AppState> {
  const next = {
    ...state,
    books: [...state.books.filter((b) => b.id !== book.id), book],
    lastBookId: book.id,
  };
  await saveAppState(next);
  return next;
}

export async function updateBookProgress(
  bookId: string,
  charOffset: number,
  state: AppState,
): Promise<AppState> {
  const next = {
    ...state,
    books: state.books.map((b) =>
      b.id === bookId ? { ...b, charOffset } : b,
    ),
    lastBookId: bookId,
  };
  await saveAppState(next);
  return next;
}

export async function removeBook(
  bookId: string,
  state: AppState,
): Promise<AppState> {
  const next = {
    ...state,
    books: state.books.filter((b) => b.id !== bookId),
    lastBookId: state.lastBookId === bookId ? null : state.lastBookId,
  };
  await saveAppState(next);
  return next;
}

export async function updateSettings(
  settings: Partial<ReaderSettings>,
  state: AppState,
): Promise<AppState> {
  const next = {
    ...state,
    settings: { ...state.settings, ...settings },
  };
  await saveAppState(next);
  return next;
}

export async function updateBookMeta(
  bookId: string,
  patch: Partial<Pick<Book, "chapters" | "bookmarks" | "fileMissing" | "totalChars">>,
  state: AppState,
): Promise<AppState> {
  const next = {
    ...state,
    books: state.books.map((b) =>
      b.id === bookId ? { ...b, ...patch } : b,
    ),
  };
  await saveAppState(next);
  return next;
}

export async function addBookmark(
  bookId: string,
  charOffset: number,
  label: string,
  state: AppState,
): Promise<AppState> {
  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    charOffset,
    label,
    createdAt: Date.now(),
  };
  const next = {
    ...state,
    books: state.books.map((b) =>
      b.id === bookId
        ? { ...b, bookmarks: [...b.bookmarks, bookmark] }
        : b,
    ),
  };
  await saveAppState(next);
  return next;
}

export async function removeBookmark(
  bookId: string,
  bookmarkId: string,
  state: AppState,
): Promise<AppState> {
  const next = {
    ...state,
    books: state.books.map((b) =>
      b.id === bookId
        ? { ...b, bookmarks: b.bookmarks.filter((m) => m.id !== bookmarkId) }
        : b,
    ),
  };
  await saveAppState(next);
  return next;
}

export async function updateBookChapters(
  bookId: string,
  chapters: ChapterEntry[],
  state: AppState,
): Promise<AppState> {
  return updateBookMeta(bookId, { chapters }, state);
}