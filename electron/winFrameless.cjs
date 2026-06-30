/**
 * Windows helpers for frameless transparent main reader window.
 *
 * Do NOT use Electron titleBarOverlay here — it paints native min/max/close in the
 * top-right (Windows accent blue) and an inactive caption band on blur.
 * Suppression is handled via DWM + Win32 style stripping (dwmCaption.cjs).
 */

const {
  applyDwmCaptionStyle,
  forceRepaintWindow,
  withPreservedBounds,
} = require("./dwmCaption.cjs");

let frameRestoreSuspended = false;

const WM_INITMENU = 0x0116;
const WM_ACTIVATE = 0x0006;

/**
 * @param {import("electron").BrowserWindow} win
 */
function clearWindowTitle(win) {
  if (!win.isDestroyed()) {
    win.setTitle("");
  }
}

/**
 * @param {import("electron").BrowserWindow} win
 */
function preventNativeTitleBar(win) {
  clearWindowTitle(win);
  win.on("page-title-updated", (event) => {
    event.preventDefault();
    clearWindowTitle(win);
  });
  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    clearWindowTitle(win);
  });
}

/**
 * @param {import("electron").BrowserWindow | null | undefined} win
 * @param {{ transparentBackground?: boolean, backgroundColor?: string }} [settings]
 */
function applyWindowsFrameStyle(win, settings = {}) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) {
    return;
  }

  applyDwmCaptionStyle(win, settings);
  clearWindowTitle(win);
}

/**
 * Re-apply frame suppression and force a repaint when the window becomes active.
 * DWM may keep the inactive caption band until explicitly refreshed.
 *
 * @param {import("electron").BrowserWindow | null | undefined} win
 * @param {{ transparentBackground?: boolean, backgroundColor?: string }} [settings]
 */
function setFrameRestoreSuspended(value) {
  frameRestoreSuspended = !!value;
}

function restoreWindowsFrameOnFocus(win, settings = {}) {
  if (!win || win.isDestroyed() || frameRestoreSuspended) {
    return;
  }

  const bounds = win.getBounds();
  applyWindowsTransparencyPolicy(win, settings);

  if (process.platform !== "win32") {
    return;
  }

  forceRepaintWindow(win);

  setImmediate(() => {
    if (win.isDestroyed() || frameRestoreSuspended) return;
    applyWindowsFrameStyle(win, settings);
    forceRepaintWindow(win);
    if (!win.isDestroyed()) {
      const current = win.getBounds();
      if (current.width !== bounds.width || current.height !== bounds.height) {
        win.setBounds({
          x: current.x,
          y: current.y,
          width: bounds.width,
          height: bounds.height,
        });
      }
    }
  });
}

/**
 * @param {import("electron").BrowserWindow} win
 * @param {() => Record<string, unknown>} [getSettings]
 */
function installWindowsTitleBarGuard(win, getSettings = () => ({})) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) {
    return;
  }

  let resetting = false;

  const refreshFrame = () => {
    if (win.isDestroyed() || frameRestoreSuspended) return;
    withPreservedBounds(win, () => {
      applyWindowsFrameStyle(win, getSettings());
    });
  };

  const runGuarded = (fn) => {
    if (resetting || win.isDestroyed()) return;
    resetting = true;
    try {
      fn();
    } finally {
      resetting = false;
    }
  };

  try {
    win.hookWindowMessage(WM_INITMENU, () => {
      runGuarded(() => {
        win.setEnabled(false);
        win.setEnabled(true);
        refreshFrame();
      });
    });
  } catch {
    /* hook unsupported on some builds */
  }

  try {
    win.hookWindowMessage(WM_ACTIVATE, (wparam) => {
      if (win.isDestroyed()) return;
      const active = wparam.readUInt16LE(0);
      runGuarded(() => {
        const settings = getSettings();
        if (active === 0) {
          refreshFrame();
        } else {
          restoreWindowsFrameOnFocus(win, settings);
        }
      });
    });
  } catch {
    /* hook unsupported on some builds */
  }

  win.on("blur", refreshFrame);
  win.on("focus", () => {
    restoreWindowsFrameOnFocus(win, getSettings());
  });
  win.on("show", refreshFrame);

  win.once("closed", () => {
    if (win.isDestroyed()) return;
    for (const message of [WM_INITMENU, WM_ACTIVATE]) {
      try {
        win.unhookWindowMessage(message);
      } catch {
        /* ignore */
      }
    }
  });
}

/**
 * @param {import("electron").BrowserWindowConstructorOptions} options
 * @returns {import("electron").BrowserWindowConstructorOptions}
 */
function buildWindowsMainWindowOptions(options) {
  if (process.platform !== "win32") {
    return options;
  }

  const built = {
    ...options,
    frame: false,
    transparent: options.transparent !== false,
    backgroundColor: options.backgroundColor ?? "#00000000",
    hasShadow: false,
    roundedCorners: false,
    backgroundMaterial: "none",
  };

  delete built.thickFrame;
  delete built.titleBarOverlay;

  return built;
}

/**
 * @param {import("electron").BrowserWindow | null | undefined} win
 * @param {{ transparentBackground?: boolean, backgroundColor?: string }} [settings]
 */
function applyWindowsTransparencyPolicy(win, settings = {}) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const enabled = settings.transparentBackground === true;
  const solidBackground = settings.backgroundColor ?? "#c7edcc";

  win.setBackgroundColor(enabled ? "#00000000" : solidBackground);

  if (typeof win.setBackgroundMaterial === "function") {
    try {
      win.setBackgroundMaterial("none");
    } catch {
      /* ignore */
    }
  }

  applyWindowsFrameStyle(win, settings);
}

module.exports = {
  WM_INITMENU,
  WM_ACTIVATE,
  buildWindowsMainWindowOptions,
  clearWindowTitle,
  preventNativeTitleBar,
  applyWindowsFrameStyle,
  restoreWindowsFrameOnFocus,
  setFrameRestoreSuspended,
  installWindowsTitleBarGuard,
  applyWindowsTransparencyPolicy,
};