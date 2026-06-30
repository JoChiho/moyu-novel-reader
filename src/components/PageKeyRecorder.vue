<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  modelValue: string;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const recording = ref(false);

function startRecording() {
  recording.value = true;
}

function onKeydown(event: KeyboardEvent) {
  if (!recording.value) return;
  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    recording.value = false;
    return;
  }

  if (event.key === " " || event.key === "Spacebar") {
    emit("update:modelValue", "Space");
    recording.value = false;
    return;
  }

  if (event.key.length === 1) {
    emit("update:modelValue", event.key.toUpperCase());
    recording.value = false;
    return;
  }

  if (/^F\d{1,2}$/i.test(event.key)) {
    emit("update:modelValue", event.key.toUpperCase());
    recording.value = false;
  }
}
</script>

<template>
  <label class="page-key">
    {{ label }}
    <button
      type="button"
      class="recorder-btn"
      :class="{ recording }"
      @click="startRecording"
      @keydown="onKeydown"
    >
      {{ recording ? "按下按键…" : modelValue || "未设置" }}
    </button>
  </label>
</template>