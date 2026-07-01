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

function normalizeLoaded(saved: AppState): AppState {
  return {
    ...defaultState(),
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    books: (saved.books ?? []).map(normalizeBook),
    moyuStats: {
      ...DEFAULT_MOYU_STATS,
      ...saved.moyuStats,
      sessions: saved.moyuStats?.sessions ?? [],
      totalCharsRead: saved.moyuStats?.totalCharsRead ?? 0,
      trackingEnabled: saved.moyuStats?.trackingEnabled !== false,
    },
  };
}

export async function loadAppState(): Promise<AppState> {
  const saved = await platformLoadAppState();
  if (!saved) return defaultState();
  return normalizeLoaded(saved);
}

/** Always merge patches against the latest persisted snapshot. */
async function withLatestState(): Promise<AppState> {
  return loadAppState();
}

export async function saveAppState(state: AppState): Promise<void> {
  await platformSaveAppState(toPlain(state));
}

export async function upsertBook(book: Book, _state: AppState): Promise<AppState> {
  const base = await withLatestState();
  const next = {
    ...base,
    books: [...base.books.filter((b) => b.id !== book.id), normalizeBook(book)],
    lastBookId: book.id,
  };
  await saveAppState(next);
  return next;
}

export async function updateBookProgress(
  bookId: string,
  charOffset: number,
  _state: AppState,
): Promise<AppState> {
  const base = await withLatestState();
  const next = {
    ...base,
    books: base.books.map((b) =>
      b.id === bookId ? { ...b, charOffset } : b,
    ),
    lastBookId: bookId,
  };
  await saveAppState(next);
  return next;
}

export async function removeBook(
  bookId: string,
  _state: AppState,
): Promise<AppState> {
  const { deleteBookCache } = await import("./bookImport");
  await deleteBookCache(bookId);
  const base = await withLatestState();
  const next = {
    ...base,
    books: base.books.filter((b) => b.id !== bookId),
    lastBookId: base.lastBookId === bookId ? null : base.lastBookId,
  };
  await saveAppState(next);
  return next;
}

export async function updateSettings(
  settings: Partial<ReaderSettings>,
  _state: AppState,
): Promise<AppState> {
  const base = await withLatestState();
  const next = {
    ...base,
    settings: { ...base.settings, ...settings },
  };
  await saveAppState(next);
  return next;
}

export async function updateBookMeta(
  bookId: string,
  patch: Partial<Pick<Book, "chapters" | "bookmarks" | "fileMissing" | "totalChars">>,
  _state: AppState,
): Promise<AppState> {
  const base = await withLatestState();
  const next = {
    ...base,
    books: base.books.map((b) =>
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
  _state: AppState,
): Promise<AppState> {
  const base = await withLatestState();
  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    charOffset,
    label,
    createdAt: Date.now(),
  };
  const next = {
    ...base,
    books: base.books.map((b) =>
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
  _state: AppState,
): Promise<AppState> {
  const base = await withLatestState();
  const next = {
    ...base,
    books: base.books.map((b) =>
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