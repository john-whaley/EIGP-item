<template>
  <n-layout has-sider embedded position="absolute" style="inset: 0; background: transparent">
    <n-layout-sider
      collapse-mode="width"
      :collapsed-width="84"
      :width="288"
      bordered
      show-trigger
      content-style="padding: 18px 14px;"
      class="glass-panel"
    >
      <div style="display: flex; flex-direction: column; gap: 22px; height: 100%">
        <div>
          <div class="badge-soft">Email Identity Graph Platform</div>
          <h2 style="margin: 16px 0 6px; font-size: 24px">邮箱身份关系平台</h2>
          <div class="soft-muted" style="line-height: 1.7">
            统一管理主邮箱、辅助邮箱、注册号码、辅助号码和平台标签，并把它们组织成可检索、可追踪、可视化的关系网络。
          </div>
        </div>

        <n-menu :value="route.path" :options="menuOptions" @update:value="handleNavigate" />

        <div style="margin-top: auto">
          <n-card embedded size="small" class="glass-panel">
            <div class="soft-muted">当前账号</div>
            <div style="margin-top: 8px; font-weight: 700; font-size: 16px">
              {{ authStore.user?.nickname || '未登录' }}
            </div>
            <div class="soft-muted" style="margin-top: 4px">{{ authStore.user?.email }}</div>
            <n-button quaternary type="error" style="margin-top: 14px" @click="logout">
              退出登录
            </n-button>
          </n-card>
        </div>
      </div>
    </n-layout-sider>

    <n-layout content-style="padding: 24px 24px 32px; background: transparent;">
      <div class="glass-panel" style="padding: 18px 22px; border-radius: 22px; margin-bottom: 20px">
        <div class="split-title">
          <div>
            <div class="soft-muted">当前时间</div>
            <div style="font-size: 20px; font-weight: 700; margin-top: 4px">{{ todayLabel }}</div>
          </div>
          <div class="badge-soft">Email Identity Graph Platform</div>
        </div>
      </div>
      <router-view />
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NLayout, NLayoutSider, NMenu } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const menuOptions = [
  { label: '数据总览', key: '/dashboard' },
  { label: '实体目录', key: '/directory' },
  { label: '主邮箱管理', key: '/emails' },
  { label: '全局搜索', key: '/search' },
  { label: '关系图谱', key: '/graph-full' },
  { label: '系统设置', key: '/settings' }
];

const todayLabel = computed(() => dayjs().format('YYYY-MM-DD HH:mm'));

function handleNavigate(path: string) {
  router.push(path);
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>
