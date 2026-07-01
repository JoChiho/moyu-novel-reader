const {
  DEFAULT_THRESHOLD,
  resolveAutoTextColor,
  sampleDesktopLuminance,
} = require("./desktopLuminance.cjs");

const SAMPLE_INTERVAL_MS = 2000;
const MOVE_DEBOUNCE_MS = 400;

/**
 * @param {{
 *   desktopCapturer: typeof import("electron").desktopCapturer,
 *   screen: typeof import("electron").screen,
 *   getWindow: () => import("electron").BrowserWindow | null,
 *   getSettings: () => { autoTextContrast?: boolean, transparentBackground?: boolean, autoTextContrastThreshold?: number },
 *   onUpdate: (payload: { luminance: number, textColor: string, suggestLightText: boolean }) => void,
 *   readerChromeHeight?: number,
 * }} deps
 */
function createLuminanceSampler(deps) {
  /** @type {ReturnType<typeof setInterval> | null} */
  let intervalTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let moveTimer = null;
  /** @type {boolean | null} */
  let lastPreferLight = null;
  let sampling = false;

  function shouldSample() {
    const settings = deps.getSettings();
    return !!(
      settings.autoTextContrast &&
      settings.transparentBackground
    );
  }

  async function runSample() {
    if (!shouldSample() || sampling) return;
    sampling = true;
    try {
      const settings = deps.getSettings();
      const captured = await sampleDesktopLuminance(
        deps.desktopCapturer,
        deps.screen,
        deps.getWindow(),
        deps.readerChromeHeight,
      );
      if (!captured) return;

      const threshold =
        settings.autoTextContrastThreshold ?? DEFAULT_THRESHOLD;
      const resolved = resolveAutoTextColor(
        captured.luminance,
        threshold,
        lastPreferLight,
      );
      lastPreferLight = resolved.suggestLightText;
      deps.onUpdate({
        luminance: Math.round(captured.luminance),
        textColor: resolved.textColor,
        suggestLightText: resolved.suggestLightText,
      });
    } finally {
      sampling = false;
    }
  }

  function scheduleMoveSample() {
    if (!shouldSample()) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      moveTimer = null;
      void runSample();
    }, MOVE_DEBOUNCE_MS);
  }

  function start() {
    if (intervalTimer) return;
    void runSample();
    intervalTimer = setInterval(() => {
      void runSample();
    }, SAMPLE_INTERVAL_MS);
  }

  function stop() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
    if (moveTimer) {
      clearTimeout(moveTimer);
      moveTimer = null;
    }
    lastPreferLight = null;
    sampling = false;
  }

  function refreshFromSettings() {
    if (shouldSample()) {
      start();
      void runSample();
    } else {
      stop();
    }
  }

  /**
   * @param {import("electron").BrowserWindow} win
   */
  function attachWindow(win) {
    win.on("show", () => {
      refreshFromSettings();
    });
    win.on("hide", stop);
    win.on("move", scheduleMoveSample);
    win.on("resize", scheduleMoveSample);
  }

  return {
    attachWindow,
    refreshFromSettings,
    runSample,
    start,
    stop,
  };
}

module.exports = { createLuminanceSampler };