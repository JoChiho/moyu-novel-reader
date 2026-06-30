<script setup lang="ts">
import { computed } from "vue";
import type { ReaderSettings } from "../types";
import { readerBackground } from "../utils/color";

const props = defineProps<{
  settings: ReaderSettings;
  overlay?: boolean;
  visible?: boolean;
}>();

const emit = defineEmits<{
  toggleVisibility: [];
  openSettings: [];
  openShelf: [];
  openNavigator: [];
  importBook: [];
}>();

const toolbarStyle = computed(() => {
  const s = props.settings;
  const btnBg = readerBackground(
    s.titleBarButtonColor,
    s.titleBarButtonTransparent,
    s.titleBarButtonOpacity,
  );
  const btnHoverOpacity = Math.min(
    100,
    s.titleBarButtonOpacity + (s.titleBarButtonTransparent ? 18 : 12),
  );
  return {
    "--toolbar-btn-bg": btnBg,
    "--toolbar-btn-hover-bg": readerBackground(
      s.titleBarButtonColor,
      s.titleBarButtonTransparent,
      btnHoverOpacity,
    ),
  };
});
</script>

<template>
  <div
    class="reader-toolbar"
    :class="{
      'reader-toolbar-overlay': overlay,
      'reader-toolbar-visible': visible,
    }"
    :style="toolbarStyle"
  >
    <div class="toolbar-actions no-drag">
      <button class="icon-btn toolbar-btn" title="导入书籍" @click="emit('importBook')">
        +
      </button>
      <button class="icon-btn toolbar-btn" title="书架" @click="emit('openShelf')">
        架
      </button>
      <button class="icon-btn toolbar-btn" title="章节与书签" @click="emit('openNavigator')">
        导
      </button>
      <button class="icon-btn toolbar-btn" title="设置" @click="emit('openSettings')">
        ⚙
      </button>
      <button
        class="icon-btn toolbar-btn stealth"
        title="隐藏/显示 (快捷键)"
        @click="emit('toggleVisibility')"
      >
        ◐
      </button>
    </div>
  </div>
</template>