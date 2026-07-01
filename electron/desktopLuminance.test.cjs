const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calcRelativeLuminance,
  resolveAutoTextColor,
  DARK_TEXT,
  LIGHT_TEXT,
} = require("./desktopLuminance.cjs");

describe("desktopLuminance.cjs", () => {
  it("computes relative luminance", () => {
    assert.equal(calcRelativeLuminance(0, 0, 0), 0);
    assert.equal(calcRelativeLuminance(255, 255, 255), 255);
    assert.ok(calcRelativeLuminance(100, 150, 200) > 100);
  });

  it("picks light text on dark backdrop", () => {
    const result = resolveAutoTextColor(30, 128, null);
    assert.equal(result.textColor, LIGHT_TEXT);
    assert.equal(result.suggestLightText, true);
  });

  it("picks dark text on bright backdrop", () => {
    const result = resolveAutoTextColor(220, 128, null);
    assert.equal(result.textColor, DARK_TEXT);
    assert.equal(result.suggestLightText, false);
  });

  it("applies hysteresis to reduce flicker", () => {
    const dark = resolveAutoTextColor(130, 128, false);
    assert.equal(dark.textColor, DARK_TEXT);

    const stillDark = resolveAutoTextColor(125, 128, false);
    assert.equal(stillDark.textColor, DARK_TEXT);

    const light = resolveAutoTextColor(110, 128, false);
    assert.equal(light.textColor, LIGHT_TEXT);
  });
});