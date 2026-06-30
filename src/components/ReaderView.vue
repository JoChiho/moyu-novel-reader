<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  computeLayoutMetrics,
  paginateFromOffset,
  type TextMeasure,
} from "../services/pagination";
import { readerBackground } from "../utils/color";
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
  "open-settings": [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const measureRef = ref<HTMLElement | null>(null);
const lineProbeRef = ref<HTMLElement | null>(null);
const page = ref<PageSlice>({ start: 0, end: 0, lines: [] });

const readerStyle = computed(() => ({
  color: props.settings.textColor,
  backgroundColor: readerBackground(
    props.settings.backgroundColor,
    props.settings.transparentBackground,
    props.settings.backgroundOpacity,
  ),
  fontSize: `${props.settings.fontSize}px`,
  fontFamily: props.settings.fontFamily,
  lineHeight: String(props.settings.lineHeight),
  padding: `${props.settings.padding}px`,
}));

const lineStyle = computed(() => ({
  lineHeight: String(props.settings.lineHeight),
  height: `${lineHeightPx.value}px`,
}));

const lineHeightPx = ref(24);

function buildMeasure(): TextMeasure | null {
  const el = measureRef.value;
  if (!el) return null;
  return {
    measureWidth: (text: string) => {
      el.textContent = text || " ";
      return el.getBoundingClientRect().width;
    },
  };
}

function updateLineHeight() {
  const probe = lineProbeRef.value;
  if (!probe) {
    lineHeightPx.value = props.settings.fontSize * props.settings.lineHeight;
    return;
  }
  lineHeightPx.value = probe.getBoundingClientRect().height;
}

function relayout() {
  const el = containerRef.value;
  if (!el) return;

  updateLineHeight();
  const measure = buildMeasure();
  if (!measure) return;

  const pad = props.settings.padding;
  const width = Math.max(40, el.clientWidth - pad * 2);
  const height = Math.max(40, el.clientHeight - pad * 2);
  const metrics = computeLayoutMetrics(width, height, lineHeightPx.value);

  page.value = paginateFromOffset(
    props.content,
    props.charOffset,
    metrics,
    measure,
  );
}

function getMetrics() {
  const el = containerRef.value;
  const measure = buildMeasure();
  if (!el || !measure) return null;
  updateLineHeight();
  const pad = props.settings.padding;
  return {
    metrics: computeLayoutMetrics(
      Math.max(40, el.clientWidth - pad * 2),
      Math.max(40, el.clientHeight - pad * 2),
      lineHeightPx.value,
    ),
    measure,
  };
}

function goNext() {
  if (page.value.end >= props.content.length) return;
  emit("update:charOffset", page.value.end);
  emit("nextPage");
}

function goPrev() {
  if (props.charOffset <= 0) return;
  const ctx = getMetrics();
  if (!ctx) return;

  let offset = 0;
  let prevStart = 0;
  while (offset < props.charOffset) {
    const slice = paginateFromOffset(
      props.content,
      offset,
      ctx.metrics,
      ctx.measure,
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

onMounted(async () => {
  await nextTick();
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
  async () => {
    await nextTick();
    relayout();
  },
  { deep: true },
);

function onWheel(event: WheelEvent) {
  event.preventDefault();
  if (event.deltaY > 0) goNext();
  else if (event.deltaY < 0) goPrev();
}

function onContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit("open-settings");
}

defineExpose({ goNext, goPrev, relayout });
</script>

<template>
  <section
    ref="containerRef"
    class="reader"
    :style="readerStyle"
    @wheel="onWheel"
    @contextmenu="onContextMenu"
  >
    <span ref="measureRef" class="measure-span" aria-hidden="true"> </span>
    <p ref="lineProbeRef" class="line line-probe" :style="lineStyle">测</p>
    <p
      v-for="(line, idx) in page.lines"
      :key="idx"
      class="line"
      :style="lineStyle"
    >
      {{ line }}
    </p>
  </section>
</template>