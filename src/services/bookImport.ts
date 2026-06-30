import type { Book, BookReadOptions } from "../types";
import {
  platformPickAndReadBook,
  platformReadBookFile,
} from "./platform";

export async function pickAndReadBook(
  options: BookReadOptions = {},
): Promise<{
  book: Book;
  content: string;
} | null> {
  return platformPickAndReadBook(options);
}

export async function reloadBookContent(
  book: Book,
  options: BookReadOptions = {},
): Promise<string> {
  return platformReadBookFile(book.filePath, options);
}