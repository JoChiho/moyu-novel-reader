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
import { platformSetFrameRestoreSuspended } from "../services/platform";
import { consumeWheelTurn } from "../utils/wheelTurn";
import {
  readerBackground,
  readerTextColor,
  resolveEffectiveTextColor,
} from "../utils/color";
import type { PageSlice, ReaderSettings } from "../types";

const props = defineProps<{
  content: string;
  charOffset: number;
  settings: ReaderSettings;
  autoTextColor?: string | null;
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

const effectiveTextColor = computed(() =>
  resolveEffectiveTextColor(
    props.settings.textColor,
    props.autoTextColor,
    props.settings.autoTextContrast && props.settings.transparentBackground,
  ),
);

const readerStyle = computed(() => ({
  color: readerTextColor(
    effectiveTextColor.value,
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

const probeStyle = computed(() => ({
  lineHeight: String(props.settings.lineHeight),
}));

const lineStyle = computed(() => ({
  lineHeight: String(props.settings.lineHeight),
  height: `${lineHeightPx.value}px`,
}));

const lineHeightPx = ref(24);
let lastTypographyKey = "";

function typographyKey() {
  const { fontSize, lineHeight, fontFamily } = props.settings;
  return `${fontSize}:${lineHeight}:${fontFamily}`;
}

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

function syncLineHeight() {
  const probe = lineProbeRef.value;
  if (!probe) {
    lineHeightPx.value = Math.round(
      props.settings.fontSize * props.settings.lineHeight,
    );
    return;
  }
  // Measure once per typography change; probe has no explicit height to avoid feedback drift.
  lineHeightPx.value = Math.max(1, Math.round(probe.getBoundingClientRect().height));
}

function relayout() {
  const el = containerRef.value;
  if (!el) return;

  const typoKey = typographyKey();
  if (typoKey !== lastTypographyKey) {
    syncLineHeight();
    lastTypographyKey = typoKey;
  }

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
const altHeld = ref(false);

function onAltKeyDown(event: KeyboardEvent) {
  if (event.key !== "Alt") return;
  altHeld.value = true;
  void platformSetFrameRestoreSuspended(true);
}

function onAltKeyUp(event: KeyboardEvent) {
  if (event.key !== "Alt") return;
  altHeld.value = false;
  void platformSetFrameRestoreSuspended(false);
}

onMounted(async () => {
  await nextTick();
  relayout();
  if (containerRef.value) {
    observer = new ResizeObserver(() => relayout());
    observer.observe(containerRef.value);
  }
  window.addEventListener("keydown", onAltKeyDown);
  window.addEventListener("keyup", onAltKeyUp);
});

onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener("keydown", onAltKeyDown);
  window.removeEventListener("keyup", onAltKeyUp);
  if (altHeld.value) {
    void platformSetFrameRestoreSuspended(false);
  }
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

function onContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit("open-settings");
}

function onWheel(event: WheelEvent) {
  if (altHeld.value || !event.deltaY || !consumeWheelTurn()) return;
  event.preventDefault();
  if (event.deltaY > 0) goNext();
  else goPrev();
}

defineExpose({ goNext, goPrev, relayout });
</script>

<template>
  <section
    ref="containerRef"
    class="reader"
    :class="{ 'reader-alt-drag': altHeld }"
    :style="readerStyle"
    @contextmenu="onContextMenu"
    @wheel="onWheel"
  >
    <span ref="measureRef" class="measure-span" aria-hidden="true"> </span>
    <p ref="lineProbeRef" class="line line-probe" :style="probeStyle">测</p>
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