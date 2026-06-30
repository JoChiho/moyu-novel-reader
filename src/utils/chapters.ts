export interface ChapterEntry {
  title: string;
  charOffset: number;
}

const CHAPTER_LINE =
  /^\s*(第[零一二三四五六七八九十百千万0-9]{1,10}章[^\r\n]{0,60}|第\s*\d+\s*章[^\r\n]{0,60}|Chapter\s+\d+[^\r\n]{0,60}|【[^】\r\n]{1,30}】)\s*$/;

/**
 * Scan text for common Chinese / English chapter headings (line-based).
 */
export function detectChapters(text: string): ChapterEntry[] {
  const chapters: ChapterEntry[] = [];
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && CHAPTER_LINE.test(trimmed)) {
      const title = trimmed.replace(/^\s+|\s+$/g, "");
      chapters.push({ title, charOffset: offset });
    }
    offset += line.length + 1;
  }

  return chapters;
}

/** Return the chapter that contains the given offset. */
export function findChapterAtOffset(
  chapters: ChapterEntry[],
  offset: number,
): ChapterEntry | null {
  if (!chapters.length) return null;
  let found: ChapterEntry | null = null;
  for (const ch of chapters) {
    if (ch.charOffset <= offset) found = ch;
    else break;
  }
  return found;
}