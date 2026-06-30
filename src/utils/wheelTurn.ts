let lastWheelTurnAt = 0;

/** Debounce wheel paging across renderer + main-process IPC paths. */
export function consumeWheelTurn(): boolean {
  const now = Date.now();
  if (now - lastWheelTurnAt < 120) return false;
  lastWheelTurnAt = now;
  return true;
}