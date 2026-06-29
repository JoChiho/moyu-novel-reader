import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { Book } from "../types";

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] ?? path;
}

function stripExtension(name: string): string {
  return name.replace(/\.txt$/i, "");
}

export async function pickAndReadTxt(): Promise<{
  book: Book;
  content: string;
} | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Text", extensions: ["txt"] }],
  });

  if (!selected || Array.isArray(selected)) return null;

  const content = await readTextFile(selected);
  const title = stripExtension(basename(selected));

  const book: Book = {
    id: crypto.randomUUID(),
    title,
    filePath: selected,
    addedAt: Date.now(),
    charOffset: 0,
    totalChars: content.length,
  };

  return { book, content };
}

export async function reloadBookContent(book: Book): Promise<string> {
  return readTextFile(book.filePath);
}