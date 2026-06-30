<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import NavigatorPanel from "./components/NavigatorPanel.vue";
import {
  addBookmark,
  loadAppState,
  removeBookmark,
} from "./services/storage";
import {
  platformNavigatorJump,
  platformOnAppStateUpdated,
} from "./services/platform";
import type { AppState } from "./types";

const appState = ref<AppState | null>(null);
const chapterQuery = ref("");
let unsubscribe: (() => void) | null = null;

const activeBook = computed(() => {
  if (!appState.value?.lastBookId) return null;
  return appState.value.books.find((b) => b.id === appState.value?.lastBookId) ?? null;
});

async function refreshState() {
  appState.value = await loadAppState();
}

async function handleJump(offset: number) {
  await platformNavigatorJump(offset);
}

async function handleAddBookmark(label: string) {
  if (!appState.value || !activeBook.value) return;
  appState.value = await addBookmark(
    activeBook.value.id,
    activeBook.value.charOffset,
    label,
    appState.value,
  );
}

async function handleRemoveBookmark(id: string) {
  if (!appState.value || !activeBook.value) return;
  appState.value = await removeBookmark(
    activeBook.value.id,
    id,
    appState.value,
  );
}

onMounted(() => {
  void refreshState();
  unsubscribe = platformOnAppStateUpdated(() => {
    void refreshState();
  }) ?? null;
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <div v-if="appState" class="child-window-app">
    <div class="shelf-toolbar">
      <input
        v-model="chapterQuery"
        type="search"
        placeholder="搜索章节…"
        class="shelf-search"
      />
    </div>
    <NavigatorPanel
      :book="activeBook"
      :search-query="chapterQuery"
      @jump="handleJump"
      @add-bookmark="handleAddBookmark"
      @remove-bookmark="handleRemoveBookmark"
    />
  </div>
</template>