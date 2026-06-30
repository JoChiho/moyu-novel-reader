import type { ShortcutBindResult } from "../types/electron";
import { platformBindToggleShortcut } from "../services/platform";

export async function bindToggleShortcut(
  shortcut: string,
): Promise<ShortcutBindResult> {
  return platformBindToggleShortcut(shortcut);
}