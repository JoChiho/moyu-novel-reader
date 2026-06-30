<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  platformGetMoyuStats,
  platformOnMoyuStatsTick,
  platformResetMoyuStats,
  platformSetMoyuTracking,
} from "../services/platform";
import { formatSessionRange } from "../utils/moyuHistory";
import {
  calcHourlyRate,
  calcSalaryAmount,
  formatClockDuration,
  formatLongDuration,
  formatMoneyYuan,
} from "../utils/moyuSalary";
import type { MoyuStatsSnapshot, ReaderSettings } from "../types";

const props = defineProps<{
  settings: ReaderSettings;
}>();

const emit = defineEmits<{
  "update:settings": [value: Partial<ReaderSettings>];
}>();

const emptySnapshot = (): MoyuStatsSnapshot => ({
  totalVisibleMs: 0,
  currentSessionMs: 0,
  combinedVisibleMs: 0,
  isRunning: false,
  weekVisibleMs: 0,
  monthVisibleMs: 0,
  sessions: [],
  trackingEnabled: true,
});

const snapshot = ref<MoyuStatsSnapshot>(emptySnapshot());

let unsubscribeTick: (() => void) | null = null;

const hourlyRate = computed(() => calcHourlyRate(props.settings));

const sessionMoney = computed(() =>
  calcSalaryAmount(snapshot.value.currentSessionMs, hourlyRate.value),
);

const totalMoney = computed(() =>
  calcSalaryAmount(snapshot.value.combinedVisibleMs, hourlyRate.value),
);

const weekMoney = computed(() =>
  calcSalaryAmount(snapshot.value.weekVisibleMs, hourlyRate.value),
);

const monthMoney = computed(() =>
  calcSalaryAmount(snapshot.value.monthVisibleMs, hourlyRate.value),
);

const showSalary = computed(
  () => props.settings.salaryEnabled && props.settings.salaryMonthly > 0,
);

async function refreshSnapshot() {
  snapshot.value = await platformGetMoyuStats();
}

async function resetStats() {
  if (
    !window.confirm(
      "确定清零全部摸鱼统计与历史记录？清零后需点击「开始计时」才会重新统计。",
    )
  ) {
    return;
  }
  await platformResetMoyuStats();
  await refreshSnapshot();
}

async function toggleTracking() {
  const next = !snapshot.value.trackingEnabled;
  await platformSetMoyuTracking(next);
  await refreshSnapshot();
}

onMounted(() => {
  void refreshSnapshot();
  unsubscribeTick = platformOnMoyuStatsTick((next) => {
    snapshot.value = next;
  });
});

onUnmounted(() => {
  unsubscribeTick?.();
});
</script>

<template>
  <section class="section moyu-stats-section">
    <h3>摸鱼计算器</h3>
    <p class="hint">
      主窗口可见时累计时长；隐藏窗口（快捷键 / 托盘）后暂停并写入历史。数据仅存本机。
    </p>

    <div class="moyu-stats-grid moyu-stats-grid-4">
      <div class="moyu-stat-card">
        <span class="moyu-stat-label">本次摸鱼</span>
        <span class="moyu-stat-value">{{
          formatClockDuration(snapshot.currentSessionMs)
        }}</span>
        <span v-if="showSalary" class="moyu-stat-sub">
          {{ formatMoneyYuan(sessionMoney) }}
        </span>
      </div>
      <div class="moyu-stat-card">
        <span class="moyu-stat-label">累计摸鱼</span>
        <span class="moyu-stat-value moyu-stat-value-sm">{{
          formatLongDuration(snapshot.combinedVisibleMs)
        }}</span>
        <span class="moyu-stat-sub mono">{{
          formatClockDuration(snapshot.combinedVisibleMs)
        }}</span>
        <span v-if="showSalary" class="moyu-stat-sub">
          合计 {{ formatMoneyYuan(totalMoney) }}
        </span>
      </div>
      <div class="moyu-stat-card">
        <span class="moyu-stat-label">本周摸鱼</span>
        <span class="moyu-stat-value moyu-stat-value-sm">{{
          formatLongDuration(snapshot.weekVisibleMs)
        }}</span>
        <span class="moyu-stat-sub mono">{{
          formatClockDuration(snapshot.weekVisibleMs)
        }}</span>
        <span v-if="showSalary" class="moyu-stat-sub">
          {{ formatMoneyYuan(weekMoney) }}
        </span>
      </div>
      <div class="moyu-stat-card">
        <span class="moyu-stat-label">本月摸鱼</span>
        <span class="moyu-stat-value moyu-stat-value-sm">{{
          formatLongDuration(snapshot.monthVisibleMs)
        }}</span>
        <span class="moyu-stat-sub mono">{{
          formatClockDuration(snapshot.monthVisibleMs)
        }}</span>
        <span v-if="showSalary" class="moyu-stat-sub">
          {{ formatMoneyYuan(monthMoney) }}
        </span>
      </div>
    </div>

    <div class="moyu-tracking-row">
      <p
        class="moyu-tracking-status"
        :class="{ 'moyu-tracking-active': snapshot.trackingEnabled && snapshot.isRunning }"
      >
        {{
          snapshot.trackingEnabled
            ? snapshot.isRunning
              ? "计时中…"
              : "计时已开启（主窗口隐藏时暂停）"
            : "计时已暂停"
        }}
      </p>
      <button
        type="button"
        class="moyu-tracking-btn"
        @click="toggleTracking"
      >
        {{ snapshot.trackingEnabled ? "暂停计时" : "开始计时" }}
      </button>
    </div>

    <label class="checkbox">
      <input
        type="checkbox"
        :checked="settings.salaryEnabled"
        @change="
          emit('update:settings', {
            salaryEnabled: ($event.target as HTMLInputElement).checked,
          })
        "
      />
      显示薪资换算
    </label>

    <label>
      月薪（元）
      <input
        type="number"
        min="0"
        step="100"
        :value="settings.salaryMonthly"
        @input="
          emit('update:settings', {
            salaryMonthly: Math.max(
              0,
              Number(($event.target as HTMLInputElement).value) || 0,
            ),
          })
        "
      />
    </label>

    <label>
      每月工作天数
      <input
        type="number"
        min="1"
        max="31"
        step="1"
        :value="settings.salaryWorkDaysPerMonth"
        @input="
          emit('update:settings', {
            salaryWorkDaysPerMonth: Math.max(
              1,
              Number(($event.target as HTMLInputElement).value) || 22,
            ),
          })
        "
      />
    </label>

    <label>
      每日工时（小时）
      <input
        type="number"
        min="1"
        max="24"
        step="0.5"
        :value="settings.salaryHoursPerDay"
        @input="
          emit('update:settings', {
            salaryHoursPerDay: Math.max(
              1,
              Number(($event.target as HTMLInputElement).value) || 8,
            ),
          })
        "
      />
    </label>

    <p v-if="showSalary" class="hint">
      时薪约 {{ formatMoneyYuan(hourlyRate) }} / 小时（按月薪 ÷ 工作天数 ÷ 每日工时）
    </p>

    <div class="moyu-history">
      <h4>摸鱼历史</h4>
      <p v-if="!snapshot.sessions.length" class="hint moyu-history-empty">
        暂无记录。每次隐藏主窗口后会保存一段会话（满 1 秒）。
      </p>
      <ul v-else class="moyu-history-list">
        <li v-for="session in snapshot.sessions" :key="session.id">
          <span class="moyu-history-range">{{
            formatSessionRange(session.startedAt, session.endedAt)
          }}</span>
          <span class="moyu-history-duration">{{
            formatLongDuration(session.durationMs)
          }}</span>
          <span v-if="showSalary" class="moyu-history-money">{{
            formatMoneyYuan(calcSalaryAmount(session.durationMs, hourlyRate))
          }}</span>
        </li>
      </ul>
    </div>

    <button type="button" class="moyu-reset-btn" @click="resetStats">
      清零统计
    </button>
  </section>
</template>