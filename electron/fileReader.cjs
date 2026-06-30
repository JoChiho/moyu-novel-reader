const fs = require("fs");
const iconv = require("iconv-lite");

/**
 * Read a text file with UTF-8 first, then GBK fallback for Chinese novels.
 * @param {string} filePath
 * @returns {string}
 */
function readTextFileSmart(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length === 0) return "";

  const utf8 = buf.toString("utf-8");
  const hasReplacement = utf8.includes("\uFFFD");
  const nullBytes = buf.includes(0);

  if (!hasReplacement && !nullBytes) {
    return utf8.replace(/^\uFEFF/, "");
  }

  const gbk = iconv.decode(buf, "gbk");
  return gbk.replace(/^\uFEFF/, "");
}

module.exports = { readTextFileSmart };