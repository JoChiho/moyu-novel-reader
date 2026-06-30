<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  platformGetMoyuStats,
  platformOnMoyuStatsTick,
  platformResetMoyuStats,
} from "../services/platform";
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

const snapshot = ref<MoyuStatsSnapshot>({
  totalVisibleMs: 0,
  currentSessionMs: 0,
  combinedVisibleMs: 0,
  isRunning: false,
});

let unsubscribeTick: (() => void) | null = null;

const hourlyRate = computed(() => calcHourlyRate(props.settings));

const sessionMoney = computed(() =>
  calcSalaryAmount(snapshot.value.currentSessionMs, hourlyRate.value),
);

const totalMoney = computed(() =>
  calcSalaryAmount(snapshot.value.combinedVisibleMs, hourlyRate.value),
);

async function refreshSnapshot() {
  snapshot.value = await platformGetMoyuStats();
}

async function resetStats() {
  if (!window.confirm("确定清零全部摸鱼统计？此操作不可恢复。")) return;
  await platformResetMoyuStats();
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
      主窗口可见时累计时长；隐藏窗口（快捷键 / 托盘）后暂停。数据仅存本机。
    </p>

    <div class="moyu-stats-grid">
      <div class="moyu-stat-card">
        <span class="moyu-stat-label">本次摸鱼</span>
        <span class="moyu-stat-value">{{
          formatClockDuration(snapshot.currentSessionMs)
        }}</span>
        <span
          v-if="settings.salaryEnabled && settings.salaryMonthly > 0"
          class="moyu-stat-sub"
        >
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
        <span
          v-if="settings.salaryEnabled && settings.salaryMonthly > 0"
          class="moyu-stat-sub"
        >
          合计 {{ formatMoneyYuan(totalMoney) }}
        </span>
      </div>
    </div>

    <p v-if="snapshot.isRunning" class="moyu-running">计时中…</p>

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
        @change="
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
        @change="
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
        @change="
          emit('update:settings', {
            salaryHoursPerDay: Math.max(
              1,
              Number(($event.target as HTMLInputElement).value) || 8,
            ),
          })
        "
      />
    </label>

    <p v-if="settings.salaryEnabled && settings.salaryMonthly > 0" class="hint">
      时薪约 {{ formatMoneyYuan(hourlyRate) }} / 小时（按月薪 ÷ 工作天数 ÷ 每日工时）
    </p>

    <button type="button" class="moyu-reset-btn" @click="resetStats">
      清零统计
    </button>
  </section>
</template>