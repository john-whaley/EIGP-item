<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, darkTheme, dateZhCN, zhCN } from 'naive-ui';

const themeOverrides = {
  common: {
    primaryColor: '#14b8a6',
    primaryColorHover: '#2dd4bf',
    primaryColorPressed: '#0f766e',
    bodyColor: '#07131f',
    cardColor: '#102033',
    modalColor: '#102033',
    borderColor: '#1d3550',
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  }
};
</script>

