const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  readTextFileSmart,
  readTextFileWithEncoding,
  normalizeBookText,
  stripBookExtension,
  stripHtmlToText,
  rtfToPlainText,
  getFileExtension,
  readBookFile,
  scoreDecodedText,
  isLikelyGarbled,
  decodeTextAuto,
  BOOK_FILE_EXTENSIONS,
} = require("./fileReader.cjs");

describe("fileReader.cjs", () => {
  it("reads utf-8 text", () => {
    const file = path.join(os.tmpdir(), `moyu-utf8-${Date.now()}.txt`);
    fs.writeFileSync(file, "摸鱼阅读器", "utf-8");
    assert.equal(readTextFileSmart(file), "摸鱼阅读器");
    fs.unlinkSync(file);
  });

  it("reads gbk when forced", () => {
    const file = path.join(os.tmpdir(), `moyu-gbk-${Date.now()}.txt`);
    const iconv = require("iconv-lite");
    fs.writeFileSync(file, iconv.encode("中文测试", "gbk"));
    assert.equal(readTextFileWithEncoding(file, "gbk"), "中文测试");
    fs.unlinkSync(file);
  });

  it("auto-detects utf-8 chinese", () => {
    const file = path.join(os.tmpdir(), `moyu-auto-utf8-${Date.now()}.txt`);
    fs.writeFileSync(file, "第一章 摸鱼小说，主角开始了冒险。", "utf-8");
    assert.equal(readTextFileWithEncoding(file, "auto"), "第一章 摸鱼小说，主角开始了冒险。");
    fs.unlinkSync(file);
  });

  it("auto-detects gbk chinese without replacement chars", () => {
    const file = path.join(os.tmpdir(), `moyu-auto-gbk-${Date.now()}.txt`);
    const iconv = require("iconv-lite");
    const content = "第一章 摸鱼小说，主角开始了冒险。";
    fs.writeFileSync(file, iconv.encode(content, "gbk"));
    assert.equal(readTextFileWithEncoding(file, "auto"), content);
    fs.unlinkSync(file);
  });

  it("scores garbled mojibake lower than proper chinese", () => {
    const iconv = require("iconv-lite");
    const proper = "第三章 江湖夜雨十年灯。";
    const garbled = iconv.decode(iconv.encode(proper, "gbk"), "utf-8");
    assert.ok(scoreDecodedText(proper) > scoreDecodedText(garbled));
    assert.equal(isLikelyGarbled(proper), false);
    assert.equal(isLikelyGarbled(garbled), true);
  });

  it("decodeTextAuto prefers gbk for gbk bytes", () => {
    const iconv = require("iconv-lite");
    const content = "第二节 测试自动识别编码。";
    const buf = iconv.encode(content, "gbk");
    assert.equal(decodeTextAuto(buf), content);
  });

  it("normalizes book text and collapses blank lines", () => {
    assert.equal(normalizeBookText("a\r\n\r\n\r\nb"), "a\nb");
    assert.equal(normalizeBookText("段落一\n\n\n段落二"), "段落一\n段落二");
    assert.equal(normalizeBookText("\uFEFFhello"), "hello");
  });

  it("keeps blank lines when collapse is disabled", () => {
    assert.equal(
      normalizeBookText("段落一\n\n\n段落二", false),
      "段落一\n\n\n段落二",
    );
  });

  it("strips book extensions", () => {
    assert.equal(stripBookExtension("C:\\books\\novel.docx"), "novel");
    assert.equal(stripBookExtension("/tmp/story.doc"), "story");
    assert.equal(stripBookExtension("book.TXT"), "book");
    assert.equal(stripBookExtension("C:\\books\\story.epub"), "story");
    assert.equal(stripBookExtension("/tmp/chapter.md"), "chapter");
    assert.equal(stripBookExtension("book.html"), "book");
  });

  it("exports supported book extensions", () => {
    assert.ok(BOOK_FILE_EXTENSIONS.includes("epub"));
    assert.ok(BOOK_FILE_EXTENSIONS.includes("md"));
    assert.ok(BOOK_FILE_EXTENSIONS.includes("txt"));
  });

  it("strips html to readable text", () => {
    const html = "<h1>标题</h1><p>第一段</p><script>bad()</script>";
    assert.match(stripHtmlToText(html), /标题/);
    assert.match(stripHtmlToText(html), /第一段/);
    assert.doesNotMatch(stripHtmlToText(html), /bad/);
  });

  it("converts rtf control words to plain text", () => {
    const rtf = "{\\rtf1\\ansi hello\\par world\\tab!}";
    assert.equal(rtfToPlainText(rtf).trim(), "hello\nworld\t!");
  });

  it("detects file extensions", () => {
    assert.equal(getFileExtension("a.DOCX"), ".docx");
    assert.equal(getFileExtension("a.doc"), ".doc");
  });

  it("throws when file is missing", async () => {
    const file = path.join(os.tmpdir(), `moyu-missing-${Date.now()}.txt`);
    await assert.rejects(() => readBookFile(file), /文件不存在/);
  });

  it("rejects unsupported formats", async () => {
    const file = path.join(os.tmpdir(), `moyu-pdf-${Date.now()}.pdf`);
    fs.writeFileSync(file, "%PDF");
    await assert.rejects(() => readBookFile(file), /不支持的文件格式/);
    fs.unlinkSync(file);
  });

  it("reads docx fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.docx");
    const text = await readBookFile(fixture);
    assert.match(text, /摸鱼 Word 导入测试/);
    assert.match(text, /第二段内容/);
  });

  it("reads markdown fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.md");
    const text = await readBookFile(fixture);
    assert.match(text, /摸鱼 Markdown 导入测试/);
    assert.match(text, /主角开始了冒险/);
    assert.match(text, /第二段内容/);
  });

  it("reads html fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.html");
    const text = await readBookFile(fixture);
    assert.match(text, /摸鱼 HTML 导入测试/);
    assert.match(text, /主角开始了冒险/);
    assert.doesNotMatch(text, /hidden/);
  });

  it("reads rtf fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.rtf");
    const text = await readBookFile(fixture);
    assert.match(text, /摸鱼 RTF 导入测试/);
    assert.match(text, /主角开始了冒险/);
    assert.match(text, /第二段内容/);
  });

  it("reads fb2 fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.fb2");
    const text = await readBookFile(fixture);
    assert.match(text, /第一章/);
    assert.match(text, /主角开始了冒险/);
    assert.match(text, /第二段内容/);
  });

  it("reads epub fixture", async () => {
    const fixture = path.join(__dirname, "fixtures", "sample.epub");
    const text = await readBookFile(fixture);
    assert.match(text, /摸鱼 EPUB 导入测试/);
    assert.match(text, /主角开始了冒险/);
    assert.match(text, /第二段内容/);
  });
});