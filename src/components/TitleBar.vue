<script setup lang="ts">
defineProps<{
  title: string;
  progressText: string;
}>();

const emit = defineEmits<{
  toggleVisibility: [];
  openSettings: [];
  importBook: [];
}>();
</script>

<template>
  <header class="title-bar">
    <div class="title-area drag-region">
      <span class="book-title">{{ title }}</span>
      <span class="progress">{{ progressText }}</span>
    </div>
    <div class="actions no-drag">
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