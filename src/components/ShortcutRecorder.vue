<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { keyboardEventToShortcut } from "../utils/shortcut";

defineProps<{
  modelValue: string;
  label?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const recording = ref(false);
const preview = ref("");

function stopRecording() {
  recording.value = false;
  preview.value = "";
  window.removeEventListener("keydown", onKeydown, true);
}

function startRecording() {
  recording.value = true;
  preview.value = "按下快捷键…";
  window.addEventListener("keydown", onKeydown, true);
}

function onKeydown(event: KeyboardEvent) {
  if (!recording.value) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    stopRecording();
    return;
  }

  const shortcut = keyboardEventToShortcut(event);
  if (!shortcut) return;

  preview.value = shortcut;
  emit("update:modelValue", shortcut);
  stopRecording();
}

onUnmounted(() => {
  stopRecording();
});
</script>

<template>
  <label class="shortcut-recorder">
    <span>{{ label ?? "快捷键" }}</span>
    <button
      type="button"
      class="recorder-btn"
      :class="{ recording }"
      @click="startRecording"
    >
      {{ recording ? preview : modelValue || "点击录制" }}
    </button>
  </label>
  <p class="hint">点击后按下组合键，例如 Ctrl+Z；Esc 取消</p>
</template>