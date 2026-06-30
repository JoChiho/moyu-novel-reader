export interface SalarySettings {
  salaryEnabled: boolean;
  salaryMonthly: number;
  salaryWorkDaysPerMonth: number;
  salaryHoursPerDay: number;
}

export function calcHourlyRate(settings: SalarySettings): number {
  if (!settings.salaryEnabled || settings.salaryMonthly <= 0) return 0;
  const days = Math.max(1, settings.salaryWorkDaysPerMonth);
  const hours = Math.max(1, settings.salaryHoursPerDay);
  return settings.salaryMonthly / (days * hours);
}

export function calcSalaryAmount(ms: number, hourlyRate: number): number {
  if (!hourlyRate || ms <= 0) return 0;
  return (ms / 3_600_000) * hourlyRate;
}

export function formatClockDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatLongDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} 分钟`);
  return parts.join(" ");
}

export function formatMoneyYuan(amount: number): string {
  if (amount <= 0) return "¥0.00";
  return `¥${amount.toFixed(2)}`;
}