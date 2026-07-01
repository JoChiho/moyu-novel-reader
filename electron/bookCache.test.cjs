const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const {
  splitTextByChapters,
  writeBookCache,
  readSliceAtGlobalOffset,
  deleteBookCache,
} = require("./bookCache.cjs");

describe("bookCache.cjs", () => {
  /** @type {string | null} */
  let tempRoot = null;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "moyu-book-cache-"));
    process.env.MOYU_BOOK_CACHE_ROOT = tempRoot;
  });

  afterEach(async () => {
    delete process.env.MOYU_BOOK_CACHE_ROOT;
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("splitTextByChapters uses chapter boundaries", () => {
    const text = "前言\n\n第一章 开始\n正文A\n\n第二章 继续\n正文B";
    const chapters = [
      { title: "第一章 开始", charOffset: 5 },
      { title: "第二章 继续", charOffset: 18 },
    ];
    const slices = splitTextByChapters(text, chapters);
    assert.equal(slices.length, 2);
    assert.equal(slices[0].globalOffset, 5);
    assert.ok(slices[0].text.includes("正文A"));
    assert.equal(slices[1].globalOffset, 18);
    assert.ok(slices[1].text.includes("正文B"));
  });

  it("writes and reads chapter slices by global offset", async () => {
    const bookId = "test-book";
    const text = "第一章 甲\n" + "a".repeat(120) + "\n第二章 乙\n" + "b".repeat(80);
    await writeBookCache(bookId, text, { sourcePath: "/fake/path.txt" });

    const startSlice = await readSliceAtGlobalOffset(bookId, 0);
    assert.ok(startSlice);
    assert.equal(startSlice.chapterIndex, 0);
    assert.equal(startSlice.localOffset, 0);
    assert.ok(startSlice.text.startsWith("第一章 甲"));

    const secondChapterOffset = startSlice.chapters[1].charOffset;
    const midSlice = await readSliceAtGlobalOffset(bookId, secondChapterOffset + 5);
    assert.equal(midSlice.chapterIndex, 1);
    assert.equal(midSlice.localOffset, 5);
    assert.ok(midSlice.hasPrevChapter);
    assert.equal(midSlice.hasNextChapter, false);

    await deleteBookCache(bookId);
    const missing = await readSliceAtGlobalOffset(bookId, 0);
    assert.equal(missing, null);
  });
});