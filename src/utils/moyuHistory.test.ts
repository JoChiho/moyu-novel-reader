import { describe, expect, it } from "vitest";
import { startOfMonth, startOfWeek, sumPeriodMs } from "./moyuHistory";

describe("moyuHistory", () => {
  it("sums sessions within the current week", () => {
    const now = new Date(2026, 5, 30, 15, 0, 0).getTime();
    const weekStart = startOfWeek(now);

    const total = sumPeriodMs(
      [
        {
          startedAt: weekStart + 3_600_000,
          endedAt: weekStart + 7_200_000,
          durationMs: 3_600_000,
        },
        {
          startedAt: weekStart - 86_400_000,
          endedAt: weekStart - 43_200_000,
          durationMs: 43_200_000,
        },
      ],
      weekStart,
      now,
      null,
      0,
    );

    expect(total).toBe(3_600_000);
  });

  it("includes the running session portion since week start", () => {
    const now = new Date(2026, 5, 30, 15, 0, 0).getTime();
    const weekStart = startOfWeek(now);
    const sessionStartAt = weekStart + 1_800_000;

    const total = sumPeriodMs([], weekStart, now, sessionStartAt, 900_000);

    expect(total).toBe(900_000);
  });

  it("computes month boundaries", () => {
    const ts = new Date(2026, 5, 15, 12, 0, 0).getTime();
    expect(startOfMonth(ts)).toBe(new Date(2026, 5, 1).getTime());
    expect(startOfWeek(ts)).toBe(new Date(2026, 5, 15).getTime());
  });
});