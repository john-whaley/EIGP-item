<template>
  <n-spin :show="loading">
    <div class="page-shell">
      <page-header
        title="关系图谱"
        eyebrow="图谱"
        description="悬停高亮关联链路，点击节点查看详情。这一页是整个 Email Identity Graph Platform 的核心视图。"
      >
        <n-button secondary @click="loadGraph">刷新图谱</n-button>
      </page-header>

      <div class="grid-cards">
        <stat-card label="主邮箱" :value="String(graph?.summary.primaryEmails ?? 0)" hint="图谱核心节点" accent="blue" />
        <stat-card label="辅助邮箱" :value="String(graph?.summary.recoveryEmails ?? 0)" hint="找回邮箱节点" accent="teal" />
        <stat-card label="号码" :value="String((graph?.summary.registerPhones ?? 0) + (graph?.summary.recoveryPhones ?? 0))" hint="注册 + 辅助号码" accent="amber" />
        <stat-card label="平台标签" :value="String(graph?.summary.platforms ?? 0)" hint="平台维度节点" accent="rose" />
        <stat-card label="关系边" :value="String(graph?.summary.relationships ?? 0)" hint="当前所有连接" accent="blue" />
      </div>

      <div class="grid-two graph-layout">
        <graph-canvas
          v-if="graph"
          :nodes="graph.nodes"
          :edges="graph.edges"
          :selected-id="selectedNode?.id || null"
          @select="selectedNode = $event"
        />

        <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
          <h3 style="margin-top: 0">详情面板</h3>
          <div v-if="selectedNode" class="detail-list">
            <div><strong>标题：</strong>{{ selectedNode.label }}</div>
            <div><strong>类型：</strong>{{ selectedNode.type }}</div>
            <div><strong>副标题：</strong>{{ selectedNode.subtitle }}</div>
            <div v-if="selectedNode.note"><strong>备注：</strong>{{ selectedNode.note }}</div>
            <div v-for="([key, value], index) in detailEntries" :key="`${selectedNode.id}-${index}`">
              <strong>{{ key }}：</strong>{{ formatDetail(value) }}
            </div>
          </div>
          <n-empty v-else description="点击图谱中的任意节点查看详情" />
        </n-card>
      </div>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NCard, NEmpty, NSpin, useMessage } from 'naive-ui';
import { graphApi } from '@/api/services';
import GraphCanvas from '@/components/GraphCanvas.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import type { GraphNode, GraphResponse } from '@/types';

const message = useMessage();
const loading = ref(false);
const graph = ref<GraphResponse | null>(null);
const selectedNode = ref<GraphNode | null>(null);

const detailEntries = computed(() => {
  if (!selectedNode.value) {
    return [];
  }

  return Object.entries(selectedNode.value.detail);
});

function formatDetail(value: unknown) {
  if (Array.isArray(value)) {
    return value.join('、');
  }

  return String(value ?? '');
}

async function loadGraph() {
  loading.value = true;
  try {
    graph.value = await graphApi.fetch();
    selectedNode.value = graph.value.nodes[0] || null;
  } catch (error: any) {
    message.error(error.response?.data?.message || '加载图谱失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadGraph);
</script>
