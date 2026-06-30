/**
 * Period helpers and session aggregation for the 摸鱼计算器.
 */

const MAX_SESSIONS = 500;

/**
 * @param {number} ts
 */
function startOfMonth(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

/**
 * Week starts on Monday (local time).
 * @param {number} ts
 */
function startOfWeek(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

/**
 * @param {Array<{ endedAt: number, durationMs: number }>} sessions
 * @param {number} periodStart
 * @param {number} now
 * @param {number | null} sessionStartAt
 * @param {number} currentSessionMs
 */
function sumPeriodMs(
  sessions,
  periodStart,
  now,
  sessionStartAt,
  currentSessionMs,
) {
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

/**
 * @param {Array<{ endedAt: number, durationMs: number }>} sessions
 * @param {number} now
 * @param {number | null} sessionStartAt
 * @param {number} currentSessionMs
 */
function calcWeekMonthTotals(sessions, now, sessionStartAt, currentSessionMs) {
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  return {
    weekVisibleMs: sumPeriodMs(
      sessions,
      weekStart,
      now,
      sessionStartAt,
      currentSessionMs,
    ),
    monthVisibleMs: sumPeriodMs(
      sessions,
      monthStart,
      now,
      sessionStartAt,
      currentSessionMs,
    ),
  };
}

/**
 * @param {unknown} sessions
 * @param {{
 *   id: string,
 *   startedAt: number,
 *   endedAt: number,
 *   durationMs: number,
 * }} session
 */
function appendSession(sessions, session) {
  const list = Array.isArray(sessions) ? sessions : [];
  return [session, ...list].slice(0, MAX_SESSIONS);
}

module.exports = {
  MAX_SESSIONS,
  startOfMonth,
  startOfWeek,
  sumPeriodMs,
  calcWeekMonthTotals,
  appendSession,
};