const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  appendSession,
  calcWeekMonthCharTotals,
  calcWeekMonthTotals,
  sumPeriodChars,
  sumPeriodMs,
} = require("./moyuHistory.cjs");

describe("moyuHistory.cjs", () => {
  it("appends sessions with cap", () => {
    const first = appendSession([], {
      id: "a",
      startedAt: 1,
      endedAt: 2,
      durationMs: 1,
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].id, "a");
  });

  it("calculates week and month totals", () => {
    const now = new Date(2026, 5, 30, 15, 0, 0).getTime();
    const sessions = [
      {
        startedAt: now - 3_600_000,
        endedAt: now - 1_800_000,
        durationMs: 1_800_000,
      },
    ];

    const totals = calcWeekMonthTotals(sessions, now, now - 600_000, 600_000);
    assert.equal(totals.weekVisibleMs, 2_400_000);
    assert.equal(totals.monthVisibleMs, 2_400_000);
  });

  it("ignores sessions outside the period", () => {
    const now = 1_000_000_000_000;
    const total = sumPeriodMs(
      [{ startedAt: 1, endedAt: now - 10_000, durationMs: 5_000 }],
      now - 5_000,
      now,
      null,
      0,
    );
    assert.equal(total, 0);
  });

  it("calculates week and month char totals", () => {
    const now = new Date(2026, 5, 30, 15, 0, 0).getTime();
    const sessions = [
      {
        startedAt: now - 3_600_000,
        endedAt: now - 1_800_000,
        durationMs: 1_800_000,
        charsRead: 1_200,
      },
    ];

    const totals = calcWeekMonthCharTotals(
      sessions,
      now,
      now - 600_000,
      300,
    );
    assert.equal(totals.weekCharsRead, 1_500);
    assert.equal(totals.monthCharsRead, 1_500);
  });

  it("ignores char sessions outside the period", () => {
    const now = 1_000_000_000_000;
    const total = sumPeriodChars(
      [{ endedAt: now - 10_000, charsRead: 500 }],
      now - 5_000,
      now,
      null,
      0,
    );
    assert.equal(total, 0);
  });
});