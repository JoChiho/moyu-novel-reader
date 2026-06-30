<script setup lang="ts">
import { computed, ref } from "vue";
import type { ReaderSettings } from "../types";
import { EYE_CARE_THEMES } from "../utils/themes";
import ShortcutRecorder from "./ShortcutRecorder.vue";
import PageKeyRecorder from "./PageKeyRecorder.vue";
import UserManualDialog from "./UserManualDialog.vue";

const manualOpen = ref(false);

const props = defineProps<{
  settings: ReaderSettings;
  shortcutError?: string;
  progressOffset?: number;
  progressTotal?: number;
}>();

const emit = defineEmits<{
  "update:settings": [value: Partial<ReaderSettings>];
  jumpProgress: [offset: number];
}>();

const progressPercent = computed(() => {
  if (!props.progressTotal) return 0;
  return Math.round(((props.progressOffset ?? 0) / props.progressTotal) * 100);
});

function applyTheme(themeId: string) {
  const theme = EYE_CARE_THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  emit("update:settings", {
    textColor: theme.textColor,
    backgroundColor: theme.backgroundColor,
  });
}

function onProgressInput(event: Event) {
  if (!props.progressTotal) return;
  const pct = Number((event.target as HTMLInputElement).value);
  const offset = Math.round((pct / 100) * props.progressTotal);
  emit("jumpProgress", offset);
}
</script>

<template>
  <div class="settings-content">
    <div class="settings-toolbar">
      <h2 class="settings-title">设置</h2>
      <button type="button" class="manual-open-btn" @click="manualOpen = true">
        说明书
      </button>
    </div>

    <UserManualDialog v-if="manualOpen" @close="manualOpen = false" />

      <section class="section">
        <h3>阅读样式</h3>
        <div class="theme-row">
          <button
            v-for="theme in EYE_CARE_THEMES"
            :key="theme.id"
            type="button"
            class="theme-btn"
            :style="{
              color: theme.textColor,
              backgroundColor: theme.backgroundColor,
            }"
            @click="applyTheme(theme.id)"
          >
            {{ theme.name }}
          </button>
        </div>
        <label>
          字号 (px)
          <input
            type="number"
            min="1"
            step="1"
            :value="settings.fontSize"
            @change="
              emit('update:settings', {
                fontSize: Math.max(
                  1,
                  Number(($event.target as HTMLInputElement).value) || 1,
                ),
              })
            "
          />
        </label>
        <label>
          文字颜色
          <input
            type="color"
            :value="settings.textColor"
            @input="
              emit('update:settings', {
                textColor: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
        <label>
          背景颜色
          <input
            type="color"
            :value="settings.backgroundColor"
            @input="
              emit('update:settings', {
                backgroundColor: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.transparentBackground"
            @change="
              emit('update:settings', {
                transparentBackground: ($event.target as HTMLInputElement)
                  .checked,
              })
            "
          />
          透明窗口（摸鱼模式）
        </label>
        <label v-if="settings.transparentBackground">
          背景不透明度
          <input
            type="range"
            min="0"
            max="100"
            :value="settings.backgroundOpacity"
            @input="
              emit('update:settings', {
                backgroundOpacity: Number(
                  ($event.target as HTMLInputElement).value,
                ),
              })
            "
          />
          <span>{{ settings.backgroundOpacity }}%</span>
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.transparentText"
            @change="
              emit('update:settings', {
                transparentText: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          透明文字
        </label>
        <label v-if="settings.transparentText">
          文字不透明度
          <input
            type="range"
            min="0"
            max="100"
            :value="settings.textOpacity"
            @input="
              emit('update:settings', {
                textOpacity: Number(($event.target as HTMLInputElement).value),
              })
            "
          />
          <span>{{ settings.textOpacity }}%</span>
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.alwaysOnTop"
            @change="
              emit('update:settings', {
                alwaysOnTop: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          窗口置顶
        </label>
        <p class="hint">
          阅读时鼠标移到顶部显示工具栏；右键或 Ctrl+, 打开设置。滚轮在阅读区翻页；
          按住 Alt 拖动可移动窗口。透明模式下 0% 可透视桌面，100% 最接近实色
        </p>
      </section>

      <section class="section">
        <h3>翻页</h3>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.carryOverLinesEnabled"
            @change="
              emit('update:settings', {
                carryOverLinesEnabled: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          翻页时保留上一页末尾行
        </label>
        <label v-if="settings.carryOverLinesEnabled">
          保留行数
          <input
            type="number"
            min="1"
            max="20"
            step="1"
            :value="settings.carryOverLines"
            @change="
              emit('update:settings', {
                carryOverLines: Math.min(
                  20,
                  Math.max(
                    1,
                    Number(($event.target as HTMLInputElement).value) || 1,
                  ),
                ),
              })
            "
          />
        </label>
        <p class="hint">
          开启后，下一页顶部会重复显示上一页最后几行，便于衔接阅读
        </p>
      </section>

      <section class="section">
        <h3>工具栏样式</h3>
        <label>
          按钮颜色
          <input
            type="color"
            :value="settings.titleBarButtonColor"
            @input="
              emit('update:settings', {
                titleBarButtonColor: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.titleBarButtonTransparent"
            @change="
              emit('update:settings', {
                titleBarButtonTransparent: ($event.target as HTMLInputElement)
                  .checked,
              })
            "
          />
          透明按钮背景
        </label>
        <label v-if="settings.titleBarButtonTransparent">
          按钮背景不透明度
          <input
            type="range"
            min="0"
            max="100"
            :value="settings.titleBarButtonOpacity"
            @input="
              emit('update:settings', {
                titleBarButtonOpacity: Number(
                  ($event.target as HTMLInputElement).value,
                ),
              })
            "
          />
          <span>{{ settings.titleBarButtonOpacity }}%</span>
        </label>
      </section>

      <section v-if="progressTotal" class="section">
        <h3>阅读进度</h3>
        <label>
          跳转到 {{ progressPercent }}%
          <input
            type="range"
            min="0"
            max="100"
            :value="progressPercent"
            @input="onProgressInput"
          />
        </label>
      </section>

      <section class="section">
        <h3>导入与编码</h3>
        <label>
          TXT 编码
          <select
            :value="settings.textEncoding"
            @change="
              emit('update:settings', {
                textEncoding: ($event.target as HTMLSelectElement)
                  .value as ReaderSettings['textEncoding'],
              })
            "
          >
            <option value="auto">自动识别</option>
            <option value="utf-8">UTF-8</option>
            <option value="gbk">GBK</option>
          </select>
        </label>
        <label class="checkbox">
          <input
            type="checkbox"
            :checked="settings.collapseBlankLines"
            @change="
              emit('update:settings', {
                collapseBlankLines: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          导入时取消空行（紧凑排版）
        </label>
        <p class="hint">
          支持 TXT / MD / HTML / RTF / FB2 / EPUB / Word；纯文本自动对比 UTF-8/GBK
        </p>
      </section>

      <section class="section">
        <h3>快捷键</h3>
        <ShortcutRecorder
          :model-value="settings.toggleVisibilityShortcut"
          label="隐藏/显示"
          @update:model-value="
            emit('update:settings', { toggleVisibilityShortcut: $event })
          "
        />
        <PageKeyRecorder
          :model-value="settings.nextPageKey"
          label="下一页键"
          @update:model-value="
            emit('update:settings', { nextPageKey: $event })
          "
        />
        <PageKeyRecorder
          :model-value="settings.prevPageKey"
          label="上一页键"
          @update:model-value="
            emit('update:settings', { prevPageKey: $event })
          "
        />
        <p v-if="shortcutError" class="error">{{ shortcutError }}</p>
        <p class="hint">
          翻页：滚轮、方向键、自定义键；Ctrl+B 添加书签；「导」打开章节/书签
        </p>
      </section>
  </div>
</template>