<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";

defineProps<{
  title: string;
  progressText: string;
}>();

const emit = defineEmits<{
  toggleVisibility: [];
  openSettings: [];
  importBook: [];
}>();

async function startDrag() {
  await getCurrentWindow().startDragging();
}
</script>

<template>
  <header class="title-bar" data-tauri-drag-region @mousedown="startDrag">
    <div class="title-area" data-tauri-drag-region>
      <span class="book-title">{{ title }}</span>
      <span class="progress">{{ progressText }}</span>
    </div>
    <div class="actions" @mousedown.stop>
      <button class="icon-btn" title="导入 TXT" @click="emit('importBook')">
        +
      </button>
      <button class="icon-btn" title="设置" @click="emit('openSettings')">
        ⚙
      </button>
      <button
        class="icon-btn stealth"
        title="隐藏/显示 (快捷键)"
        @click="emit('toggleVisibility')"
      >
        ◐
      </button>
    </div>
  </header>
</template>