<template>
  <n-card class="glass-panel" :bordered="false" style="border-radius: 20px">
    <div class="soft-muted">{{ label }}</div>
    <div class="metric-value" :style="{ color: accentColor }">{{ value }}</div>
    <div class="metric-caption">{{ hint }}</div>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NCard } from 'naive-ui';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    hint?: string;
    accent?: 'teal' | 'blue' | 'amber' | 'rose';
  }>(),
  {
    hint: '',
    accent: 'teal'
  }
);

const accentColor = computed(() => {
  const map = {
    teal: '#5eead4',
    blue: '#93c5fd',
    amber: '#fdba74',
    rose: '#fda4af'
  };

  return map[props.accent];
});
</script>

