/**
 * Tracks main reader window visible time for the 摸鱼计算器 feature.
 */

/**
 * @param {number} totalVisibleMs
 * @param {number | null} sessionStartAt
 * @param {number} [now]
 */
function getMoyuSnapshot(
  totalVisibleMs,
  sessionStartAt,
  totalCharsRead,
  sessionCharsRead,
  now = Date.now(),
) {
  const safeTotal = Math.max(0, Math.round(Number(totalVisibleMs) || 0));
  const safeCharsTotal = Math.max(0, Math.round(Number(totalCharsRead) || 0));
  const safeCharsSession = Math.max(0, Math.round(Number(sessionCharsRead) || 0));
  const running = sessionStartAt != null && sessionStartAt > 0;
  const currentSessionMs = running
    ? Math.max(0, now - sessionStartAt)
    : 0;

  const activeSessionChars = running ? safeCharsSession : 0;

  return {
    totalVisibleMs: safeTotal,
    currentSessionMs,
    combinedVisibleMs: safeTotal + currentSessionMs,
    totalCharsRead: safeCharsTotal,
    currentSessionCharsRead: activeSessionChars,
    combinedCharsRead: safeCharsTotal + activeSessionChars,
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
 *   charsRead: number,
 * }} MoyuSessionRecord
 */

/**
 * @param {number | null | undefined} startOffset
 * @param {number | null | undefined} endOffset
 */
function calcSessionCharsFromOffsets(startOffset, endOffset) {
  if (startOffset == null || endOffset == null) return 0;
  const start = Math.max(0, Math.round(Number(startOffset) || 0));
  const end = Math.max(0, Math.round(Number(endOffset) || 0));
  return Math.max(0, end - start);
}

/**
 * @param {{
 *   getTotalMs: () => number,
 *   setTotalMs: (ms: number) => void,
 *   getTotalCharsRead?: () => number,
 *   setTotalCharsRead?: (chars: number) => void,
 *   getSessionCharOffset?: () => number | null,
 *   fetchSessionCharOffset?: () => Promise<number | null>,
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
  /** @type {number | null} */
  let sessionStartCharOffset = null;
  /** @type {NodeJS.Timeout | null} */
  let tickTimer = null;
  let suspended = false;
  let sessionCharsRead = 0;
  const minSessionMs = Math.max(0, deps.minSessionMs ?? 1000);
  const usesAsyncCharBoundary = typeof deps.fetchSessionCharOffset === "function";

  function resolveSessionCharOffset() {
    const raw = deps.getSessionCharOffset?.();
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    return Math.max(0, Math.round(Number(raw)));
  }

  async function readSessionCharOffset() {
    if (deps.fetchSessionCharOffset) {
      const fetched = await deps.fetchSessionCharOffset();
      if (fetched == null || !Number.isFinite(Number(fetched))) return null;
      return Math.max(0, Math.round(Number(fetched)));
    }
    return resolveSessionCharOffset();
  }

  function getCharsTotal() {
    return deps.getTotalCharsRead ? deps.getTotalCharsRead() : 0;
  }

  function recordEndedSession(startedAt, endedAt, charsRead) {
    if (!startedAt || !deps.onSessionEnd) return;
    const durationMs = Math.max(0, endedAt - startedAt);
    if (durationMs < minSessionMs) return;
    deps.onSessionEnd({
      startedAt,
      endedAt,
      durationMs,
      charsRead: Math.max(0, Math.round(charsRead) || 0),
    });
  }

  function snapshot(now = Date.now()) {
    return getMoyuSnapshot(
      deps.getTotalMs(),
      sessionStartAt,
      getCharsTotal(),
      0,
      now,
    );
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

  function flushSessionChars() {
    const chars = Math.max(0, Math.round(sessionCharsRead) || 0);
    sessionCharsRead = 0;
    if (chars > 0 && deps.setTotalCharsRead) {
      deps.setTotalCharsRead(getCharsTotal() + chars);
    }
    return chars;
  }

  function flushTimeSession(now = Date.now()) {
    const startedAt = sessionStartAt;
    const charsRead = flushSessionChars();
    const next = flushMoyuSession(deps.getTotalMs(), sessionStartAt, now);
    sessionStartAt = next.sessionStartAt;
    deps.setTotalMs(next.totalVisibleMs);
    if (startedAt) {
      recordEndedSession(startedAt, now, charsRead);
    }
    return snapshot(now);
  }

  async function finalizeSessionCharsAtBoundary() {
    if (!sessionStartAt) return;
    const end = await readSessionCharOffset();
    sessionCharsRead = calcSessionCharsFromOffsets(sessionStartCharOffset, end);
    sessionStartCharOffset = null;
  }

  function finalizeSessionCharsSync() {
    if (!sessionStartAt) return;
    sessionCharsRead = calcSessionCharsFromOffsets(
      sessionStartCharOffset,
      resolveSessionCharOffset(),
    );
    sessionStartCharOffset = null;
  }

  function isTrackingEnabled() {
    return deps.getTrackingEnabled ? deps.getTrackingEnabled() : true;
  }

  function canRun() {
    if (suspended || !isTrackingEnabled()) return false;
    const win = deps.getWindow();
    return !!(win && !win.isDestroyed() && win.isVisible());
  }

  function beginSessionSync() {
    if (!canRun() || sessionStartAt) return;
    sessionStartAt = Date.now();
    sessionCharsRead = 0;
    sessionStartCharOffset = resolveSessionCharOffset();
    startTick();
    emitTick();
  }

  async function beginSession() {
    if (!canRun() || sessionStartAt) return;
    sessionStartAt = Date.now();
    sessionCharsRead = 0;
    sessionStartCharOffset = await readSessionCharOffset();
    startTick();
    emitTick();
  }

  function startSession() {
    if (usesAsyncCharBoundary) {
      void beginSession();
      return;
    }
    beginSessionSync();
  }

  function pauseSessionSync() {
    finalizeSessionCharsSync();
    const snap = flushTimeSession();
    stopTick();
    emitTick();
    return snap;
  }

  async function pauseSessionAsync() {
    await finalizeSessionCharsAtBoundary();
    const snap = flushTimeSession();
    stopTick();
    emitTick();
    return snap;
  }

  function pauseSession() {
    if (usesAsyncCharBoundary) {
      void pauseSessionAsync();
      return;
    }
    return pauseSessionSync();
  }

  async function setTrackingEnabledAsync(enabled) {
    const next = !!enabled;
    deps.setTrackingEnabled?.(next);
    if (next) {
      await beginSession();
    } else {
      await pauseSessionAsync();
    }
    emitTick();
  }

  function setTrackingEnabled(enabled) {
    if (usesAsyncCharBoundary) {
      void setTrackingEnabledAsync(enabled);
      return;
    }
    const next = !!enabled;
    deps.setTrackingEnabled?.(next);
    if (next) {
      beginSessionSync();
    } else {
      pauseSessionSync();
    }
    emitTick();
  }

  function resetStatsSync() {
    pauseSessionSync();
    deps.setTotalMs(0);
    deps.setTotalCharsRead?.(0);
    sessionCharsRead = 0;
    sessionStartCharOffset = null;
    deps.setTrackingEnabled?.(false);
    emitTick();
  }

  async function resetStatsAsync() {
    await pauseSessionAsync();
    deps.setTotalMs(0);
    deps.setTotalCharsRead?.(0);
    sessionCharsRead = 0;
    sessionStartCharOffset = null;
    deps.setTrackingEnabled?.(false);
    emitTick();
  }

  function resetStats() {
    if (usesAsyncCharBoundary) {
      void resetStatsAsync();
      return;
    }
    resetStatsSync();
  }

  function getSessionStartAt() {
    return sessionStartAt;
  }

  function getSessionCharsRead() {
    return sessionCharsRead;
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
    flush: flushTimeSession,
    resetStats,
    setTrackingEnabled,
    isTrackingEnabled,
    onPowerSuspend,
    onPowerResume,
    snapshot,
    getSessionStartAt,
    getSessionCharsRead,
    getSessionStartCharOffset: () => sessionStartCharOffset,
    stopTick,
  };
}

module.exports = {
  getMoyuSnapshot,
  flushMoyuSession,
  calcSessionCharsFromOffsets,
  createMoyuTimer,
};