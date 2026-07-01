export function formatCharCount(chars: number): string {
  const safe = Math.max(0, Math.round(chars) || 0);
  if (safe >= 10_000) {
    const wan = safe / 10_000;
    return `${wan >= 100 ? Math.round(wan) : wan.toFixed(1)} 万字`;
  }
  return `${safe.toLocaleString("zh-CN")} 字`;
}