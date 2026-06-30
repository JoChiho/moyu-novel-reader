const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  DWMWA_COLOR_NONE,
  resolveDwmFrameColors,
} = require("./dwmCaption.cjs");

describe("dwmCaption.cjs", () => {
  it("uses COLOR_NONE for all frame colors in摸鱼 mode", () => {
    const colors = resolveDwmFrameColors({
      transparentBackground: true,
      backgroundColor: "#c7edcc",
    });
    assert.equal(colors.caption, DWMWA_COLOR_NONE);
    assert.equal(colors.border, DWMWA_COLOR_NONE);
    assert.equal(colors.text, DWMWA_COLOR_NONE);
    assert.equal(colors.suppressFrame, true);
  });

  it("uses solid colors when摸鱼 mode is off", () => {
    const colors = resolveDwmFrameColors({
      transparentBackground: false,
      backgroundColor: "#c7edcc",
    });
    assert.notEqual(colors.caption, DWMWA_COLOR_NONE);
    assert.equal(colors.suppressFrame, false);
  });
});