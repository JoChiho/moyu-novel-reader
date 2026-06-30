import {
  APP_STATE_VERSION,
  DEFAULT_SETTINGS,
  type AppState,
  type Book,
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
  };
}

export async function loadAppState(): Promise<AppState> {
  const saved = await platformLoadAppState();
  if (!saved) return defaultState();
  return {
    ...defaultState(),
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    books: saved.books ?? [],
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