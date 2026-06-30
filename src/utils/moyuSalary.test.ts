import { describe, expect, it } from "vitest";
import {
  calcHourlyRate,
  calcSalaryAmount,
  formatClockDuration,
  formatLongDuration,
  formatMoneyYuan,
} from "./moyuSalary";

describe("moyuSalary", () => {
  it("computes hourly rate from monthly salary", () => {
    const rate = calcHourlyRate({
      salaryEnabled: true,
      salaryMonthly: 22_000,
      salaryWorkDaysPerMonth: 22,
      salaryHoursPerDay: 8,
    });
    expect(rate).toBe(125);
  });

  it("computes salary amount for elapsed ms", () => {
    const amount = calcSalaryAmount(3_600_000, 125);
    expect(amount).toBe(125);
  });

  it("formats clock and long duration", () => {
    expect(formatClockDuration(3_661_000)).toBe("01:01:01");
    expect(formatLongDuration(90_060_000)).toContain("天");
  });

  it("formats money", () => {
    expect(formatMoneyYuan(125.5)).toBe("¥125.50");
  });
});