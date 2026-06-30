const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getMoyuSnapshot,
  flushMoyuSession,
  createMoyuTimer,
} = require("./moyuTimer.cjs");

describe("moyuTimer.cjs", () => {
  it("accumulates visible session on flush", () => {
    const start = 1_000_000;
    const snap = getMoyuSnapshot(5_000, start, start + 60_000);
    assert.equal(snap.currentSessionMs, 60_000);
    assert.equal(snap.combinedVisibleMs, 65_000);

    const flushed = flushMoyuSession(5_000, start, start + 60_000);
    assert.equal(flushed.totalVisibleMs, 65_000);
    assert.equal(flushed.sessionStartAt, null);
  });

  it("pauseSession persists elapsed time", () => {
    let total = 1_000;
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getWindow: () => null,
      onTick: () => {},
    });

    const start = 2_000_000;
    const flushed = flushMoyuSession(total, start, start + 2_500);
    total = flushed.totalVisibleMs;

    assert.equal(total, 3_500);
    timer.pauseSession();
    assert.equal(getMoyuSnapshot(total, null).isRunning, false);
  });

  it("reset clears accumulated time", () => {
    let total = 12_345;
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getWindow: () => null,
      onTick: () => {},
    });

    timer.resetStats();
    assert.equal(total, 0);
  });

  it("reset disables tracking until started again", () => {
    let total = 9_000;
    let tracking = true;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getWindow: () => mockWin,
      onTick: () => {},
      getTrackingEnabled: () => tracking,
      setTrackingEnabled: (enabled) => {
        tracking = enabled;
      },
    });

    timer.startSession();
    timer.resetStats();
    assert.equal(total, 0);
    assert.equal(tracking, false);
    assert.equal(timer.getSessionStartAt(), null);

    timer.setTrackingEnabled(true);
    assert.equal(tracking, true);
    assert.notEqual(timer.getSessionStartAt(), null);
  });

  it("records ended sessions on flush", () => {
    const sessions = [];
    let total = 0;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getWindow: () => mockWin,
      onTick: () => {},
      onSessionEnd: (session) => sessions.push(session),
      minSessionMs: 0,
    });

    timer.startSession();
    timer.pauseSession();
    assert.equal(sessions.length, 1);
    assert.ok(sessions[0].durationMs >= 0);
    assert.equal(timer.getSessionStartAt(), null);
  });
});