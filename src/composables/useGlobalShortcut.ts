import {
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";

let currentShortcut: string | null = null;

export async function bindToggleShortcut(
  shortcut: string,
  handler: () => void,
): Promise<void> {
  if (currentShortcut) {
    try {
      await unregister(currentShortcut);
    } catch {
      // ignore stale registration
    }
  }

  await unregisterAll();

  if (!shortcut.trim()) {
    currentShortcut = null;
    return;
  }

  await register(shortcut, (event) => {
    if (event.state === "Pressed") handler();
  });
  currentShortcut = shortcut;
}