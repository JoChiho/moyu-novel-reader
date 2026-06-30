const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const version = require(path.join(root, "package.json")).version;
const portable = path.join(
  root,
  "release",
  `moyu-novel-reader-${version}-portable.exe`,
);
const unpacked = path.join(root, "release", "win-unpacked", "moyu-novel-reader.exe");

function assertFile(filePath, minBytes) {
  if (!fs.existsSync(filePath)) {
    console.error(`[verify-dist] missing: ${filePath}`);
    process.exit(1);
  }
  const size = fs.statSync(filePath).size;
  if (size < minBytes) {
    console.error(
      `[verify-dist] file too small (${size} bytes): ${filePath}`,
    );
    process.exit(1);
  }
  console.log(`[verify-dist] ok ${path.basename(filePath)} (${size} bytes)`);
}

assertFile(unpacked, 50 * 1024 * 1024);
assertFile(portable, 50 * 1024 * 1024);