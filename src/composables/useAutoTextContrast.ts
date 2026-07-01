import { onUnmounted, ref, watch, type Ref } from "vue";
import { platformOnDesktopLuminanceUpdated } from "../services/platform";
import type { DesktopLuminancePayload, ReaderSettings } from "../types";

export function useAutoTextContrast(
  settings: Ref<ReaderSettings | undefined>,
) {
  const autoTextColor = ref<string | null>(null);
  const luminancePreview = ref<DesktopLuminancePayload | null>(null);

  let unsubscribe: (() => void) | null = null;

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    autoTextColor.value = null;
    luminancePreview.value = null;
  }

  function startListening() {
    stopListening();
    unsubscribe = platformOnDesktopLuminanceUpdated((payload) => {
      autoTextColor.value = payload.textColor;
      luminancePreview.value = payload;
    });
  }

  watch(
    () => [
      settings.value?.autoTextContrast,
      settings.value?.transparentBackground,
    ] as const,
    ([auto, transparent]) => {
      if (auto && transparent) {
        startListening();
      } else {
        stopListening();
      }
    },
    { immediate: true },
  );

  onUnmounted(stopListening);

  return { autoTextColor, luminancePreview };
}