<script setup lang="ts">
const emit = defineEmits<{
  importBook: [];
}>();
</script>

<template>
  <div class="empty">
    <p>导入一本 TXT 小说开始摸鱼阅读</p>
    <button class="primary" @click="emit('importBook')">导入 TXT</button>
    <p class="hint">支持拖拽窗口、滚轮翻页、快捷键隐藏</p>
  </div>
</template>