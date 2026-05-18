<template>
  <div class="page-shell">
    <page-header
      title="系统设置"
      eyebrow="设置"
      description="管理当前登录账号密码，并查看本地运行、Docker 部署和域名接入时需要的环境变量与命令。"
    />

    <div class="grid-two">
      <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
        <h3 style="margin-top: 0">当前账号</h3>
        <div class="entity-card">
          <strong>{{ authStore.user?.nickname }}</strong>
          <div class="soft-muted">{{ authStore.user?.email }}</div>
        </div>
      </n-card>

      <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
        <h3 style="margin-top: 0">修改密码</h3>
        <n-form label-placement="top">
          <n-form-item label="当前密码">
            <n-input
              v-model:value="passwordForm.currentPassword"
              type="password"
              show-password-on="click"
            />
          </n-form-item>
          <n-form-item label="新密码">
            <n-input
              v-model:value="passwordForm.newPassword"
              type="password"
              show-password-on="click"
            />
          </n-form-item>
          <n-button type="primary" :loading="saving" @click="handleChangePassword">
            保存新密码
          </n-button>
        </n-form>
      </n-card>
    </div>

    <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
      <h3 style="margin-top: 0">运行与部署提示</h3>
      <div class="list-stack">
        <div class="entity-card">
          <strong>本地开发</strong>
          <div class="soft-muted">1. 配好 `apps/api/.env` 里的 `DATABASE_URL`、`JWT_SECRET`、`APP_ENCRYPTION_KEY`。</div>
          <div class="soft-muted">2. 运行 `npm run prisma:generate`。</div>
          <div class="soft-muted">3. 在 PostgreSQL 中创建 `eigp` 数据库后执行 `npm run prisma:migrate`。</div>
          <div class="soft-muted">4. 运行 `npm run dev`，前端默认 `http://localhost:5173`，后端文档 `http://localhost:3000/docs`。</div>
        </div>
        <div class="entity-card">
          <strong>VPS Docker 部署</strong>
          <div class="soft-muted">1. 在项目根目录创建 `.env`，填好 `JWT_SECRET`、`APP_ENCRYPTION_KEY`、`DATABASE_URL`、`FRONTEND_URL`。</div>
          <div class="soft-muted">2. 运行 `docker compose up -d --build`。</div>
          <div class="soft-muted">3. 将域名 A 记录指向 VPS，直接访问宿主机 `80` 端口即可；如需 HTTPS，外层再接 Nginx / Caddy 反代。</div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const message = useMessage();
const saving = ref(false);
const passwordForm = reactive({
  currentPassword: '',
  newPassword: ''
});

async function handleChangePassword() {
  saving.value = true;
  try {
    const response = await authStore.changePassword(passwordForm);
    message.success(response.message || '密码已更新');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
  } catch (error: any) {
    message.error(error.response?.data?.message || '修改密码失败');
  } finally {
    saving.value = false;
  }
}
</script>
