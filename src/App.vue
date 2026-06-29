<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import TitleBar from "./components/TitleBar.vue";
import ReaderView from "./components/ReaderView.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import EmptyState from "./components/EmptyState.vue";
import { bindToggleShortcut } from "./composables/useGlobalShortcut";
import { useWindowVisibility } from "./composables/useWindowVisibility";
import { pickAndReadTxt, reloadBookContent } from "./services/bookImport";
import {
  loadAppState,
  removeBook,
  updateBookProgress,
  updateSettings,
  upsertBook,
} from "./services/storage";
import type { AppState, Book } from "./types";

const appState = ref<AppState | null>(null);
const activeBook = ref<Book | null>(null);
const bookContent = ref("");
const settingsOpen = ref(false);
const readerRef = ref<InstanceType<typeof ReaderView> | null>(null);

const { toggleVisibility, setAlwaysOnTop } = useWindowVisibility();

const progressText = computed(() => {
  if (!activeBook.value || !bookContent.value.length) return "";
  const pct = Math.min(
    100,
    Math.round((activeBook.value.charOffset / bookContent.value.length) * 100),
  );
  return `${pct}%`;
});

async function bootstrap() {
  const state = await loadAppState();
  appState.value = state;
  await setAlwaysOnTop(state.settings.alwaysOnTop);
  await bindToggleShortcut(state.settings.toggleVisibilityShortcut, () => {
    void toggleVisibility();
  });

  if (state.lastBookId) {
    const book = state.books.find((b) => b.id === state.lastBookId);
    if (book) await openBook(book);
  }

  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

async function openBook(book: Book) {
  const content = await reloadBookContent(book);
  activeBook.value = { ...book, totalChars: content.length };
  bookContent.value = content;
  if (appState.value) {
    appState.value = { ...appState.value, lastBookId: book.id };
  }
}

async function handleImport() {
  const result = await pickAndReadTxt();
  if (!result || !appState.value) return;
  const { book, content } = result;
  appState.value = await upsertBook(book, appState.value);
  activeBook.value = book;
  bookContent.value = content;
}

async function handleOffsetChange(offset: number) {
  if (!activeBook.value || !appState.value) return;
  activeBook.value = { ...activeBook.value, charOffset: offset };
  appState.value = await updateBookProgress(
    activeBook.value.id,
    offset,
    appState.value,
  );
}

async function handleSelectBook(id: string) {
  const book = appState.value?.books.find((b) => b.id === id);
  if (!book) return;
  await openBook(book);
  settingsOpen.value = false;
}

async function handleRemoveBook(id: string) {
  if (!appState.value) return;
  appState.value = await removeBook(id, appState.value);
  if (activeBook.value?.id === id) {
    activeBook.value = null;
    bookContent.value = "";
  }
}

async function handleSettingsPatch(patch: Partial<AppState["settings"]>) {
  if (!appState.value) return;
  appState.value = await updateSettings(patch, appState.value);
  if (patch.alwaysOnTop !== undefined) {
    await setAlwaysOnTop(patch.alwaysOnTop);
  }
  if (patch.toggleVisibilityShortcut !== undefined) {
    await bindToggleShortcut(patch.toggleVisibilityShortcut, () => {
      void toggleVisibility();
    });
  }
}

function onKeydown(event: KeyboardEvent) {
  if (settingsOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case " ":
    case "j":
    case "J":
      event.preventDefault();
      readerRef.value?.goNext();
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "k":
    case "K":
      event.preventDefault();
      readerRef.value?.goPrev();
      break;
    case "Escape":
      settingsOpen.value = false;
      break;
  }
}

watch(
  () => appState.value?.settings,
  () => readerRef.value?.relayout(),
  { deep: true },
);

onMounted(() => {
  void bootstrap();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div
    v-if="appState"
    class="app"
    :style="{ backgroundColor: appState.settings.backgroundColor }"
  >
    <TitleBar
      :title="activeBook?.title ?? '摸鱼小说阅读器'"
      :progress-text="progressText"
      @toggle-visibility="toggleVisibility"
      @open-settings="settingsOpen = true"
      @import-book="handleImport"
    />

    <ReaderView
      v-if="activeBook && bookContent"
      ref="readerRef"
      :content="bookContent"
      :char-offset="activeBook.charOffset"
      :settings="appState.settings"
      @update:char-offset="handleOffsetChange"
    />
    <EmptyState v-else @import-book="handleImport" />

    <SettingsPanel
      :open="settingsOpen"
      :settings="appState.settings"
      :books="appState.books"
      :active-book-id="activeBook?.id ?? null"
      @close="settingsOpen = false"
      @update:settings="handleSettingsPatch"
      @select-book="handleSelectBook"
      @remove-book="handleRemoveBook"
    />
  </div>
</template>