<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import BookshelfPanel from "./components/BookshelfPanel.vue";
import { pickAndReadBook } from "./services/bookImport";
import {
  loadAppState,
  removeBook,
  upsertBook,
} from "./services/storage";
import { platformShelfOpenBook } from "./services/platform";
import type { AppState } from "./types";

const appState = ref<AppState | null>(null);
const toastMessage = ref("");
let unsubscribe: (() => void) | null = null;

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => {
    if (toastMessage.value === message) toastMessage.value = "";
  }, 3000);
}

async function refreshState() {
  appState.value = await loadAppState();
}

function bookReadOptions() {
  const settings = appState.value?.settings;
  return {
    encoding: settings?.textEncoding ?? "auto",
    collapseBlankLines: settings?.collapseBlankLines !== false,
  };
}

async function handleImport() {
  try {
    const result = await pickAndReadBook(bookReadOptions());
    if (!result || !appState.value) return;
    const { book } = result;
    appState.value = await upsertBook(book, appState.value);
    showToast(`已导入：${book.title}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : "导入失败");
  }
}

async function handleSelectBook(id: string) {
  await platformShelfOpenBook(id);
}

async function handleRemoveBook(id: string) {
  if (!appState.value) return;
  appState.value = await removeBook(id, appState.value);
}

onMounted(() => {
  void refreshState();
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
    <BookshelfPanel
      :books="appState.books"
      :active-book-id="appState.lastBookId"
      @select-book="handleSelectBook"
      @remove-book="handleRemoveBook"
      @import-book="handleImport"
    />
    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
  </div>
</template>