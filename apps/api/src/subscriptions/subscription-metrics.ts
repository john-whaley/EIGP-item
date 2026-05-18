import { BillingCycle } from '@prisma/client';

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function getCycleDays(
  billingCycle: BillingCycle,
  startedAt?: Date | null,
  nextBillingDate?: Date | null
) {
  if (billingCycle === BillingCycle.MONTHLY) {
    return 30;
  }

  if (billingCycle === BillingCycle.YEARLY) {
    return 365;
  }

  if (startedAt && nextBillingDate) {
    const diff = nextBillingDate.getTime() - startedAt.getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
  }

  return 30;
}

export function calculateSubscriptionMetrics(input: {
  billingCycle: BillingCycle;
  price: number;
  isActive?: boolean;
  startedAt?: Date | null;
  nextBillingDate?: Date | null;
}) {
  const cycleDays = getCycleDays(input.billingCycle, input.startedAt, input.nextBillingDate);
  const rawDailyCost = round(input.price / cycleDays);
  const dailyCost = input.isActive === false ? 0 : rawDailyCost;
  const monthlyEquivalent = round(dailyCost * 30);

  return {
    cycleDays,
    dailyCost,
    rawDailyCost,
    monthlyEquivalent
  };
}

