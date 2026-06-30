/** @typedef {{ success: boolean; electronShortcut?: string; error?: string }} RegisterResult */

/**
 * @param {string} shortcut
 * @returns {string}
 */
function toElectronShortcut(shortcut) {
  if (!shortcut || !shortcut.trim()) return "";

  return shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ctrl" || lower === "control" || lower === "cmd" || lower === "command") {
        return "Control";
      }
      if (lower === "alt" || lower === "option") return "Alt";
      if (lower === "shift") return "Shift";
      if (lower === "meta" || lower === "super" || lower === "win") return "Super";
      if (/^f\d{1,2}$/i.test(part)) return part.toUpperCase();
      if (part === "`" || part === "Backquote") return "`";
      if (part === "Space" || part === " ") return "Space";
      if (part.length === 1) return part.toUpperCase();
      return part;
    })
    .join("+");
}

/**
 * @param {import("electron").GlobalShortcut} globalShortcut
 * @param {string | null} current
 * @param {string} nextDisplayShortcut
 * @param {() => void} handler
 * @returns {RegisterResult}
 */
function registerGlobalShortcut(globalShortcut, current, nextDisplayShortcut, handler) {
  if (current) {
    try {
      globalShortcut.unregister(current);
    } catch {
      /* ignore */
    }
  }

  const electronShortcut = toElectronShortcut(nextDisplayShortcut);
  if (!electronShortcut) {
    return { success: true, electronShortcut: "" };
  }

  const ok = globalShortcut.register(electronShortcut, handler);
  if (!ok) {
    return {
      success: false,
      electronShortcut,
      error: `无法注册快捷键: ${nextDisplayShortcut}`,
    };
  }

  return { success: true, electronShortcut };
}

module.exports = { toElectronShortcut, registerGlobalShortcut };