<template>
  <div class="split-title page-head">
    <div>
      <div class="badge-soft">{{ eyebrow }}</div>
      <h1 style="margin: 14px 0 8px; font-size: 30px">{{ title }}</h1>
      <div class="soft-muted" style="max-width: 760px; line-height: 1.7">{{ description }}</div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description: string;
    eyebrow?: string;
  }>(),
  {
    eyebrow: '工作台'
  }
);
</script>
