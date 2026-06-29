import { load, type Store } from "@tauri-apps/plugin-store";
import {
  APP_STATE_VERSION,
  DEFAULT_SETTINGS,
  type AppState,
  type Book,
  type ReaderSettings,
} from "../types";

const STORE_PATH = "moyu-reader-state.json";
const STORE_KEY = "appState";

let storePromise: Promise<Store> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_PATH, { autoSave: true, defaults: {} });
  }
  return storePromise;
}

function defaultState(): AppState {
  return {
    version: APP_STATE_VERSION,
    books: [],
    settings: { ...DEFAULT_SETTINGS },
    lastBookId: null,
  };
}

export async function loadAppState(): Promise<AppState> {
  const store = await getStore();
  const saved = await store.get<AppState>(STORE_KEY);
  if (!saved) return defaultState();
  return {
    ...defaultState(),
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    books: saved.books ?? [],
  };
}

export async function saveAppState(state: AppState): Promise<void> {
  const store = await getStore();
  await store.set(STORE_KEY, state);
  await store.save();
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