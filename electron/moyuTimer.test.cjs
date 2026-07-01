const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getMoyuSnapshot,
  flushMoyuSession,
  calcSessionCharsFromOffsets,
  createMoyuTimer,
} = require("./moyuTimer.cjs");

describe("moyuTimer.cjs", () => {
  it("accumulates visible session on flush", () => {
    const start = 1_000_000;
    const snap = getMoyuSnapshot(5_000, start, 0, 0, start + 60_000);
    assert.equal(snap.currentSessionMs, 60_000);
    assert.equal(snap.combinedVisibleMs, 65_000);

    const flushed = flushMoyuSession(5_000, start, start + 60_000);
    assert.equal(flushed.totalVisibleMs, 65_000);
    assert.equal(flushed.sessionStartAt, null);
  });

  it("includes char counts in snapshot", () => {
    const snap = getMoyuSnapshot(1_000, null, 5_000, 200);
    assert.equal(snap.totalCharsRead, 5_000);
    assert.equal(snap.currentSessionCharsRead, 0);
    assert.equal(snap.combinedCharsRead, 5_000);

    const running = getMoyuSnapshot(1_000, 100, 5_000, 200);
    assert.equal(running.currentSessionCharsRead, 200);
    assert.equal(running.combinedCharsRead, 5_200);
  });

  it("calcSessionCharsFromOffsets uses start and end positions", () => {
    assert.equal(calcSessionCharsFromOffsets(1_000, 1_450), 450);
    assert.equal(calcSessionCharsFromOffsets(1_000, 800), 0);
    assert.equal(calcSessionCharsFromOffsets(null, 100), 0);
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
    assert.equal(getMoyuSnapshot(total, null, 0, 0).isRunning, false);
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

  it("does not show in-progress chars in snapshot", () => {
    let readerOffset = 1_000;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => 0,
      setTotalMs: () => {},
      getTotalCharsRead: () => 0,
      getSessionCharOffset: () => readerOffset,
      getWindow: () => mockWin,
      onTick: () => {},
      minSessionMs: 0,
    });

    timer.startSession();
    readerOffset = 5_000;
    const snap = timer.snapshot();
    assert.equal(snap.currentSessionCharsRead, 0);
    assert.equal(snap.combinedCharsRead, 0);
  });

  it("finalizes session chars from offsets on pause", () => {
    let total = 0;
    let totalChars = 0;
    let readerOffset = 1_000;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getTotalCharsRead: () => totalChars,
      setTotalCharsRead: (chars) => {
        totalChars = chars;
      },
      getSessionCharOffset: () => readerOffset,
      getWindow: () => mockWin,
      onTick: () => {},
      minSessionMs: 0,
    });

    timer.startSession();
    assert.equal(timer.getSessionStartCharOffset(), 1_000);

    readerOffset = 1_450;
    timer.pauseSession();
    assert.equal(totalChars, 450);
    assert.equal(timer.getSessionStartCharOffset(), null);
  });

  it("ignores backward navigation when session ends", () => {
    let totalChars = 0;
    let readerOffset = 2_000;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => 0,
      setTotalMs: () => {},
      getTotalCharsRead: () => totalChars,
      setTotalCharsRead: (chars) => {
        totalChars = chars;
      },
      getSessionCharOffset: () => readerOffset,
      getWindow: () => mockWin,
      onTick: () => {},
      minSessionMs: 0,
    });

    timer.startSession();
    readerOffset = 1_500;
    timer.pauseSession();
    assert.equal(totalChars, 0);
  });

  it("records ended sessions on flush", () => {
    const sessions = [];
    let total = 0;
    let readerOffset = 500;
    const mockWin = {
      isDestroyed: () => false,
      isVisible: () => true,
    };
    const timer = createMoyuTimer({
      getTotalMs: () => total,
      setTotalMs: (ms) => {
        total = ms;
      },
      getSessionCharOffset: () => readerOffset,
      getWindow: () => mockWin,
      onTick: () => {},
      onSessionEnd: (session) => sessions.push(session),
      minSessionMs: 0,
    });

    timer.startSession();
    readerOffset = 820;
    timer.pauseSession();
    assert.equal(sessions.length, 1);
    assert.ok(sessions[0].durationMs >= 0);
    assert.equal(sessions[0].charsRead, 320);
    assert.equal(timer.getSessionStartAt(), null);
  });
});