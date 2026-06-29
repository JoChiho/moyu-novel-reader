<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  computeLayoutMetrics,
  paginateFromOffset,
} from "../services/pagination";
import type { PageSlice, ReaderSettings } from "../types";

const props = defineProps<{
  content: string;
  charOffset: number;
  settings: ReaderSettings;
}>();

const emit = defineEmits<{
  "update:charOffset": [value: number];
  nextPage: [];
  prevPage: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const page = ref<PageSlice>({ start: 0, end: 0, lines: [] });

const readerStyle = computed(() => ({
  color: props.settings.textColor,
  backgroundColor: props.settings.backgroundColor,
  fontSize: `${props.settings.fontSize}px`,
  fontFamily: props.settings.fontFamily,
  lineHeight: String(props.settings.lineHeight),
  padding: `${props.settings.padding}px`,
}));

function relayout() {
  const el = containerRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const pad = props.settings.padding;
  const width = Math.max(40, rect.width - pad * 2);
  const height = Math.max(40, rect.height - pad * 2);
  const metrics = computeLayoutMetrics(width, height, props.settings);
  page.value = paginateFromOffset(
    props.content,
    props.charOffset,
    metrics,
    props.settings,
  );
}

function goNext() {
  if (page.value.end >= props.content.length) return;
  emit("update:charOffset", page.value.end);
  emit("nextPage");
}

function getMetrics() {
  const el = containerRef.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const pad = props.settings.padding;
  return computeLayoutMetrics(
    Math.max(40, rect.width - pad * 2),
    Math.max(40, rect.height - pad * 2),
    props.settings,
  );
}

function goPrev() {
  if (props.charOffset <= 0) return;
  const metrics = getMetrics();
  if (!metrics) return;

  let offset = 0;
  let prevStart = 0;
  while (offset < props.charOffset) {
    const slice = paginateFromOffset(
      props.content,
      offset,
      metrics,
      props.settings,
    );
    if (slice.end <= offset) break;
    if (slice.end >= props.charOffset) break;
    prevStart = offset;
    offset = slice.end;
  }
  emit("update:charOffset", prevStart);
  emit("prevPage");
}

let observer: ResizeObserver | null = null;

onMounted(() => {
  relayout();
  if (containerRef.value) {
    observer = new ResizeObserver(() => relayout());
    observer.observe(containerRef.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

watch(
  () => [props.content, props.charOffset, props.settings],
  () => relayout(),
  { deep: true },
);

function onWheel(event: WheelEvent) {
  event.preventDefault();
  if (event.deltaY > 0) goNext();
  else if (event.deltaY < 0) goPrev();
}

defineExpose({ goNext, goPrev, relayout });
</script>

<template>
  <section
    ref="containerRef"
    class="reader"
    :style="readerStyle"
    @wheel="onWheel"
  >
    <p v-for="(line, idx) in page.lines" :key="idx" class="line">{{ line }}</p>
  </section>
</template>