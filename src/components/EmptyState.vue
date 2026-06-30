<script setup lang="ts">
const emit = defineEmits<{
  importBook: [];
}>();
</script>

<template>
  <div class="empty">
    <p>导入 TXT 或 Word 小说开始摸鱼阅读</p>
    <button class="primary" @click="emit('importBook')">导入书籍</button>
    <p class="hint">
      右上角 ⚙ 打开设置 · 阅读时右键或 Ctrl+, 也可打开设置
    </p>
  </div>
</template>