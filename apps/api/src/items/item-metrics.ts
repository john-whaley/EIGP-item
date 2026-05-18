import { ItemStatus } from '@prisma/client';

const DAY_MS = 1000 * 60 * 60 * 24;

interface MetricsInput {
  price: number;
  purchaseDate: Date;
  expectedLifeDays?: number | null;
  endDate?: Date | null;
  updatedAt?: Date | null;
  status: ItemStatus;
  referenceDailyValue?: number | null;
  usageFrequency?: number | null;
  emotionScore?: number | null;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function getEffectiveEndDate(input: MetricsInput) {
  if (input.status === ItemStatus.ENDED) {
    return input.endDate ?? input.updatedAt ?? new Date();
  }

  if (input.status === ItemStatus.PAUSED) {
    return input.updatedAt ?? new Date();
  }

  return new Date();
}

export function getItemUsedDays(input: MetricsInput) {
  const effectiveEndDate = getEffectiveEndDate(input);
  const diff =
    startOfDay(effectiveEndDate).getTime() - startOfDay(input.purchaseDate).getTime();
  return Math.max(Math.floor(diff / DAY_MS), 1);
}

export function calculateItemMetrics(input: MetricsInput) {
  const usedDays = getItemUsedDays(input);
  const rawDailyValue = round(input.price / usedDays);
  const isCountingValue = input.status === ItemStatus.ACTIVE;
  const dailyValue = isCountingValue ? rawDailyValue : 0;
  const lifecycleDailyValue = input.expectedLifeDays
    ? round(input.price / Math.max(input.expectedLifeDays, 1))
    : rawDailyValue;
  const remainingDays = input.expectedLifeDays
    ? Math.max(input.expectedLifeDays - usedDays, 0)
    : null;
  const remainingValue =
    remainingDays !== null && isCountingValue ? round(remainingDays * rawDailyValue) : 0;
  const costPerformanceIndex =
    input.referenceDailyValue && rawDailyValue > 0
      ? round(input.referenceDailyValue / rawDailyValue, 3)
      : null;
  const frequencyWeight = input.usageFrequency
    ? round(Math.min(Math.max(input.usageFrequency / 30, 0.2), 1.5), 3)
    : 1;
  const weightedDailyValue = isCountingValue ? round(rawDailyValue * frequencyWeight) : 0;
  const emotionCostPerformance =
    input.emotionScore && rawDailyValue > 0
      ? round(input.emotionScore / rawDailyValue, 3)
      : null;
  const lifeProgress = input.expectedLifeDays
    ? round((usedDays / input.expectedLifeDays) * 100, 1)
    : null;

  return {
    usedDays,
    isCountingValue,
    dailyValue,
    rawDailyValue,
    lifecycleDailyValue,
    remainingDays,
    remainingValue,
    costPerformanceIndex,
    frequencyWeight,
    weightedDailyValue,
    emotionCostPerformance,
    lifeProgress
  };
}
