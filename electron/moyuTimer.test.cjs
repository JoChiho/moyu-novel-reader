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
});