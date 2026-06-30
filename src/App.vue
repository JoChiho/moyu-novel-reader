<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
import { platformSetTransparent } from "./services/platform";
import { readerBackground } from "./utils/color";
import type { AppState, Book } from "./types";

const appState = ref<AppState | null>(null);
const activeBook = ref<Book | null>(null);
const bookContent = ref("");
const settingsOpen = ref(false);
const shortcutError = ref("");
const toastMessage = ref("");
const chromeVisible = ref(false);
const readerRef = ref<InstanceType<typeof ReaderView> | null>(null);

let chromeTimer: ReturnType<typeof setTimeout> | null = null;

const isReading = computed(
  () => !!(activeBook.value && bookContent.value.length),
);

const showTitleBar = computed(
  () => !isReading.value || chromeVisible.value || settingsOpen.value,
);

const appStyle = computed(() => {
  if (!appState.value) return {};
  const s = appState.value.settings;
  if (s.transparentBackground) {
    return { backgroundColor: "transparent" };
  }
  return {
    backgroundColor: readerBackground(
      s.backgroundColor,
      false,
      s.backgroundOpacity,
    ),
  };
});

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => {
    if (toastMessage.value === message) toastMessage.value = "";
  }, 3000);
}

function revealChrome() {
  chromeVisible.value = true;
  if (chromeTimer) clearTimeout(chromeTimer);
  chromeTimer = setTimeout(() => {
    if (!settingsOpen.value) chromeVisible.value = false;
  }, 2500);
}

function onMouseMove(event: MouseEvent) {
  if (!isReading.value || settingsOpen.value) return;
  if (event.clientY <= 18) revealChrome();
}

const { toggleVisibility, setAlwaysOnTop } = useWindowVisibility();

const progressText = computed(() => {
  if (!activeBook.value || !bookContent.value.length) return "";
  const pct = Math.min(
    100,
    Math.round((activeBook.value.charOffset / bookContent.value.length) * 100),
  );
  return `${pct}%`;
});

async function applyWindowSettings() {
  if (!appState.value) return;
  const s = appState.value.settings;
  await setAlwaysOnTop(s.alwaysOnTop);
  await platformSetTransparent(s.transparentBackground);
}

async function bootstrap() {
  const state = await loadAppState();
  appState.value = state;
  await applyWindowSettings();
  const bindResult = await bindToggleShortcut(
    state.settings.toggleVisibilityShortcut,
  );
  if (!bindResult.success) {
    shortcutError.value = bindResult.error ?? "快捷键注册失败";
  }

  if (state.lastBookId) {
    const book = state.books.find((b) => b.id === state.lastBookId);
    if (book) await openBook(book);
  }
}

async function openBook(book: Book) {
  try {
    const content = await reloadBookContent(book);
    activeBook.value = { ...book, totalChars: content.length };
    bookContent.value = content;
    chromeVisible.value = false;
    if (appState.value) {
      appState.value = { ...appState.value, lastBookId: book.id };
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : "打开书籍失败");
  }
}

async function handleImport() {
  try {
    const result = await pickAndReadTxt();
    if (!result || !appState.value) return;
    const { book, content } = result;
    appState.value = await upsertBook(book, appState.value);
    activeBook.value = book;
    bookContent.value = content;
    chromeVisible.value = false;
    showToast(`已导入：${book.title}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : "导入失败");
  }
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
  try {
    appState.value = await updateSettings(patch, appState.value);
    if (
      patch.alwaysOnTop !== undefined ||
      patch.transparentBackground !== undefined
    ) {
      await applyWindowSettings();
    }
    if (patch.toggleVisibilityShortcut !== undefined) {
      const result = await bindToggleShortcut(patch.toggleVisibilityShortcut);
      if (result.success) {
        shortcutError.value = "";
      } else {
        shortcutError.value = result.error ?? "快捷键注册失败";
      }
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : "设置保存失败");
  }
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest(".recorder-btn")) return;

  if (event.key === "," || (event.key === "s" && event.ctrlKey)) {
    if (isReading.value) {
      event.preventDefault();
      settingsOpen.value = true;
      revealChrome();
    }
    return;
  }

  if (settingsOpen.value) return;
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
  window.addEventListener("mousemove", onMouseMove);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("mousemove", onMouseMove);
  if (chromeTimer) clearTimeout(chromeTimer);
});
</script>

<template>
  <div
    v-if="appState"
    class="app"
    :class="{ 'app-transparent': appState.settings.transparentBackground }"
    :style="appStyle"
  >
    <div
      v-if="isReading && !showTitleBar"
      class="drag-strip drag-region"
      title="拖拽移动窗口"
    />

    <TitleBar
      v-show="showTitleBar"
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
      @open-settings="settingsOpen = true"
    />
    <EmptyState v-else @import-book="handleImport" />

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <SettingsPanel
      :open="settingsOpen"
      :settings="appState.settings"
      :books="appState.books"
      :active-book-id="activeBook?.id ?? null"
      :shortcut-error="shortcutError"
      @close="settingsOpen = false"
      @update:settings="handleSettingsPatch"
      @select-book="handleSelectBook"
      @remove-book="handleRemoveBook"
    />
  </div>
</template>