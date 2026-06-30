const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

/** @type {readonly string[]} */
const BOOK_FILE_EXTENSIONS = [
  "txt",
  "text",
  "md",
  "markdown",
  "html",
  "htm",
  "rtf",
  "fb2",
  "epub",
  "docx",
  "doc",
];

const BOOK_EXTENSION_PATTERN = new RegExp(
  `\\.(${BOOK_FILE_EXTENSIONS.join("|")})$`,
  "i",
);

const TEXT_LIKE_EXTENSIONS = new Set([
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".html",
  ".htm",
]);

/**
 * Normalize extracted book text for pagination.
 * @param {string} text
 * @param {boolean} [collapseBlankLines]
 * @returns {string}
 */
function normalizeBookText(text, collapseBlankLines = true) {
  let result = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\uFEFF/, "");

  if (collapseBlankLines) {
    result = result
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{2,}/g, "\n");
  }

  return result.trimEnd();
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function stripBookExtension(filePath) {
  return path.basename(filePath).replace(BOOK_EXTENSION_PATTERN, "");
}

/**
 * Decode common HTML entities and strip tags for reading.
 * @param {string} html
 * @returns {string}
 */
function stripHtmlToText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));

  return text;
}

const RTF_SKIP_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "filetbl",
  "listtables",
  "listoverridetable",
  "rsidtbl",
  "generator",
  "*",
]);

/**
 * @param {string} rtf
 * @returns {string}
 */
function rtfToPlainText(rtf) {
  let out = "";
  /** @type {number[]} */
  const stack = [];
  let skipping = 0;
  let i = 0;

  while (i < rtf.length) {
    const ch = rtf[i];

    if (ch === "{") {
      stack.push(skipping);
      i++;
      continue;
    }

    if (ch === "}") {
      skipping = stack.pop() ?? 0;
      i++;
      continue;
    }

    if (ch === "\\") {
      const hex = rtf.slice(i).match(/^\\'([0-9a-f]{2})/i);
      if (hex) {
        if (!skipping) {
          out += String.fromCharCode(parseInt(hex[1], 16));
        }
        i += hex[0].length;
        continue;
      }

      const unicode = rtf.slice(i).match(/^\\u(-?\d+)\s?/);
      if (unicode) {
        if (!skipping) {
          let code = Number(unicode[1]);
          if (code < 0) code += 65536;
          out += String.fromCodePoint(code);
        }
        i += unicode[0].length;
        if (
          i < rtf.length &&
          rtf[i] !== "\\" &&
          rtf[i] !== "{" &&
          rtf[i] !== "}"
        ) {
          i++;
        }
        continue;
      }

      const control = rtf.slice(i).match(/^\\([a-z*]+)(-?\d+)?\s?/i);
      if (control) {
        const word = control[1].toLowerCase();
        if (!skipping) {
          if (word === "par" || word === "pard") out += "\n";
          else if (word === "line") out += "\n";
          else if (word === "tab") out += "\t";
        }
        if (RTF_SKIP_DESTINATIONS.has(word)) {
          skipping = stack.length + 1;
        }
        i += control[0].length;
        continue;
      }

      i++;
      continue;
    }

    if (!skipping) out += ch;
    i++;
  }

  return out;
}

const MOJIBAKE_MARKERS = ["锟斤拷", "烫烫烫", "屯屯屯", "ï¿½", "Ã", "Â", "¤"];

/**
 * Take head/middle/tail samples so large files stay fast to score.
 * @param {string} text
 * @param {number} [limit]
 * @returns {string}
 */
function sampleText(text, limit = 12000) {
  if (text.length <= limit) return text;
  const chunk = Math.floor(limit / 3);
  const mid = Math.floor(text.length / 2);
  return (
    text.slice(0, chunk) +
    text.slice(mid - Math.floor(chunk / 2), mid + Math.floor(chunk / 2)) +
    text.slice(-chunk)
  );
}

/**
 * Lower score means more likely garbled. Used to compare candidate decodings.
 * @param {string} text
 * @returns {number}
 */
function scoreDecodedText(text) {
  const sample = sampleText(text);
  if (!sample.length) return 100;

  let score = 0;

  for (const marker of MOJIBAKE_MARKERS) {
    if (!sample.includes(marker)) continue;
    score -= 40 * (sample.split(marker).length - 1);
  }

  let replacement = 0;
  let control = 0;
  let cjk = 0;
  let latinExtended = 0;
  let ascii = 0;
  let punct = 0;
  let other = 0;

  for (const ch of sample) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfffd) {
      replacement++;
      continue;
    }
    if (ch === "\0" || (cp !== undefined && cp < 32 && cp !== 9 && cp !== 10 && cp !== 13)) {
      control++;
      continue;
    }
    if (
      cp !== undefined &&
      ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf))
    ) {
      cjk++;
    } else if (
      cp !== undefined &&
      (cp === 0x3001 ||
        cp === 0x3002 ||
        cp === 0x2014 ||
        cp === 0x2026 ||
        (cp >= 0x3000 && cp <= 0x303f) ||
        (cp >= 0xff00 && cp <= 0xffef))
    ) {
      punct++;
    } else if (cp !== undefined && cp < 128) {
      ascii++;
    } else if (cp !== undefined && cp >= 0x80 && cp <= 0x024f) {
      latinExtended++;
    } else {
      other++;
    }
  }

  const total = sample.length;
  score -= replacement * 200;
  score -= control * 80;

  const meaningful = total - replacement - control;
  if (meaningful <= 0) return -10000;

  const cjkRatio = cjk / meaningful;
  const latinRatio = latinExtended / meaningful;

  score += cjkRatio * 100;

  if (latinRatio > 0.08) {
    score -= latinRatio * 120;
  } else {
    score -= latinRatio * 30;
  }

  if (cjk === 0 && latinExtended === 0 && replacement === 0) {
    score += 60;
  }

  score += (punct / meaningful) * 15;
  score += Math.min(other / meaningful, 0.05) * 20;

  return score;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isLikelyGarbled(text) {
  return scoreDecodedText(text) < 20;
}

/**
 * Try UTF-8 and GBK, pick the decode that looks least garbled.
 * @param {Buffer} buf
 * @returns {string}
 */
function decodeTextAuto(buf) {
  const candidates = [
    { encoding: "utf-8", text: buf.toString("utf-8").replace(/^\uFEFF/, "") },
    { encoding: "gbk", text: iconv.decode(buf, "gbk").replace(/^\uFEFF/, "") },
  ];

  let best = candidates[0];
  let bestScore = scoreDecodedText(best.text);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateScore = scoreDecodedText(candidate.text);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best.text;
}

/**
 * Read a text file. Auto mode scores UTF-8 vs GBK and picks the cleaner decode.
 * @param {string} filePath
 * @param {"auto" | "utf-8" | "gbk"} [encoding]
 * @returns {string}
 */
function readTextFileWithEncoding(filePath, encoding = "auto") {
  const buf = fs.readFileSync(filePath);
  if (buf.length === 0) return "";

  if (encoding === "utf-8") {
    return buf.toString("utf-8").replace(/^\uFEFF/, "");
  }

  if (encoding === "gbk") {
    return iconv.decode(buf, "gbk").replace(/^\uFEFF/, "");
  }

  return decodeTextAuto(buf);
}

/** @param {string} filePath */
function readTextFileSmart(filePath) {
  return readTextFileWithEncoding(filePath, "auto");
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function readDocxFile(filePath, collapseBlankLines = true) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return normalizeBookText(result.value, collapseBlankLines);
}

/**
 * @param {string} filePath
 * @param {boolean} [collapseBlankLines]
 * @returns {Promise<string>}
 */
async function readDocFile(filePath, collapseBlankLines = true) {
  const WordExtractor = require("word-extractor");
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  return normalizeBookText(doc.getBody(), collapseBlankLines);
}

/**
 * @param {string} filePath
 * @param {"auto" | "utf-8" | "gbk"} [encoding]
 * @param {boolean} [collapseBlankLines]
 * @returns {string}
 */
function readTextLikeFile(filePath, encoding = "auto", collapseBlankLines = true) {
  return normalizeBookText(
    readTextFileWithEncoding(filePath, encoding),
    collapseBlankLines,
  );
}

/**
 * @param {string} filePath
 * @param {"auto" | "utf-8" | "gbk"} [encoding]
 * @param {boolean} [collapseBlankLines]
 * @returns {string}
 */
function readHtmlFile(filePath, encoding = "auto", collapseBlankLines = true) {
  const html = readTextFileWithEncoding(filePath, encoding);
  return normalizeBookText(stripHtmlToText(html), collapseBlankLines);
}

/**
 * @param {string} filePath
 * @param {boolean} [collapseBlankLines]
 * @returns {string}
 */
function readRtfFile(filePath, collapseBlankLines = true) {
  const buf = fs.readFileSync(filePath);
  let rtf = buf.toString("utf-8");
  if (!rtf.includes("{\\rtf")) {
    rtf = decodeTextAuto(buf);
  }
  return normalizeBookText(rtfToPlainText(rtf), collapseBlankLines);
}

/**
 * @param {string} filePath
 * @param {"auto" | "utf-8" | "gbk"} [encoding]
 * @param {boolean} [collapseBlankLines]
 * @returns {string}
 */
function readFb2File(filePath, encoding = "auto", collapseBlankLines = true) {
  const xml = readTextFileWithEncoding(filePath, encoding);
  const paragraphs = [];
  const paragraphPattern = /<(?:p|v|subtitle)[^>]*>([\s\S]*?)<\/(?:p|v|subtitle)>/gi;
  let match = paragraphPattern.exec(xml);
  while (match) {
    const inner = stripHtmlToText(match[1]).trim();
    if (inner) paragraphs.push(inner);
    match = paragraphPattern.exec(xml);
  }

  const body =
    paragraphs.length > 0
      ? paragraphs.join("\n")
      : stripHtmlToText(xml.replace(/<body[\s\S]*?<\/body>/i, (section) => section));

  return normalizeBookText(body, collapseBlankLines);
}

/**
 * @param {Record<string, string>} manifest
 * @param {import("jszip")} zip
 * @param {string} href
 * @returns {Promise<string>}
 */
async function readEpubEntry(zip, manifest, href) {
  const decodedHref = decodeURIComponent(href);
  const candidates = new Set([href, decodedHref]);
  if (!href.startsWith("/")) {
    candidates.add(`/${href}`);
    candidates.add(`/${decodedHref}`);
  }

  for (const candidate of candidates) {
    const entry = zip.file(candidate);
    if (entry) {
      return entry.async("string");
    }
  }

  const suffix = href.split("/").pop();
  if (!suffix) return "";

  const fallback = zip.file(new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  if (!fallback || fallback.length === 0) return "";
  return fallback[0].async("string");
}

/**
 * @param {string} filePath
 * @param {boolean} [collapseBlankLines]
 * @returns {Promise<string>}
 */
async function readEpubFile(filePath, collapseBlankLines = true) {
  const JSZip = require("jszip");
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);

  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("无效的 EPUB：缺少 container.xml");
  }

  const containerXml = await containerFile.async("string");
  const rootfileMatch = containerXml.match(/full-path="([^"]+)"/i);
  if (!rootfileMatch) {
    throw new Error("无效的 EPUB：无法定位内容文件");
  }

  const opfPath = rootfileMatch[1].replace(/\\/g, "/");
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error("无效的 EPUB：缺少 OPF 文件");
  }

  const opfXml = await opfFile.async("string");
  const opfDir = path.posix.dirname(opfPath);
  const resolveHref = (href) => {
    const normalized = href.replace(/\\/g, "/");
    if (path.posix.isAbsolute(normalized)) {
      return normalized.replace(/^\//, "");
    }
    return opfDir === "." ? normalized : path.posix.join(opfDir, normalized);
  };

  /** @type {Record<string, string>} */
  const manifest = {};
  const itemPattern =
    /<item\b[^>]*\bid="([^"]+)"[^>]*\bhref="([^"]+)"[^>]*\/?>/gi;
  let itemMatch = itemPattern.exec(opfXml);
  while (itemMatch) {
    manifest[itemMatch[1]] = resolveHref(itemMatch[2]);
    itemMatch = itemPattern.exec(opfXml);
  }

  const itemPatternAlt =
    /<item\b[^>]*\bhref="([^"]+)"[^>]*\bid="([^"]+)"[^>]*\/?>/gi;
  itemMatch = itemPatternAlt.exec(opfXml);
  while (itemMatch) {
    manifest[itemMatch[2]] = resolveHref(itemMatch[1]);
    itemMatch = itemPatternAlt.exec(opfXml);
  }

  const spineIds = [];
  const spinePattern = /<itemref\b[^>]*\bidref="([^"]+)"[^>]*\/?>/gi;
  let spineMatch = spinePattern.exec(opfXml);
  while (spineMatch) {
    spineIds.push(spineMatch[1]);
    spineMatch = spinePattern.exec(opfXml);
  }

  const parts = [];
  for (const id of spineIds) {
    const href = manifest[id];
    if (!href) continue;
    const raw = await readEpubEntry(zip, manifest, href);
    if (raw) parts.push(stripHtmlToText(raw));
  }

  if (!parts.length) {
    throw new Error("无效的 EPUB：未找到可读章节");
  }

  return normalizeBookText(parts.join("\n"), collapseBlankLines);
}

/**
 * Read supported book formats and return plain text for the reader.
 * @param {string} filePath
 * @param {"auto" | "utf-8" | "gbk"} [encoding]
 * @param {boolean} [collapseBlankLines]
 * @returns {Promise<string>}
 */
async function readBookFile(filePath, encoding = "auto", collapseBlankLines = true) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`文件不存在或已被移动：${filePath}`);
    err.code = "ENOENT";
    throw err;
  }

  const ext = getFileExtension(filePath);

  if (TEXT_LIKE_EXTENSIONS.has(ext)) {
    if (ext === ".html" || ext === ".htm") {
      return readHtmlFile(filePath, encoding, collapseBlankLines);
    }
    return readTextLikeFile(filePath, encoding, collapseBlankLines);
  }

  switch (ext) {
    case ".rtf":
      return readRtfFile(filePath, collapseBlankLines);
    case ".fb2":
      return readFb2File(filePath, encoding, collapseBlankLines);
    case ".epub":
      return readEpubFile(filePath, collapseBlankLines);
    case ".docx":
      return readDocxFile(filePath, collapseBlankLines);
    case ".doc":
      return readDocFile(filePath, collapseBlankLines);
    default:
      throw new Error(`不支持的文件格式：${ext || "未知"}`);
  }
}

module.exports = {
  BOOK_FILE_EXTENSIONS,
  readTextFileSmart,
  readTextFileWithEncoding,
  readBookFile,
  normalizeBookText,
  stripBookExtension,
  stripHtmlToText,
  rtfToPlainText,
  getFileExtension,
  scoreDecodedText,
  isLikelyGarbled,
  decodeTextAuto,
};