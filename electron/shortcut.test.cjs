const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { toElectronShortcut } = require("./shortcut.cjs");

describe("electron shortcut.cjs", () => {
  it("converts Ctrl+Z", () => {
    assert.equal(toElectronShortcut("Ctrl+Z"), "Control+Z");
  });

  it("converts Ctrl+`", () => {
    assert.equal(toElectronShortcut("Ctrl+`"), "Control+`");
  });
});