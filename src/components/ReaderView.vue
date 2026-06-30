<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  computeLayoutMetrics,
  findPrevPageOffset,
  paginateAtOffset,
  type TextMeasure,
} from "../services/pagination";
import {
  buildPageCacheKey,
  clearPageCache,
  getCachedPage,
  setCachedPage,
  settingsLayoutHash,
} from "../services/pageCache";
import { platformFocusMainWindow } from "../services/platform";
import { readerBackground, readerTextColor } from "../utils/color";
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
  color: readerTextColor(
    props.settings.textColor,
    props.settings.transparentText,
    props.settings.textOpacity,
  ),
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
  const settingsHash = settingsLayoutHash(props.settings);
  const cacheKey = buildPageCacheKey(
    props.charOffset,
    metrics,
    props.content.length,
    settingsHash,
  );
  const cached = getCachedPage(cacheKey);
  if (cached) {
    page.value = cached;
    return;
  }

  const slice = paginateAtOffset(
    props.content,
    props.charOffset,
    metrics,
    measure,
    props.settings,
  );
  setCachedPage(cacheKey, slice);
  page.value = slice;
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

  const prevStart = findPrevPageOffset(
    props.content,
    props.charOffset,
    ctx.metrics,
    ctx.measure,
    props.settings,
  );
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
  () => [props.content, props.settings],
  () => clearPageCache(),
  { deep: true },
);

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

function onReaderPointerDown() {
  void platformFocusMainWindow();
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
    @pointerdown="onReaderPointerDown"
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