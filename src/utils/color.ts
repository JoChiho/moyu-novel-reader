export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clampOpacityPercent(opacityPercent: number): number {
  return Math.min(100, Math.max(0, opacityPercent));
}

export function readerBackground(
  hex: string,
  transparentWindow: boolean,
  opacityPercent: number,
): string {
  if (transparentWindow) {
    return toRgba(hex, clampOpacityPercent(opacityPercent) / 100);
  }
  return hex;
}

export function readerTextColor(
  hex: string,
  transparentText: boolean,
  opacityPercent: number,
): string {
  if (transparentText) {
    return toRgba(hex, clampOpacityPercent(opacityPercent) / 100);
  }
  return hex;
}

export function resolveEffectiveTextColor(
  manualColor: string,
  autoColor: string | null | undefined,
  autoEnabled: boolean,
): string {
  if (autoEnabled && autoColor) return autoColor;
  return manualColor;
}