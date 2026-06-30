/**
 * Tracks main reader window visible time for the 摸鱼计算器 feature.
 */

/**
 * @param {number} totalVisibleMs
 * @param {number | null} sessionStartAt
 * @param {number} [now]
 */
function getMoyuSnapshot(totalVisibleMs, sessionStartAt, now = Date.now()) {
  const safeTotal = Math.max(0, Math.round(Number(totalVisibleMs) || 0));
  const running = sessionStartAt != null && sessionStartAt > 0;
  const currentSessionMs = running
    ? Math.max(0, now - sessionStartAt)
    : 0;

  return {
    totalVisibleMs: safeTotal,
    currentSessionMs,
    combinedVisibleMs: safeTotal + currentSessionMs,
    isRunning: running,
  };
}

/**
 * @param {number} totalVisibleMs
 * @param {number | null} sessionStartAt
 * @param {number} [now]
 * @returns {{ totalVisibleMs: number, sessionStartAt: null }}
 */
function flushMoyuSession(totalVisibleMs, sessionStartAt, now = Date.now()) {
  if (!sessionStartAt) {
    return { totalVisibleMs: Math.max(0, Math.round(totalVisibleMs) || 0), sessionStartAt: null };
  }
  const delta = Math.max(0, now - sessionStartAt);
  return {
    totalVisibleMs: Math.max(0, Math.round(totalVisibleMs) || 0) + delta,
    sessionStartAt: null,
  };
}

/**
 * @typedef {{
 *   startedAt: number,
 *   endedAt: number,
 *   durationMs: number,
 * }} MoyuSessionRecord
 */

/**
 * @param {{
 *   getTotalMs: () => number,
 *   setTotalMs: (ms: number) => void,
 *   getWindow: () => import("electron").BrowserWindow | null,
 *   onTick: (snapshot: ReturnType<typeof getMoyuSnapshot>) => void,
 *   onSessionEnd?: (session: MoyuSessionRecord) => void,
 *   minSessionMs?: number,
 *   getTrackingEnabled?: () => boolean,
 *   setTrackingEnabled?: (enabled: boolean) => void,
 * }} deps
 */
function createMoyuTimer(deps) {
  /** @type {number | null} */
  let sessionStartAt = null;
  /** @type {NodeJS.Timeout | null} */
  let tickTimer = null;
  let suspended = false;
  const minSessionMs = Math.max(0, deps.minSessionMs ?? 1000);

  function recordEndedSession(startedAt, endedAt) {
    if (!startedAt || !deps.onSessionEnd) return;
    const durationMs = Math.max(0, endedAt - startedAt);
    if (durationMs < minSessionMs) return;
    deps.onSessionEnd({ startedAt, endedAt, durationMs });
  }

  function snapshot(now = Date.now()) {
    return getMoyuSnapshot(deps.getTotalMs(), sessionStartAt, now);
  }

  function emitTick() {
    deps.onTick(snapshot());
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(() => emitTick(), 1000);
  }

  function flush(now = Date.now()) {
    const startedAt = sessionStartAt;
    const next = flushMoyuSession(deps.getTotalMs(), sessionStartAt, now);
    sessionStartAt = next.sessionStartAt;
    deps.setTotalMs(next.totalVisibleMs);
    if (startedAt) {
      recordEndedSession(startedAt, now);
    }
    return snapshot(now);
  }

  function isTrackingEnabled() {
    return deps.getTrackingEnabled ? deps.getTrackingEnabled() : true;
  }

  function canRun() {
    if (suspended || !isTrackingEnabled()) return false;
    const win = deps.getWindow();
    return !!(win && !win.isDestroyed() && win.isVisible());
  }

  function startSession() {
    if (!canRun() || sessionStartAt) return;
    sessionStartAt = Date.now();
    startTick();
    emitTick();
  }

  function setTrackingEnabled(enabled) {
    const next = !!enabled;
    deps.setTrackingEnabled?.(next);
    if (next) {
      startSession();
    } else {
      pauseSession();
    }
    emitTick();
  }

  function pauseSession() {
    const snap = flush();
    stopTick();
    emitTick();
    return snap;
  }

  function resetStats() {
    pauseSession();
    deps.setTotalMs(0);
    deps.setTrackingEnabled?.(false);
    emitTick();
  }

  function getSessionStartAt() {
    return sessionStartAt;
  }

  function onPowerSuspend() {
    suspended = true;
    pauseSession();
  }

  function onPowerResume() {
    suspended = false;
    startSession();
  }

  /**
   * @param {import("electron").BrowserWindow} win
   */
  function attachWindow(win) {
    win.on("show", startSession);
    win.on("hide", pauseSession);
    win.on("close", pauseSession);
    if (win.isVisible()) {
      startSession();
    }
  }

  return {
    attachWindow,
    startSession,
    pauseSession,
    flush,
    resetStats,
    setTrackingEnabled,
    isTrackingEnabled,
    onPowerSuspend,
    onPowerResume,
    snapshot,
    getSessionStartAt,
    stopTick,
  };
}

module.exports = {
  getMoyuSnapshot,
  flushMoyuSession,
  createMoyuTimer,
};