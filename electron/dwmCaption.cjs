/**
 * Windows DWM / Win32 frame suppression for frameless transparent windows.
 *
 * The inactive top band and the blue top-right corner are non-client chrome:
 *   - titleBarOverlay → native min/max/close (accent blue in the corner)
 *   - DWM inactive caption / border paint on blur
 */

const DWMWA_NCRENDERING_ENABLED = 1;
const DWMWA_NCRENDERING_POLICY = 2;
const DWMWA_ALLOW_NCPAINT = 4;
const DWMWA_WINDOW_CORNER_PREFERENCE = 33;
const DWMWA_BORDER_COLOR = 34;
const DWMWA_CAPTION_COLOR = 35;
const DWMWA_TEXT_COLOR = 36;
const DWMWA_VISIBLE_FRAME_BORDER_THICKNESS = 37;
const DWMWA_SYSTEMBACKDROP_TYPE = 38;

const DWMNCRP_USEWINDOWSTYLE = 0;
const DWMNCRP_DISABLED = 1;
const DWMWA_COLOR_NONE = 0xfffffffe;
const DWMWCP_DONOTROUND = 1;
const DWMSBT_NONE = 1;

const GWL_STYLE = -16;
const WS_CAPTION = 0x00c00000;
const WS_THICKFRAME = 0x00040000;
const WS_SYSMENU = 0x00080000;
const WS_MINIMIZEBOX = 0x00020000;
const WS_MAXIMIZEBOX = 0x00010000;

const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOZORDER = 0x0004;
const SWP_FRAMECHANGED = 0x0020;

const RDW_INVALIDATE = 0x0001;
const RDW_UPDATENOW = 0x0100;
const RDW_ALLCHILDREN = 0x0080;
const RDW_FRAME = 0x0400;

/** @type {import("koffi") | null} */
let koffi = null;
/** @type {ReturnType<typeof loadNativeApis> | null} */
let nativeApis = null;

function loadNativeApis() {
  if (process.platform !== "win32") {
    return null;
  }
  if (nativeApis) {
    return nativeApis;
  }

  try {
    koffi = require("koffi");
    const dwmapi = koffi.load("dwmapi.dll");
    const user32 = koffi.load("user32.dll");
    const MARGINS = koffi.struct("MARGINS", {
      cxLeftWidth: "int32",
      cxRightWidth: "int32",
      cyTopHeight: "int32",
      cyBottomHeight: "int32",
    });

    nativeApis = {
      DwmSetWindowAttribute: dwmapi.func(
        "HRESULT DwmSetWindowAttribute(void *hwnd, uint32 dwAttribute, void *pvAttribute, uint32 cbAttribute)",
      ),
      DwmExtendFrameIntoClientArea: dwmapi.func(
        "HRESULT DwmExtendFrameIntoClientArea(void *hwnd, MARGINS *pMarInset)",
      ),
      GetWindowLongPtrW: user32.func(
        "intptr_t GetWindowLongPtrW(void *hwnd, int nIndex)",
      ),
      SetWindowLongPtrW: user32.func(
        "intptr_t SetWindowLongPtrW(void *hwnd, int nIndex, intptr_t dwNewLong)",
      ),
      SetWindowPos: user32.func(
        "bool SetWindowPos(void *hwnd, void *hWndInsertAfter, int X, int Y, int cx, int cy, uint32 uFlags)",
      ),
      RedrawWindow: user32.func(
        "bool RedrawWindow(void *hwnd, void *lprcUpdate, void *hrgnUpdate, uint32 flags)",
      ),
      DwmFlush: dwmapi.func("HRESULT DwmFlush()"),
      MARGINS,
    };
  } catch {
    nativeApis = null;
  }

  return nativeApis;
}

/**
 * @param {import("electron").BrowserWindow} win
 * @returns {Buffer | null}
 */
function readNativeHandle(win) {
  if (!win || win.isDestroyed() || typeof win.getNativeWindowHandle !== "function") {
    return null;
  }

  const handle = win.getNativeWindowHandle();
  return handle?.length ? handle : null;
}

/**
 * @param {import("electron").BrowserWindow} win
 * @param {number} attribute
 * @param {number} value
 * @returns {boolean}
 */
function setDwmUint32(win, attribute, value) {
  const apis = loadNativeApis();
  const handle = readNativeHandle(win);
  if (!apis || !handle) {
    return false;
  }

  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);

  try {
    apis.DwmSetWindowAttribute(handle, attribute, buffer, 4);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {import("electron").BrowserWindow} win
 * @returns {boolean}
 */
function extendFrameIntoClientArea(win) {
  const apis = loadNativeApis();
  const handle = readNativeHandle(win);
  if (!apis || !handle) {
    return false;
  }

  const margins = {
    cxLeftWidth: -1,
    cxRightWidth: -1,
    cyTopHeight: -1,
    cyBottomHeight: -1,
  };

  try {
    apis.DwmExtendFrameIntoClientArea(handle, margins);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strip caption / system menu styles that draw the top-right control affordance.
 * @param {import("electron").BrowserWindow} win
 * @returns {boolean}
 */
function stripSystemCaptionStyles(win) {
  const apis = loadNativeApis();
  const handle = readNativeHandle(win);
  if (!apis || !handle) {
    return false;
  }

  try {
    const style = Number(apis.GetWindowLongPtrW(handle, GWL_STYLE));
    const stripped =
      style &
      ~(WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX);
    apis.SetWindowLongPtrW(handle, GWL_STYLE, stripped);
    apis.SetWindowPos(
      handle,
      null,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} hex
 * @returns {number}
 */
function hexToColorRef(hex) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.slice(0, 6);
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}

/**
 * @param {{ transparentBackground?: boolean, backgroundColor?: string }} [settings]
 * @returns {{ caption: number, border: number, text: number, suppressFrame: boolean }}
 */
function resolveDwmFrameColors(settings = {}) {
  const transparent = settings.transparentBackground === true;

  if (transparent) {
    return {
      caption: DWMWA_COLOR_NONE,
      border: DWMWA_COLOR_NONE,
      text: DWMWA_COLOR_NONE,
      suppressFrame: true,
    };
  }

  const solid = hexToColorRef(settings.backgroundColor ?? "#c7edcc");
  return {
    caption: solid,
    border: solid,
    text: hexToColorRef("#1a1a1a"),
    suppressFrame: false,
  };
}

/**
 * @param {import("electron").BrowserWindow | null | undefined} win
 * @param {{ transparentBackground?: boolean, backgroundColor?: string }} [settings]
 */
function applyDwmCaptionStyle(win, settings = {}) {
  if (process.platform !== "win32" || !win || win.isDestroyed()) {
    return;
  }

  const colors = resolveDwmFrameColors(settings);

  stripSystemCaptionStyles(win);
  extendFrameIntoClientArea(win);

  if (colors.suppressFrame) {
    setDwmUint32(win, DWMWA_NCRENDERING_POLICY, DWMNCRP_DISABLED);
    setDwmUint32(win, DWMWA_NCRENDERING_ENABLED, 0);
    setDwmUint32(win, DWMWA_ALLOW_NCPAINT, 0);
    setDwmUint32(win, DWMWA_SYSTEMBACKDROP_TYPE, DWMSBT_NONE);
    setDwmUint32(win, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND);
    setDwmUint32(win, DWMWA_VISIBLE_FRAME_BORDER_THICKNESS, 0);
  } else {
    setDwmUint32(win, DWMWA_NCRENDERING_POLICY, DWMNCRP_USEWINDOWSTYLE);
    setDwmUint32(win, DWMWA_NCRENDERING_ENABLED, 1);
    setDwmUint32(win, DWMWA_ALLOW_NCPAINT, 1);
  }

  setDwmUint32(win, DWMWA_CAPTION_COLOR, colors.caption);
  setDwmUint32(win, DWMWA_BORDER_COLOR, colors.border);
  setDwmUint32(win, DWMWA_TEXT_COLOR, colors.text);
}

/**
 * Force DWM / non-client chrome to repaint after focus is restored.
 * @param {import("electron").BrowserWindow} win
 * @returns {boolean}
 */
function forceRepaintWindow(win) {
  const apis = loadNativeApis();
  const handle = readNativeHandle(win);
  if (!apis || !handle) {
    return false;
  }

  try {
    apis.RedrawWindow(
      handle,
      null,
      null,
      RDW_INVALIDATE | RDW_FRAME | RDW_UPDATENOW | RDW_ALLCHILDREN,
    );
    apis.DwmFlush();
    apis.SetWindowPos(
      handle,
      null,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
    );
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  DWMWA_COLOR_NONE,
  resolveDwmFrameColors,
  applyDwmCaptionStyle,
  stripSystemCaptionStyles,
  forceRepaintWindow,
};