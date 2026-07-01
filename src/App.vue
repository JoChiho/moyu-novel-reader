<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import ReaderToolbar from "./components/ReaderToolbar.vue";
import ReaderView from "./components/ReaderView.vue";
import EmptyState from "./components/EmptyState.vue";
import { useAutoTextContrast } from "./composables/useAutoTextContrast";
import { bindToggleShortcut } from "./composables/useGlobalShortcut";
import { useWindowVisibility } from "./composables/useWindowVisibility";
import { pickAndReadBook, reloadBookChapterSlice } from "./services/bookImport";
import { matchesPageTurnKey } from "./utils/pageTurn";
import { consumeWheelTurn } from "./utils/wheelTurn";
import {
  addBookmark,
  loadAppState,
  updateBookMeta,
  updateBookProgress,
  upsertBook,
} from "./services/storage";
import {
  platformOnAppStateUpdated,
  platformOnDisplayMetricsChanged,
  platformOnMainWindowBlur,
  platformOnMainWindowWheel,
  platformOpenMoyuWindow,
  platformOpenNavigatorWindow,
  platformOpenSettingsWindow,
  platformOpenShelfWindow,
  platformSetTransparent,
} from "./services/platform";
import { readerBackground } from "./utils/color";
import type { AppState, Book, BookChapterSlice } from "./types";

const appState = ref<AppState | null>(null);
const activeBook = ref<Book | null>(null);
const bookContent = ref("");
const readerLocalOffset = ref(0);
const chapterGlobalStart = ref(0);
const chapterHasNext = ref(false);
const chapterHasPrev = ref(false);
const toastMessage = ref("");
const readerRef = ref<InstanceType<typeof ReaderView> | null>(null);
const chromeBarOpen = ref(false);

/** Must match CSS `.reader-chrome` height */
const READER_CHROME_HEIGHT_PX = 40;

let unsubscribeState: (() => void) | null = null;
let unsubscribeDpi: (() => void) | null = null;
let unsubscribeBlur: (() => void) | null = null;
let unsubscribeWheel: (() => void) | null = null;

const isReading = computed(
  () => !!(activeBook.value && bookContent.value.length),
);

const readerSettings = computed(() => appState.value?.settings);

const { autoTextColor } = useAutoTextContrast(readerSettings);

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

const { toggleVisibility, setAlwaysOnTop } = useWindowVisibility();

async function applyWindowSettings() {
  if (!appState.value) return;
  const s = appState.value.settings;
  await setAlwaysOnTop(s.alwaysOnTop);
  await platformSetTransparent(s.transparentBackground);
}

function bookReadOptions() {
  const settings = appState.value?.settings;
  return {
    encoding: settings?.textEncoding ?? "auto",
    collapseBlankLines: settings?.collapseBlankLines !== false,
  };
}

function applyChapterSlice(slice: BookChapterSlice, globalOffset?: number) {
  bookContent.value = slice.text;
  chapterGlobalStart.value = slice.chapterGlobalStart;
  readerLocalOffset.value = slice.localOffset;
  chapterHasNext.value = slice.hasNextChapter;
  chapterHasPrev.value = slice.hasPrevChapter;

  const global = globalOffset ?? slice.globalOffset;
  if (activeBook.value) {
    activeBook.value = {
      ...activeBook.value,
      charOffset: global,
      totalChars: slice.totalChars,
      chapters: slice.chapters,
      chapterCacheVersion: 1,
      fileMissing: false,
    };
  }
}

async function loadChapterAtGlobal(globalOffset: number) {
  if (!activeBook.value) return;
  const slice = await reloadBookChapterSlice(
    activeBook.value,
    globalOffset,
    bookReadOptions(),
  );
  applyChapterSlice(slice, globalOffset);
}

async function openBook(book: Book) {
  try {
    activeBook.value = book;
    await loadChapterAtGlobal(book.charOffset);
  } catch (err) {
    const message = err instanceof Error ? err.message : "打开书籍失败";
    if (appState.value) {
      appState.value = await updateBookMeta(
        book.id,
        { fileMissing: true },
        appState.value,
      );
    }
    activeBook.value = { ...book, fileMissing: true };
    bookContent.value = "";
    showToast(message.includes("不存在") ? message : `无法打开：${message}`);
    throw err;
  }
}

async function syncFromState(state: AppState) {
  appState.value = state;
  await applyWindowSettings();

  const bindResult = await bindToggleShortcut(
    state.settings.toggleVisibilityShortcut,
  );
  if (!bindResult.success) {
    showToast(bindResult.error ?? "快捷键注册失败");
  }

  if (state.lastBookId) {
    const book = state.books.find((b) => b.id === state.lastBookId);
    if (book) {
      try {
        await openBook(book);
        return;
      } catch {
        /* toast already shown */
      }
    }
  }

  activeBook.value = null;
  bookContent.value = "";
}

async function bootstrap() {
  const state = await loadAppState();
  await syncFromState(state);
}

async function handleImport() {
  try {
    const result = await pickAndReadBook(bookReadOptions());
    if (!result || !appState.value) return;
    const { book, slice } = result;
    const withMeta: Book = {
      ...book,
      bookmarks: [],
    };
    activeBook.value = withMeta;
    applyChapterSlice(slice);
    appState.value = await upsertBook(activeBook.value, appState.value);
    const chapterHint =
      withMeta.chapters.length > 1
        ? `，${withMeta.chapters.length} 章`
        : "";
    showToast(`已导入：${book.title}${chapterHint}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : "导入失败");
  }
}

function getReaderCharOffset(): number | null {
  return activeBook.value?.charOffset ?? null;
}

async function handleOffsetChange(localOffset: number) {
  if (!activeBook.value || !appState.value) return;

  const globalOffset = chapterGlobalStart.value + localOffset;
  readerLocalOffset.value = localOffset;
  activeBook.value = { ...activeBook.value, charOffset: globalOffset };
  appState.value = await updateBookProgress(
    activeBook.value.id,
    globalOffset,
    appState.value,
  );
}

async function handleChapterNext() {
  if (!activeBook.value || !appState.value || !chapterHasNext.value) return;
  const slice = await reloadBookChapterSlice(
    activeBook.value,
    activeBook.value.charOffset,
    bookReadOptions(),
  );
  if (slice.nextChapterGlobalStart == null) return;
  await loadChapterAtGlobal(slice.nextChapterGlobalStart);
  appState.value = await updateBookProgress(
    activeBook.value.id,
    activeBook.value.charOffset,
    appState.value,
  );
}

async function handleChapterPrev() {
  if (!activeBook.value || !appState.value || !chapterHasPrev.value) return;
  const slice = await reloadBookChapterSlice(
    activeBook.value,
    activeBook.value.charOffset,
    bookReadOptions(),
  );
  if (slice.prevChapterGlobalStart == null) return;
  await loadChapterAtGlobal(slice.prevChapterGlobalStart);
  await nextTick();
  readerRef.value?.goToLastPage();
}

async function handleAddBookmark() {
  if (!activeBook.value || !appState.value || !isReading.value) return;
  const pct = Math.round(
    (activeBook.value.charOffset / Math.max(activeBook.value.totalChars, 1)) *
      100,
  );
  const label = `书签 ${pct}%`;
  appState.value = await addBookmark(
    activeBook.value.id,
    activeBook.value.charOffset,
    label,
    appState.value,
  );
  activeBook.value = {
    ...activeBook.value,
    bookmarks: appState.value.books.find((b) => b.id === activeBook.value?.id)
      ?.bookmarks ?? [],
  };
  showToast(`已添加${label}`);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest(".recorder-btn")) return;

  if (event.key === "b" && event.ctrlKey && isReading.value) {
    event.preventDefault();
    void handleAddBookmark();
    return;
  }

  if (event.ctrlKey && (event.key === "," || event.key === "，")) {
    event.preventDefault();
    void platformOpenSettingsWindow();
    return;
  }

  if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
  if (target?.tagName === "SELECT") return;

  const settings = appState.value?.settings;
  const nextKey = settings?.nextPageKey ?? "J";
  const prevKey = settings?.prevPageKey ?? "K";

  const isNext =
    event.key === "ArrowRight" ||
    event.key === "ArrowDown" ||
    event.key === " " ||
    matchesPageTurnKey(event, nextKey);

  const isPrev =
    event.key === "ArrowLeft" ||
    event.key === "ArrowUp" ||
    matchesPageTurnKey(event, prevKey);

  if (isNext) {
    event.preventDefault();
    readerRef.value?.goNext();
    return;
  }

  if (isPrev) {
    event.preventDefault();
    readerRef.value?.goPrev();
    return;
  }
}

watch(
  () => appState.value?.settings,
  () => readerRef.value?.relayout(),
  { deep: true },
);

watch(
  () => appState.value?.settings.collapseBlankLines,
  async (next, prev) => {
    if (next === prev || !activeBook.value) return;
    try {
      await openBook(activeBook.value);
    } catch {
      /* handled in openBook */
    }
  },
);

function showChromeBar() {
  chromeBarOpen.value = true;
}

function hideChromeBar() {
  chromeBarOpen.value = false;
}

function onAppPointerMove(event: PointerEvent) {
  if (!isReading.value || !chromeBarOpen.value) return;
  if (event.clientY > READER_CHROME_HEIGHT_PX) {
    hideChromeBar();
  }
}

function handleWheelDelta(deltaY: number) {
  if (!isReading.value || !readerRef.value || !deltaY || !consumeWheelTurn()) return;
  if (deltaY > 0) readerRef.value.goNext();
  else readerRef.value.goPrev();
}

function onWindowBlur() {
  chromeBarOpen.value = false;
  document.title = "";
}

function onVisibilityChange() {
  if (document.hidden) onWindowBlur();
}

onMounted(() => {
  (
    window as Window & {
      __moyuGetReaderCharOffset?: () => number | null;
    }
  ).__moyuGetReaderCharOffset = getReaderCharOffset;
  document.title = "";
  void bootstrap();
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("blur", onWindowBlur);
  unsubscribeWheel = platformOnMainWindowWheel(({ deltaY }) => {
    handleWheelDelta(deltaY);
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  unsubscribeState = platformOnAppStateUpdated(() => {
    void loadAppState().then((state) => syncFromState(state));
  });
  unsubscribeDpi = platformOnDisplayMetricsChanged(() => {
    readerRef.value?.relayout();
  });
  unsubscribeBlur = platformOnMainWindowBlur(onWindowBlur);
});

onUnmounted(() => {
  delete (
    window as Window & {
      __moyuGetReaderCharOffset?: () => number | null;
    }
  ).__moyuGetReaderCharOffset;
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("blur", onWindowBlur);
  unsubscribeWheel?.();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  unsubscribeState?.();
  unsubscribeDpi?.();
  unsubscribeBlur?.();
});
</script>

<template>
  <div
    v-if="appState"
    class="app"
    :class="{
      'app-transparent': appState.settings.transparentBackground,
      'app-reading': isReading,
    }"
    :style="appStyle"
    @pointermove="onAppPointerMove"
  >
    <div
      v-if="isReading"
      class="reader-chrome"
      @mouseenter="showChromeBar"
      @mouseleave="hideChromeBar"
    >
      <div class="window-drag-strip" title="拖动此处移动窗口" />
      <ReaderToolbar
        overlay
        :visible="chromeBarOpen"
        :settings="appState.settings"
        @toggle-visibility="toggleVisibility"
        @open-settings="platformOpenSettingsWindow()"
        @open-shelf="platformOpenShelfWindow()"
        @open-navigator="platformOpenNavigatorWindow()"
        @open-moyu="platformOpenMoyuWindow()"
        @import-book="handleImport"
      />
    </div>

    <div v-else class="toolbar-slot">
      <ReaderToolbar
        :settings="appState.settings"
        visible
        @toggle-visibility="toggleVisibility"
        @open-settings="platformOpenSettingsWindow()"
        @open-shelf="platformOpenShelfWindow()"
        @open-navigator="platformOpenNavigatorWindow()"
        @open-moyu="platformOpenMoyuWindow()"
        @import-book="handleImport"
      />
    </div>

    <ReaderView
      v-if="activeBook && bookContent"
      ref="readerRef"
      class="reader-inset"
      :content="bookContent"
      :char-offset="readerLocalOffset"
      :settings="appState.settings"
      :auto-text-color="autoTextColor"
      :has-next-chapter="chapterHasNext"
      :has-prev-chapter="chapterHasPrev"
      @pointerdown="hideChromeBar"
      @pointerenter="hideChromeBar"
      @update:char-offset="handleOffsetChange"
      @chapter-next="handleChapterNext"
      @chapter-prev="handleChapterPrev"
      @open-settings="platformOpenSettingsWindow()"
    />
    <EmptyState v-else @import-book="handleImport" />

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
  </div>
</template>