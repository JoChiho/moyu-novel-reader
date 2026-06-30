const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { readTextFileSmart } = require("./fileReader.cjs");

describe("fileReader.cjs", () => {
  it("reads utf-8 text", () => {
    const file = path.join(os.tmpdir(), `moyu-utf8-${Date.now()}.txt`);
    fs.writeFileSync(file, "摸鱼阅读器", "utf-8");
    assert.equal(readTextFileSmart(file), "摸鱼阅读器");
    fs.unlinkSync(file);
  });
});