<script setup lang="ts">
import { computed, ref } from "vue";
import type { Book } from "../types";

const props = defineProps<{
  book: Book | null;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  jump: [offset: number];
  addBookmark: [label: string];
  removeBookmark: [id: string];
}>();

const bookmarkLabel = ref("");
const tab = ref<"chapters" | "bookmarks">("chapters");

const filteredChapters = computed(() => {
  const list = props.book?.chapters ?? [];
  const q = (props.searchQuery ?? "").trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.title.toLowerCase().includes(q));
});

const bookmarks = computed(() => {
  const list = [...(props.book?.bookmarks ?? [])];
  list.sort((a, b) => a.charOffset - b.charOffset);
  return list;
});

function formatPercent(offset: number): string {
  if (!props.book?.totalChars) return "0%";
  return `${Math.round((offset / props.book.totalChars) * 100)}%`;
}

function submitBookmark() {
  const label = bookmarkLabel.value.trim() || `书签 ${formatPercent(props.book?.charOffset ?? 0)}`;
  emit("addBookmark", label);
  bookmarkLabel.value = "";
}
</script>

<template>
  <div v-if="book" class="navigator-content">
    <div class="nav-tabs">
      <button
        type="button"
        :class="{ active: tab === 'chapters' }"
        @click="tab = 'chapters'"
      >
        章节 ({{ book.chapters.length }})
      </button>
      <button
        type="button"
        :class="{ active: tab === 'bookmarks' }"
        @click="tab = 'bookmarks'"
      >
        书签 ({{ book.bookmarks.length }})
      </button>
    </div>

    <section v-if="tab === 'chapters'" class="nav-section">
      <ul v-if="filteredChapters.length" class="nav-list">
        <li v-for="(ch, idx) in filteredChapters" :key="idx">
          <button type="button" class="nav-item" @click="emit('jump', ch.charOffset)">
            <span class="nav-title">{{ ch.title }}</span>
            <span class="nav-meta">{{ formatPercent(ch.charOffset) }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="hint">未识别到章节，可尝试关闭「取消空行」后重新打开书籍</p>
    </section>

    <section v-else class="nav-section">
      <div class="bookmark-form">
        <input
          v-model="bookmarkLabel"
          type="text"
          placeholder="书签备注（可选）"
          class="shelf-search"
        />
        <button type="button" class="primary shelf-import" @click="submitBookmark">
          添加当前页
        </button>
      </div>
      <ul v-if="bookmarks.length" class="nav-list">
        <li v-for="bm in bookmarks" :key="bm.id">
          <button type="button" class="nav-item" @click="emit('jump', bm.charOffset)">
            <span class="nav-title">{{ bm.label }}</span>
            <span class="nav-meta">{{ formatPercent(bm.charOffset) }}</span>
          </button>
          <button type="button" class="danger" @click="emit('removeBookmark', bm.id)">
            删
          </button>
        </li>
      </ul>
      <p v-else class="hint">暂无书签，阅读时可按 Ctrl+B 快速添加</p>
    </section>
  </div>
  <p v-else class="hint">请先在主窗口打开一本书</p>
</template>