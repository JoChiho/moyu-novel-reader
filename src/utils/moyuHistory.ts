export interface MoyuSessionLike {
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

/** Week starts on Monday (local time). */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

export function sumPeriodMs(
  sessions: MoyuSessionLike[],
  periodStart: number,
  now: number,
  sessionStartAt: number | null,
  currentSessionMs: number,
): number {
  let total = 0;

  for (const session of sessions) {
    if (session.endedAt >= periodStart && session.endedAt <= now) {
      total += Math.max(0, Math.round(session.durationMs) || 0);
    }
  }

  if (sessionStartAt && currentSessionMs > 0) {
    const effectiveStart = Math.max(sessionStartAt, periodStart);
    if (effectiveStart < now) {
      total += Math.min(
        Math.max(0, Math.round(currentSessionMs) || 0),
        now - effectiveStart,
      );
    }
  }

  return total;
}

export function formatSessionRange(startedAt: number, endedAt: number): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const dateFmt = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (sameDay) {
    return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }

  return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}