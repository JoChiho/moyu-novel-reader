<script setup lang="ts">
import { computed, ref } from "vue";
import type { Book } from "../types";

const props = defineProps<{
  books: Book[];
  activeBookId: string | null;
}>();

const emit = defineEmits<{
  selectBook: [id: string];
  removeBook: [id: string];
  importBook: [];
}>();

const shelfQuery = ref("");
const sortNewestFirst = ref(true);

const filteredBooks = computed(() => {
  const q = shelfQuery.value.trim().toLowerCase();
  let list = [...props.books];
  if (q) {
    list = list.filter((b) => b.title.toLowerCase().includes(q));
  }
  list.sort((a, b) =>
    sortNewestFirst.value ? b.addedAt - a.addedAt : a.addedAt - b.addedAt,
  );
  return list;
});
</script>

<template>
  <div class="shelf-content">
    <div class="shelf-toolbar">
      <input
        v-model="shelfQuery"
        type="search"
        placeholder="搜索书名…"
        class="shelf-search"
      />
      <button
        type="button"
        class="sort-btn"
        @click="sortNewestFirst = !sortNewestFirst"
      >
        {{ sortNewestFirst ? "最新" : "最早" }}
      </button>
      <button type="button" class="primary shelf-import" @click="emit('importBook')">
        导入
      </button>
    </div>

    <ul v-if="filteredBooks.length" class="book-list">
      <li
        v-for="book in filteredBooks"
        :key="book.id"
        :class="{ active: book.id === activeBookId }"
      >
        <button class="book-item" type="button" @click="emit('selectBook', book.id)">
          {{ book.title }}
        </button>
        <button class="danger" type="button" @click="emit('removeBook', book.id)">
          删
        </button>
      </li>
    </ul>
    <p v-else-if="books.length" class="hint">没有匹配的书籍</p>
    <p v-else class="hint">暂无书籍，点击「导入」添加</p>
  </div>
</template>