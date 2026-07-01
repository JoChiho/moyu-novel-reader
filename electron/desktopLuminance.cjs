const DARK_TEXT = "#1a1a1a";
const LIGHT_TEXT = "#f5f5f5";
const DEFAULT_THRESHOLD = 128;
const HYSTERESIS = 12;
const SAMPLE_GRID = 5;

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function calcRelativeLuminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * @param {number} luminance
 * @param {number} [threshold]
 * @param {boolean | null} [preferLightText]
 */
function resolveAutoTextColor(
  luminance,
  threshold = DEFAULT_THRESHOLD,
  preferLightText = null,
) {
  const safe = Math.max(0, Math.min(255, Number(luminance) || 0));
  const t = Math.max(0, Math.min(255, Number(threshold) || DEFAULT_THRESHOLD));

  if (preferLightText === true) {
    if (safe > t + HYSTERESIS) {
      return { textColor: DARK_TEXT, suggestLightText: false };
    }
    return { textColor: LIGHT_TEXT, suggestLightText: true };
  }

  if (preferLightText === false) {
    if (safe < t - HYSTERESIS) {
      return { textColor: LIGHT_TEXT, suggestLightText: true };
    }
    return { textColor: DARK_TEXT, suggestLightText: false };
  }

  if (safe < t) {
    return { textColor: LIGHT_TEXT, suggestLightText: true };
  }
  return { textColor: DARK_TEXT, suggestLightText: false };
}

/**
 * @param {Buffer} bitmap
 * @param {number} imgW
 * @param {number} imgH
 * @param {number} x
 * @param {number} y
 */
function readBitmapPixel(bitmap, imgW, imgH, x, y) {
  const px = Math.max(0, Math.min(imgW - 1, Math.round(x)));
  const py = Math.max(0, Math.min(imgH - 1, Math.round(y)));
  const idx = (py * imgW + px) * 4;
  return {
    b: bitmap[idx] ?? 0,
    g: bitmap[idx + 1] ?? 0,
    r: bitmap[idx + 2] ?? 0,
  };
}

/**
 * @param {import("electron").NativeImage} image
 * @param {import("electron").Rectangle} region
 */
function averageRegionLuminance(image, region) {
  const { width: imgW, height: imgH } = image.getSize();
  if (!imgW || !imgH) return null;

  const bitmap = image.getBitmap();
  const left = Math.max(0, region.x);
  const top = Math.max(0, region.y);
  const right = Math.min(imgW, region.x + region.width);
  const bottom = Math.min(imgH, region.y + region.height);
  if (right <= left || bottom <= top) return null;

  const stepX = Math.max(1, Math.floor((right - left) / SAMPLE_GRID));
  const stepY = Math.max(1, Math.floor((bottom - top) / SAMPLE_GRID));

  let total = 0;
  let count = 0;

  for (let y = top; y < bottom; y += stepY) {
    for (let x = left; x < right; x += stepX) {
      const { r, g, b } = readBitmapPixel(bitmap, imgW, imgH, x, y);
      total += calcRelativeLuminance(r, g, b);
      count += 1;
    }
  }

  return count ? total / count : null;
}

/**
 * @param {typeof import("electron").desktopCapturer} desktopCapturer
 * @param {typeof import("electron").screen} screen
 * @param {import("electron").BrowserWindow | null} window
 * @param {number} [readerChromeHeight]
 */
async function sampleDesktopLuminance(
  desktopCapturer,
  screen,
  window,
  readerChromeHeight = 40,
) {
  if (!window || window.isDestroyed() || !window.isVisible()) {
    return null;
  }

  const bounds = window.getBounds();
  const sampleX = bounds.x + Math.floor(bounds.width / 2);
  const sampleY =
    bounds.y +
    readerChromeHeight +
    Math.floor(Math.max(20, bounds.height - readerChromeHeight) / 2);

  const display = screen.getDisplayNearestPoint({ x: sampleX, y: sampleY });
  const displayBounds = display.bounds;
  const scale = display.scaleFactor || 1;
  const thumbW = Math.min(Math.round(displayBounds.width * scale), 3840);
  const thumbH = Math.min(Math.round(displayBounds.height * scale), 2160);

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: thumbW, height: thumbH },
  });
  if (!sources.length) return null;

  const source =
    sources.find((item) => item.display_id === String(display.id)) ??
    sources.find((item) => item.id.startsWith("screen:")) ??
    sources[0];

  const image = source.thumbnail;
  if (!image || image.isEmpty()) return null;

  const { width: imgW, height: imgH } = image.getSize();
  const relLeft = (bounds.x - displayBounds.x) / displayBounds.width;
  const relTop = (bounds.y - displayBounds.y) / displayBounds.height;
  const relRight = (bounds.x + bounds.width - displayBounds.x) / displayBounds.width;
  const relBottom = (bounds.y + bounds.height - displayBounds.y) / displayBounds.height;

  const chromeRatio = bounds.height > 0 ? readerChromeHeight / bounds.height : 0;
  const region = {
    x: relLeft * imgW,
    y: (relTop + (relBottom - relTop) * chromeRatio) * imgH,
    width: Math.max(8, (relRight - relLeft) * imgW),
    height: Math.max(8, (relBottom - relTop) * (1 - chromeRatio) * imgH),
  };

  const luminance = averageRegionLuminance(image, region);
  if (luminance == null) return null;

  return { luminance, displayId: display.id };
}

module.exports = {
  DARK_TEXT,
  LIGHT_TEXT,
  DEFAULT_THRESHOLD,
  HYSTERESIS,
  calcRelativeLuminance,
  resolveAutoTextColor,
  sampleDesktopLuminance,
};