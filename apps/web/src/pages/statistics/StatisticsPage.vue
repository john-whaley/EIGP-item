<template>
  <div class="page-shell">
    <page-header
      title="全局搜索"
      eyebrow="搜索"
      description="按邮箱、号码、平台名或备注关键词搜索，快速回看一条身份线索最终挂到了哪些实体和标签上。"
    />

    <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
      <div class="split-title">
        <n-input
          v-model:value="keyword"
          clearable
          placeholder="输入邮箱、号码、平台或备注关键词"
          @keyup.enter="runSearch"
        />
        <n-button type="primary" :loading="loading" @click="runSearch">搜索</n-button>
      </div>
    </n-card>

    <div v-if="result" class="grid-cards">
      <stat-card label="总命中" :value="String(result.totals.all)" hint="跨实体聚合结果" accent="blue" />
      <stat-card label="主邮箱" :value="String(result.totals.primaryEmails)" hint="核心入口账号" accent="teal" />
      <stat-card label="辅助邮箱" :value="String(result.totals.recoveryEmails)" hint="恢复链路" accent="amber" />
      <stat-card label="号码" :value="String(result.totals.registerPhones + result.totals.recoveryPhones)" hint="注册 + 辅助号码" accent="rose" />
    </div>

    <div v-if="pagedGroups.length" class="entity-list">
      <n-card
        v-for="group in pagedGroups"
        :key="group.key"
        class="glass-panel"
        :bordered="false"
        style="border-radius: 22px"
      >
        <div class="split-title">
          <h3 style="margin: 0">{{ group.label }}</h3>
          <n-tag round>{{ group.count }} 条</n-tag>
        </div>
        <div class="list-stack" style="margin-top: 16px">
          <div v-for="item in group.visibleItems" :key="item.id" class="entity-card">
            <div class="split-title">
              <div>
                <strong>{{ item.title }}</strong>
                <div class="soft-muted">{{ item.subtitle }}</div>
              </div>
              <code v-if="item.password">{{ item.password }}</code>
            </div>
            <div v-if="item.note" class="entity-meta">{{ item.note }}</div>
            <div class="chip-row" v-if="item.related.length">
              <span class="soft-muted">关联信息</span>
              <span v-for="related in item.related" :key="related" class="mini-chip">{{ related }}</span>
            </div>
          </div>
        </div>
        <div v-if="group.count > pageSize" style="margin-top: 16px">
          <n-pagination
            v-model:page="groupPages[group.key]"
            :page-size="pageSize"
            :item-count="group.count"
            size="small"
          />
        </div>
      </n-card>
    </div>

    <n-empty v-else-if="result && !result.groups.length" description="没有匹配结果" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { NButton, NCard, NEmpty, NInput, NPagination, NTag, useMessage } from 'naive-ui';
import { searchApi } from '@/api/services';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import type { SearchResponse } from '@/types';

const pageSize = 5;
const message = useMessage();
const keyword = ref('');
const loading = ref(false);
const result = ref<SearchResponse | null>(null);
const groupPages = reactive<Record<string, number>>({});

const pagedGroups = computed(() => {
  if (!result.value) {
    return [];
  }

  return result.value.groups.map((group) => {
    const page = groupPages[group.key] || 1;
    const start = (page - 1) * pageSize;
    return {
      ...group,
      visibleItems: group.items.slice(start, start + pageSize)
    };
  });
});

async function runSearch() {
  loading.value = true;
  try {
    result.value = await searchApi.query(keyword.value);

    for (const key of Object.keys(groupPages)) {
      delete groupPages[key];
    }

    for (const group of result.value.groups) {
      groupPages[group.key] = 1;
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || '搜索失败');
  } finally {
    loading.value = false;
  }
}
</script>
