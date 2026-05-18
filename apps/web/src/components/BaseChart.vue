<template>
  <div ref="chartRef" class="chart-box" :style="{ height: typeof height === 'number' ? `${height}px` : height }"></div>
</template>

<script setup lang="ts">
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent
} from 'echarts/components';
import {
  CanvasRenderer
} from 'echarts/renderers';
import {
  init,
  type ECharts,
  type EChartsCoreOption,
  use
} from 'echarts/core';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

use([BarChart, LineChart, PieChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const props = withDefaults(
  defineProps<{
    option: EChartsCoreOption;
    height?: number | string;
  }>(),
  {
    height: 320
  }
);

const chartRef = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function renderChart() {
  if (!chartRef.value) {
    return;
  }

  if (!chart) {
    chart = init(chartRef.value);
  }

  chart.setOption(props.option, true);
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  if (chartRef.value) {
    resizeObserver.observe(chartRef.value);
  }
  window.addEventListener('resize', renderChart);
});

watch(
  () => props.option,
  () => {
    renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', renderChart);
  chart?.dispose();
  chart = null;
});
</script>
