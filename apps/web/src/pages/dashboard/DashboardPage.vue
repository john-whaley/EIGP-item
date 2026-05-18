<template>
  <n-spin :show="loading">
    <div class="page-shell">
      <page-header
        title="数据总览"
        eyebrow="总览"
        description="从总量、关系边、最近更新和平台占用几个角度快速查看当前账号资产结构。"
      >
        <n-button secondary @click="loadOverview">刷新</n-button>
      </page-header>

      <div class="grid-cards">
        <stat-card label="主邮箱" :value="String(overview?.stats.primaryEmailCount ?? 0)" hint="核心账号入口" accent="blue" />
        <stat-card label="辅助邮箱" :value="String(overview?.stats.recoveryEmailCount ?? 0)" hint="找回链路补位" accent="teal" />
        <stat-card label="注册号码" :value="String(overview?.stats.registerPhoneCount ?? 0)" hint="注册凭据池" accent="amber" />
        <stat-card label="辅助号码" :value="String(overview?.stats.recoveryPhoneCount ?? 0)" hint="辅助找回线" accent="rose" />
        <stat-card label="平台标签" :value="String(overview?.stats.platformCount ?? 0)" hint="平台资产维度" accent="blue" />
        <stat-card label="关系边" :value="String(overview?.stats.relationshipCount ?? 0)" hint="图谱连接总数" accent="teal" />
      </div>

      <div class="grid-two">
        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <div class="split-title">
            <div>
              <h3 style="margin: 0">实体分布</h3>
              <div class="soft-muted" style="margin-top: 6px">各类实体当前数量占比</div>
            </div>
          </div>
          <base-chart :option="entityChartOption" />
        </n-card>

        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <div class="split-title">
            <div>
              <h3 style="margin: 0">平台占用情况</h3>
              <div class="soft-muted" style="margin-top: 6px">哪些标签绑定的主邮箱最多</div>
            </div>
          </div>
          <base-chart :option="platformChartOption" />
        </n-card>
      </div>

      <div class="grid-two">
        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <h3 style="margin-top: 0">最近主邮箱</h3>
          <div class="list-stack">
            <div v-for="item in overview?.recentPrimaryEmails || []" :key="item.id" class="entity-card">
              <div class="split-title">
                <div>
                  <strong>{{ item.email }}</strong>
                  <div class="soft-muted">{{ item.relationshipCount }} 条关系</div>
                </div>
                <n-tag round>{{ formatDate(item.updatedAt) }}</n-tag>
              </div>
            </div>
          </div>
        </n-card>

        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <h3 style="margin-top: 0">关联最密集的主邮箱</h3>
          <div class="list-stack">
            <div v-for="item in overview?.topConnectedEmails || []" :key="item.id" class="entity-card">
              <div class="split-title">
                <div>
                  <strong>{{ item.email }}</strong>
                  <div class="soft-muted">关系密度较高</div>
                </div>
                <div class="metric-caption">{{ item.count }} 条连接</div>
              </div>
            </div>
          </div>
        </n-card>
      </div>

      <div class="grid-two">
        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <h3 style="margin-top: 0">最近修改</h3>
          <div class="list-stack">
            <div v-for="item in overview?.recentUpdates || []" :key="item.id" class="entity-card">
              <strong>{{ item.title }}</strong>
              <div class="soft-muted">{{ item.subtitle }} · {{ formatDate(item.updatedAt) }}</div>
            </div>
          </div>
        </n-card>

        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <h3 style="margin-top: 0">最近关系变更</h3>
          <div class="list-stack">
            <div v-for="item in overview?.recentRelationships || []" :key="item.id" class="entity-card">
              <strong>{{ item.sourceLabel }} → {{ item.targetLabel }}</strong>
              <div class="soft-muted">{{ item.type }} · {{ formatDate(item.createdAt) }}</div>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { NButton, NCard, NSpin, NTag, useMessage } from 'naive-ui';
import type { EChartsOption } from 'echarts';
import { dashboardApi } from '@/api/services';
import BaseChart from '@/components/BaseChart.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import type { DashboardOverview } from '@/types';

const message = useMessage();
const loading = ref(false);
const overview = ref<DashboardOverview | null>(null);

const entityChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: ['38%', '72%'],
      label: { color: '#dce8f6' },
      data: (overview.value?.entityDistribution || []).map((item) => ({
        name: item.name,
        value: item.count
      }))
    }
  ]
}));

const platformChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: (overview.value?.platformDistribution || []).map((item) => item.name),
    axisLabel: { color: '#8ca5c6', rotate: 18 }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#8ca5c6' },
    splitLine: { lineStyle: { color: 'rgba(140, 165, 198, 0.12)' } }
  },
  series: [
    {
      type: 'bar',
      data: (overview.value?.platformDistribution || []).map((item) => item.count),
      itemStyle: { color: '#5eead4', borderRadius: [10, 10, 0, 0] }
    }
  ]
}));

function formatDate(value: string) {
  return dayjs(value).format('MM-DD HH:mm');
}

async function loadOverview() {
  loading.value = true;
  try {
    overview.value = await dashboardApi.overview();
  } catch (error: any) {
    message.error(error.response?.data?.message || '加载总览失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);
</script>
