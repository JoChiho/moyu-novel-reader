const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  WM_INITMENU,
  WM_ACTIVATE,
  buildWindowsMainWindowOptions,
  applyWindowsTransparencyPolicy,
  applyWindowsFrameStyle,
  clearWindowTitle,
  installWindowsTitleBarGuard,
} = require("./winFrameless.cjs");

describe("winFrameless.cjs", () => {
  it("keeps transparent windows on win32 without titleBarOverlay", () => {
    const built = buildWindowsMainWindowOptions({
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: true,
      titleBarOverlay: { color: "#ff0000", height: 40 },
    });

    if (process.platform === "win32") {
      assert.equal(built.transparent, true);
      assert.equal(built.backgroundColor, "#00000000");
      assert.equal(built.hasShadow, false);
      assert.equal(built.backgroundMaterial, "none");
      assert.equal(built.titleBarOverlay, undefined);
    }
  });

  it("sets fully transparent native background when摸鱼 mode is on", () => {
    let color = "";
    const mockWin = {
      isDestroyed: () => false,
      setBackgroundColor(value) {
        color = value;
      },
      setBackgroundMaterial() {},
      setTitle() {},
    };

    applyWindowsTransparencyPolicy(mockWin, {
      transparentBackground: true,
      backgroundColor: "#c7edcc",
    });

    assert.equal(color, "#00000000");
  });

  it("does not call setTitleBarOverlay", () => {
    let overlayCalled = false;
    const mockWin = {
      isDestroyed: () => false,
      setTitle() {},
      setTitleBarOverlay() {
        overlayCalled = true;
      },
    };

    applyWindowsFrameStyle(mockWin, { transparentBackground: true });
    assert.equal(overlayCalled, false);
  });

  it("clears the native window title", () => {
    let title = "摸鱼小说阅读器";
    const mockWin = {
      isDestroyed: () => false,
      setTitle(value) {
        title = value;
      },
    };

    clearWindowTitle(mockWin);
    assert.equal(title, "");
  });

  it("installs frame guards without throwing", () => {
    const hooks = [];
    const mockWin = {
      isDestroyed: () => false,
      isFocused: () => false,
      hookWindowMessage(message, callback) {
        hooks.push({ message, callback });
      },
      on() {},
      once() {},
      setEnabled() {},
      setTitle() {},
    };

    assert.doesNotThrow(() =>
      installWindowsTitleBarGuard(mockWin, () => ({
        transparentBackground: true,
      })),
    );

    if (process.platform === "win32") {
      assert.equal(hooks.length, 2);
      assert.deepEqual(
        hooks.map((h) => h.message).sort(),
        [WM_ACTIVATE, WM_INITMENU].sort(),
      );
    }
  });
});