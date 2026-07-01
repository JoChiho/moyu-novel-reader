<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import MoyuStatsPanel from "./components/MoyuStatsPanel.vue";
import { loadAppState, updateSettings } from "./services/storage";
import type { AppState, ReaderSettings } from "./types";

const appState = ref<AppState | null>(null);
const saveError = ref("");

let saveTimer: number | null = null;
let pendingPatch: Partial<ReaderSettings> = {};
let saving = false;

async function refreshState() {
  appState.value = await loadAppState();
}

async function flushSettingsSave() {
  if (!appState.value || saving || !Object.keys(pendingPatch).length) return;

  const patch = pendingPatch;
  pendingPatch = {};
  const base = appState.value;
  saving = true;

  try {
    saveError.value = "";
    appState.value = await updateSettings(patch, base);
  } catch (err) {
    appState.value = base;
    saveError.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving = false;
    if (Object.keys(pendingPatch).length) {
      void flushSettingsSave();
    }
  }
}

function handleSettingsPatch(patch: Partial<ReaderSettings>) {
  if (!appState.value) return;

  appState.value = {
    ...appState.value,
    settings: { ...appState.value.settings, ...patch },
  };
  pendingPatch = { ...pendingPatch, ...patch };

  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    void flushSettingsSave();
  }, 250);
}

onMounted(() => {
  void refreshState();
});

onUnmounted(() => {
  if (saveTimer) window.clearTimeout(saveTimer);
  void flushSettingsSave();
});
</script>

<template>
  <div v-if="appState" class="child-window-app">
    <p v-if="saveError" class="error">{{ saveError }}</p>
    <MoyuStatsPanel
      :settings="appState.settings"
      @update:settings="handleSettingsPatch"
    />
  </div>
</template>