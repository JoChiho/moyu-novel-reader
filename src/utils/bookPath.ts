import type { Book } from "../types";

/** Display-friendly list of supported import extensions. */
export const SUPPORTED_BOOK_FORMATS =
  "txt / md / html / rtf / fb2 / epub / docx / doc";

export function basename(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filePath;
}

const BOOK_EXTENSION_PATTERN =
  /\.(txt|text|md|markdown|html?|rtf|fb2|epub|docx?)$/i;

export function stripExtension(name: string): string {
  return name.replace(BOOK_EXTENSION_PATTERN, "");
}

export function createBookFromPath(filePath: string, content: string): Book {
  const title = stripExtension(basename(filePath));
  return {
    id: crypto.randomUUID(),
    title,
    filePath,
    addedAt: Date.now(),
    charOffset: 0,
    totalChars: content.length,
    bookmarks: [],
    chapters: [],
  };
}