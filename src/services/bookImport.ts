import type { Book } from "../types";
import {
  platformPickAndReadTxt,
  platformReadTextFile,
} from "./platform";

export async function pickAndReadTxt(): Promise<{
  book: Book;
  content: string;
} | null> {
  return platformPickAndReadTxt();
}

export async function reloadBookContent(book: Book): Promise<string> {
  return platformReadTextFile(book.filePath);
}