import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

const visible = ref(true);

export function useWindowVisibility() {
  const win = getCurrentWindow();

  async function toggleVisibility() {
    if (visible.value) {
      await win.hide();
      visible.value = false;
    } else {
      await win.show();
      await win.setFocus();
      visible.value = true;
    }
  }

  async function show() {
    await win.show();
    await win.setFocus();
    visible.value = true;
  }

  async function hide() {
    await win.hide();
    visible.value = false;
  }

  async function setAlwaysOnTop(value: boolean) {
    await win.setAlwaysOnTop(value);
  }

  return {
    visible,
    toggleVisibility,
    show,
    hide,
    setAlwaysOnTop,
  };
}