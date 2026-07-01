/**
 * Per-book chapter file cache under userData/book-cache/{bookId}/.
 * Splits normalized text at detected chapter boundaries for faster in-chapter pagination.
 */

const path = require("path");
const fs = require("fs/promises");
const { app } = require("electron");
const { detectChapters, findChapterIndexAtOffset } = require("./chapters.cjs");

const MANIFEST_VERSION = 1;

/**
 * @param {string} text
 * @param {Array<{ title: string, charOffset: number }>} chapters
 */
function splitTextByChapters(text, chapters) {
  if (!chapters.length) {
    return [{ title: "全文", globalOffset: 0, text }];
  }

  /** @type {Array<{ title: string, globalOffset: number, text: string }>} */
  const slices = [];
  for (let i = 0; i < chapters.length; i += 1) {
    const start = chapters[i].charOffset;
    const end =
      i + 1 < chapters.length ? chapters[i + 1].charOffset : text.length;
    slices.push({
      title: chapters[i].title,
      globalOffset: start,
      text: text.slice(start, end),
    });
  }
  return slices;
}

function getBookCacheRoot() {
  if (process.env.MOYU_BOOK_CACHE_ROOT) {
    return process.env.MOYU_BOOK_CACHE_ROOT;
  }
  return path.join(app.getPath("userData"), "book-cache");
}

function getBookDir(bookId) {
  return path.join(getBookCacheRoot(), bookId);
}

/**
 * @param {string} bookId
 */
async function loadManifest(bookId) {
  try {
    const raw = await fs.readFile(
      path.join(getBookDir(bookId), "manifest.json"),
      "utf8",
    );
    const manifest = JSON.parse(raw);
    if (!manifest || !Array.isArray(manifest.chapters)) return null;
    return manifest;
  } catch {
    return null;
  }
}

/**
 * @param {string} bookId
 * @param {string} content
 * @param {{
 *   encoding?: string,
 *   collapseBlankLines?: boolean,
 *   sourcePath?: string,
 * }} options
 */
async function writeBookCache(bookId, content, options = {}) {
  const bookDir = getBookDir(bookId);
  const chaptersDir = path.join(bookDir, "chapters");
  await fs.rm(bookDir, { recursive: true, force: true });
  await fs.mkdir(chaptersDir, { recursive: true });

  const detected = detectChapters(content);
  const slices = splitTextByChapters(content, detected);

  /** @type {Array<{
   *   index: number,
   *   title: string,
   *   globalOffset: number,
   *   length: number,
   *   file: string,
   * }>} */
  const manifestChapters = [];

  for (let i = 0; i < slices.length; i += 1) {
    const fileName = `${String(i).padStart(3, "0")}.txt`;
    const relFile = path.posix.join("chapters", fileName);
    await fs.writeFile(
      path.join(bookDir, relFile),
      slices[i].text,
      "utf8",
    );
    manifestChapters.push({
      index: i,
      title: slices[i].title,
      globalOffset: slices[i].globalOffset,
      length: slices[i].text.length,
      file: relFile,
    });
  }

  const manifest = {
    version: MANIFEST_VERSION,
    totalChars: content.length,
    builtAt: Date.now(),
    sourcePath: options.sourcePath ?? null,
    encoding: options.encoding ?? "auto",
    collapseBlankLines: options.collapseBlankLines !== false,
    chapters: manifestChapters,
  };

  await fs.writeFile(
    path.join(bookDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  return {
    manifest,
    chapterEntries: manifestChapters.map((chapter) => ({
      title: chapter.title,
      charOffset: chapter.globalOffset,
    })),
  };
}

/**
 * @param {import("./bookCache.cjs").BookManifest} manifest
 * @param {number} chapterIndex
 */
async function readChapterText(bookId, manifest, chapterIndex) {
  const chapter = manifest.chapters[chapterIndex];
  if (!chapter) return "";
  return fs.readFile(path.join(getBookDir(bookId), chapter.file), "utf8");
}

/**
 * @param {string} bookId
 * @param {number} globalOffset
 */
async function readSliceAtGlobalOffset(bookId, globalOffset) {
  const manifest = await loadManifest(bookId);
  if (!manifest) return null;

  const safeGlobal = Math.max(
    0,
    Math.min(Math.round(globalOffset) || 0, manifest.totalChars),
  );
  const chapterIndex = findChapterIndexAtOffset(
    manifest.chapters.map((chapter) => ({
      title: chapter.title,
      charOffset: chapter.globalOffset,
    })),
    safeGlobal,
  );
  const chapter = manifest.chapters[chapterIndex];
  const text = await readChapterText(bookId, manifest, chapterIndex);

  return {
    text,
    localOffset: Math.max(0, safeGlobal - chapter.globalOffset),
    chapterGlobalStart: chapter.globalOffset,
    globalOffset: safeGlobal,
    chapterIndex,
    chapterTitle: chapter.title,
    totalChars: manifest.totalChars,
    chapters: manifest.chapters.map((entry) => ({
      title: entry.title,
      charOffset: entry.globalOffset,
    })),
    hasNextChapter: chapterIndex < manifest.chapters.length - 1,
    hasPrevChapter: chapterIndex > 0,
    nextChapterGlobalStart:
      chapterIndex < manifest.chapters.length - 1
        ? manifest.chapters[chapterIndex + 1].globalOffset
        : null,
    prevChapterGlobalStart:
      chapterIndex > 0
        ? manifest.chapters[chapterIndex - 1].globalOffset
        : null,
  };
}

/**
 * @param {string} bookId
 */
async function deleteBookCache(bookId) {
  await fs.rm(getBookDir(bookId), { recursive: true, force: true });
}

/**
 * @param {string} bookId
 */
async function hasBookCache(bookId) {
  const manifest = await loadManifest(bookId);
  return manifest != null;
}

module.exports = {
  MANIFEST_VERSION,
  splitTextByChapters,
  getBookCacheRoot,
  getBookDir,
  loadManifest,
  writeBookCache,
  readSliceAtGlobalOffset,
  deleteBookCache,
  hasBookCache,
};