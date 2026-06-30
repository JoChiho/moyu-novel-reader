const MODIFIER_KEYS = new Set([
  "Control",
  "Alt",
  "Shift",
  "Meta",
  "OS",
]);

/** Convert KeyboardEvent to display format, e.g. "Ctrl+Z" */
export function keyboardEventToShortcut(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const key = normalizeDisplayKey(event.key, event.code);
  if (!key) return null;

  parts.push(key);
  return parts.join("+");
}

function normalizeDisplayKey(key: string, code: string): string | null {
  if (key === " " || key === "Spacebar") return "Space";
  if (key === "Backquote" || key === "`" || key === "~") return "`";
  if (key === "Escape") return null;
  if (key.length === 1) return key.toUpperCase();
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (code.startsWith("Key")) return code.slice(3).toUpperCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return code.replace("Numpad", "Num");
  return key;
}

/** Display format -> Electron globalShortcut format */
export function toElectronShortcut(shortcut: string): string {
  if (!shortcut.trim()) return "";

  return shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (["ctrl", "control", "cmd", "command"].includes(lower)) return "Control";
      if (["alt", "option"].includes(lower)) return "Alt";
      if (lower === "shift") return "Shift";
      if (["meta", "super", "win"].includes(lower)) return "Super";
      if (/^f\d{1,2}$/i.test(part)) return part.toUpperCase();
      if (part === "`" || part === "Backquote") return "`";
      if (part === "Space" || part === " ") return "Space";
      if (part.length === 1) return part.toUpperCase();
      return part;
    })
    .join("+");
}

export function isValidShortcut(shortcut: string): boolean {
  const parts = shortcut.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const modifiers = new Set(["Ctrl", "Control", "Alt", "Shift", "Meta", "Super"]);
  return parts.some((p) => modifiers.has(p) || modifiers.has(p.toLowerCase()));
}