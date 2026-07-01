/**
 * Chapter heading detection (mirrors src/utils/chapters.ts for main process).
 */

const CHAPTER_LINE =
  /^\s*(第[零一二三四五六七八九十百千万0-9]{1,10}章[^\r\n]{0,60}|第\s*\d+\s*章[^\r\n]{0,60}|Chapter\s+\d+[^\r\n]{0,60}|【[^】\r\n]{1,30}】)\s*$/;

/**
 * @param {string} text
 * @returns {Array<{ title: string, charOffset: number }>}
 */
function detectChapters(text) {
  /** @type {Array<{ title: string, charOffset: number }>} */
  const chapters = [];
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

/**
 * @param {Array<{ title: string, charOffset: number }>} chapters
 * @param {number} offset
 */
function findChapterIndexAtOffset(chapters, offset) {
  if (!chapters.length) return 0;
  let index = 0;
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].charOffset <= offset) index = i;
    else break;
  }
  return index;
}

module.exports = {
  detectChapters,
  findChapterIndexAtOffset,
};