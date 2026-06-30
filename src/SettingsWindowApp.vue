<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { bindToggleShortcut } from "./composables/useGlobalShortcut";
import {
  loadAppState,
  updateBookProgress,
  updateSettings,
} from "./services/storage";
import {
  platformProbeGlobalShortcut,
  platformSetAlwaysOnTop,
  platformSetTransparent,
} from "./services/platform";
import { getPageKeyConflicts } from "./utils/shortcutConflict";
import type { AppState } from "./types";

const appState = ref<AppState | null>(null);
const shortcutError = ref("");
let unsubscribe: (() => void) | null = null;

async function refreshState() {
  appState.value = await loadAppState();
}

async function applyWindowSettings() {
  if (!appState.value) return;
  const s = appState.value.settings;
  await platformSetAlwaysOnTop(s.alwaysOnTop);
  await platformSetTransparent(s.transparentBackground);
}

async function bootstrap() {
  await refreshState();
  await applyWindowSettings();
  if (appState.value) {
    const result = await bindToggleShortcut(
      appState.value.settings.toggleVisibilityShortcut,
    );
    if (!result.success) {
      shortcutError.value = result.error ?? "快捷键注册失败";
    }
  }
}

async function handleSettingsPatch(patch: Partial<AppState["settings"]>) {
  if (!appState.value) return;

  const merged = { ...appState.value.settings, ...patch };
  const pageIssues = getPageKeyConflicts(merged);
  if (pageIssues.length) {
    shortcutError.value = pageIssues.join("；");
    return;
  }

  if (patch.toggleVisibilityShortcut !== undefined) {
    const probe = await platformProbeGlobalShortcut(
      patch.toggleVisibilityShortcut,
    );
    if (!probe.available) {
      shortcutError.value = probe.error ?? "快捷键已被占用";
      return;
    }
  }

  shortcutError.value = "";
  appState.value = await updateSettings(patch, appState.value);
  if (
    patch.alwaysOnTop !== undefined ||
    patch.transparentBackground !== undefined ||
    patch.backgroundColor !== undefined ||
    patch.backgroundOpacity !== undefined
  ) {
    await applyWindowSettings();
  }
  if (patch.toggleVisibilityShortcut !== undefined) {
    const result = await bindToggleShortcut(patch.toggleVisibilityShortcut);
    shortcutError.value = result.success
      ? ""
      : (result.error ?? "快捷键注册失败");
  }
}

async function handleJumpProgress(offset: number) {
  if (!appState.value?.lastBookId) return;
  const book = appState.value.books.find((b) => b.id === appState.value?.lastBookId);
  if (!book) return;
  appState.value = await updateBookProgress(
    book.id,
    offset,
    appState.value,
  );
}

const activeBook = () =>
  appState.value?.books.find((b) => b.id === appState.value?.lastBookId) ?? null;

onMounted(() => {
  void bootstrap();
  unsubscribe = window.moyu?.onAppStateUpdated(() => {
    void refreshState();
  }) ?? null;
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <div v-if="appState" class="child-window-app">
    <SettingsPanel
      :settings="appState.settings"
      :shortcut-error="shortcutError"
      :progress-offset="activeBook()?.charOffset ?? 0"
      :progress-total="activeBook()?.totalChars || undefined"
      @update:settings="handleSettingsPatch"
      @jump-progress="handleJumpProgress"
    />
  </div>
</template>