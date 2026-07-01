import type { Book, BookChapterSlice, BookReadOptions } from "../types";
import {
  platformDeleteBookCache,
  platformPickAndReadBook,
  platformReadBookSlice,
} from "./platform";

export async function pickAndReadBook(
  options: BookReadOptions = {},
): Promise<{
  book: Book;
  slice: BookChapterSlice;
} | null> {
  const result = await platformPickAndReadBook(options);
  if (!result) return null;
  return result;
}

export async function reloadBookChapterSlice(
  book: Book,
  globalOffset: number,
  options: BookReadOptions = {},
): Promise<BookChapterSlice> {
  return platformReadBookSlice(book.id, book.filePath, globalOffset, options);
}

export async function deleteBookCache(bookId: string): Promise<void> {
  await platformDeleteBookCache(bookId);
}