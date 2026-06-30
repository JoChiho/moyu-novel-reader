import { ref } from "vue";
import {
  platformSetAlwaysOnTop,
  platformToggleVisibility,
} from "../services/platform";

const visible = ref(true);

export function useWindowVisibility() {
  async function toggleVisibility() {
    await platformToggleVisibility();
    visible.value = !visible.value;
  }

  async function setAlwaysOnTop(value: boolean) {
    await platformSetAlwaysOnTop(value);
  }

  return {
    visible,
    toggleVisibility,
    setAlwaysOnTop,
  };
}