/** Match a keyboard event against a configured page-turn key (single key, e.g. J or Space). */
export function matchesPageTurnKey(
  event: KeyboardEvent,
  configuredKey: string,
): boolean {
  const key = configuredKey.trim();
  if (!key) return false;

  if (key === "Space") {
    return event.key === " " || event.key === "Spacebar";
  }

  if (key.length === 1) {
    return event.key.toLowerCase() === key.toLowerCase();
  }

  return event.key === key;
}