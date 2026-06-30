<script setup lang="ts">
import type { Book, ReaderSettings } from "../types";
import ShortcutRecorder from "./ShortcutRecorder.vue";

defineProps<{
  open: boolean;
  settings: ReaderSettings;
  books: Book[];
  activeBookId: string | null;
  shortcutError?: string;
}>();

const emit = defineEmits<{
  close: [];
  "update:settings": [value: Partial<ReaderSettings>];
  selectBook: [id: string];
  removeBook: [id: string];
}>();
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <aside class="panel">
      <header class="panel-header">
        <h2>设置</h2>
        <button class="icon-btn" @click="emit('close')">✕</button>
      </header>

      <section class="section">
        <h3>阅读样式</h3>
        <label>
          字号 (px)
          <input
            type="number"
            min="1"
            step="1"
            :value="settings.fontSize"
            @change="
              emit('update:settings', {
                fontSize: Math.max(
                  1,
                  Number(($event.target as HTMLInputElement).value) || 1,
                ),
              })
            "
          />
        </label>
        <label>
          文字颜色
          <input
            type="color"
            :value="settings.textColor"
            @input="
              emit('update:settings', {
                textColor: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
        <label>
          背景颜色
          <input
            type="color"
            :value="settings.backgroundColor"
            @input="
              emit('update:settings', {
                backgroundColor: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.transparentBackground"
            @change="
              emit('update:settings', {
                transparentBackground: ($event.target as HTMLInputElement)
                  .checked,
              })
            "
          />
          透明窗口（摸鱼模式）
        </label>
        <label v-if="settings.transparentBackground">
          背景不透明度
          <input
            type="range"
            min="20"
            max="100"
            :value="settings.backgroundOpacity"
            @input="
              emit('update:settings', {
                backgroundOpacity: Number(
                  ($event.target as HTMLInputElement).value,
                ),
              })
            "
          />
          <span>{{ settings.backgroundOpacity }}%</span>
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.alwaysOnTop"
            @change="
              emit('update:settings', {
                alwaysOnTop: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          窗口置顶
        </label>
        <p class="hint">阅读时标题栏自动隐藏；鼠标移到顶部或右键可唤出设置</p>
      </section>

      <section class="section">
        <h3>快捷键</h3>
        <ShortcutRecorder
          :model-value="settings.toggleVisibilityShortcut"
          label="隐藏/显示"
          @update:model-value="
            emit('update:settings', { toggleVisibilityShortcut: $event })
          "
        />
        <p v-if="shortcutError" class="error">{{ shortcutError }}</p>
        <p class="hint">翻页：滚轮、方向键、J/K、空格</p>
      </section>

      <section class="section">
        <h3>书架</h3>
        <ul v-if="books.length" class="book-list">
          <li
            v-for="book in books"
            :key="book.id"
            :class="{ active: book.id === activeBookId }"
          >
            <button class="book-item" @click="emit('selectBook', book.id)">
              {{ book.title }}
            </button>
            <button class="danger" @click="emit('removeBook', book.id)">
              删
            </button>
          </li>
        </ul>
        <p v-else class="hint">暂无书籍，点击标题栏 + 导入 TXT</p>
      </section>
    </aside>
  </div>
</template>