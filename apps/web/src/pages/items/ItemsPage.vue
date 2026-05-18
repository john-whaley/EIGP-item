<template>
  <n-spin :show="loading">
    <div class="page-shell">
      <page-header
        title="主邮箱管理"
        eyebrow="主邮箱"
        description="主邮箱、辅助邮箱和号码都来自统一目录。你在不同字段里选中它们，就决定了它们在这条关系链中承担的角色。"
      >
        <n-space>
          <n-button secondary @click="loadAll">刷新</n-button>
          <n-button type="primary" @click="openCreate">新增主邮箱</n-button>
        </n-space>
      </page-header>

      <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
        <div class="split-title">
          <n-input
            v-model:value="search"
            clearable
            placeholder="搜索邮箱或备注"
            style="max-width: 320px"
            @keyup.enter="loadEmails"
          />
          <n-button secondary @click="loadEmails">搜索</n-button>
        </div>
      </n-card>

      <div v-if="emails.length" class="entity-list">
        <n-card
          v-for="item in pagedEmails"
          :key="item.id"
          class="glass-panel"
          :bordered="false"
          style="border-radius: 22px"
        >
          <div class="split-title">
            <div>
              <h3 style="margin: 0">{{ item.email }}</h3>
              <div class="soft-muted">{{ item.relationshipCount }} 条关系</div>
            </div>
            <n-space>
              <n-button secondary @click="openEdit(item)">编辑</n-button>
              <n-popconfirm @positive-click="handleDelete(item.id)">
                <template #trigger>
                  <n-button type="error" secondary>删除</n-button>
                </template>
                确认删除这个主邮箱吗？
              </n-popconfirm>
            </n-space>
          </div>

          <div class="entity-meta">
            <div><strong>密码：</strong><code>{{ item.password }}</code></div>
            <div v-if="item.note"><strong>备注：</strong>{{ item.note }}</div>
          </div>

          <div class="chip-row" v-if="item.registerPhones.length">
            <span class="soft-muted">注册号码</span>
            <span v-for="phone in item.registerPhones" :key="phone.id" class="mini-chip">
              {{ phone.label }}
            </span>
          </div>
          <div class="chip-row" v-if="item.recoveryEmails.length">
            <span class="soft-muted">辅助邮箱</span>
            <span v-for="email in item.recoveryEmails" :key="email.id" class="mini-chip">
              {{ email.email }}
            </span>
          </div>
          <div class="chip-row" v-if="item.recoveryPhones.length">
            <span class="soft-muted">辅助号码</span>
            <span v-for="phone in item.recoveryPhones" :key="phone.id" class="mini-chip">
              {{ phone.label }}
            </span>
          </div>
          <div class="chip-row" v-if="item.platforms.length">
            <span class="soft-muted">平台标签</span>
            <span v-for="platform in item.platforms" :key="platform.id" class="mini-chip">
              {{ platform.name }} / {{ platform.type }}
            </span>
          </div>
        </n-card>
      </div>

      <n-card
        v-if="emails.length > pageSize"
        class="glass-panel"
        :bordered="false"
        style="border-radius: 22px"
      >
        <n-pagination
          v-model:page="currentPage"
          :page-size="pageSize"
          :item-count="emails.length"
          size="large"
        />
      </n-card>

      <n-empty
        v-if="!loading && !emails.length"
        description="还没有主邮箱数据，先去实体目录准备邮箱或直接新增一个主邮箱"
      />
    </div>

    <primary-email-form-drawer
      v-model:show="drawerVisible"
      :saving="saving"
      :model="editingRecord"
      :email-options="primaryEmailOptions"
      :recovery-email-options="recoveryEmailOptions"
      :phone-options="phoneOptions"
      :platforms="platforms"
      @submit="handleSubmit"
    />
  </n-spin>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NEmpty,
  NInput,
  NPagination,
  NPopconfirm,
  NSpace,
  NSpin,
  useMessage
} from 'naive-ui';
import {
  emailsApi,
  platformsApi,
  recoveryEmailsApi,
  recoveryPhonesApi,
  registerPhonesApi
} from '@/api/services';
import PageHeader from '@/components/PageHeader.vue';
import PrimaryEmailFormDrawer from '@/components/PrimaryEmailFormDrawer.vue';
import type { Platform, PrimaryEmail, RecoveryEmail, RecoveryPhone, RegisterPhone } from '@/types';
import { extractErrorMessage } from '@/utils/error';

interface UnifiedEmailItem {
  key: string;
  label: string;
  primaryRecord?: PrimaryEmail;
  recoveryRecord?: RecoveryEmail;
}

interface UnifiedPhoneItem {
  key: string;
  label: string;
  countryCode: string;
  phone: string;
  note?: string | null;
  registerRecord?: RegisterPhone;
  recoveryRecord?: RecoveryPhone;
}

const message = useMessage();

const loading = ref(false);
const saving = ref(false);
const drawerVisible = ref(false);
const search = ref('');
const currentPage = ref(1);
const pageSize = 5;

const emails = ref<PrimaryEmail[]>([]);
const recoveryEmails = ref<RecoveryEmail[]>([]);
const registerPhones = ref<RegisterPhone[]>([]);
const recoveryPhones = ref<RecoveryPhone[]>([]);
const platforms = ref<Platform[]>([]);
const editingRecord = ref<PrimaryEmail | null>(null);

const pagedEmails = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return emails.value.slice(start, start + pageSize);
});

const unifiedEmails = computed<UnifiedEmailItem[]>(() => {
  const map = new Map<string, UnifiedEmailItem>();

  for (const item of emails.value) {
    map.set(item.email, {
      key: item.email,
      label: item.email,
      primaryRecord: item,
      recoveryRecord: map.get(item.email)?.recoveryRecord
    });
  }

  for (const item of recoveryEmails.value) {
    const existing = map.get(item.email);
    map.set(item.email, {
      key: item.email,
      label: item.email,
      primaryRecord: existing?.primaryRecord,
      recoveryRecord: item
    });
  }

  return [...map.values()].sort((left, right) => left.label.localeCompare(right.label));
});

const unifiedPhones = computed<UnifiedPhoneItem[]>(() => {
  const map = new Map<string, UnifiedPhoneItem>();

  for (const item of registerPhones.value) {
    map.set(item.label, {
      key: item.label,
      label: item.label,
      countryCode: item.countryCode,
      phone: item.phone,
      note: item.note,
      registerRecord: item,
      recoveryRecord: map.get(item.label)?.recoveryRecord
    });
  }

  for (const item of recoveryPhones.value) {
    const existing = map.get(item.label);
    map.set(item.label, {
      key: item.label,
      label: item.label,
      countryCode: item.countryCode,
      phone: item.phone,
      note: existing?.note || item.note,
      registerRecord: existing?.registerRecord,
      recoveryRecord: item
    });
  }

  return [...map.values()].sort((left, right) => left.label.localeCompare(right.label));
});

const primaryEmailOptions = computed(() =>
  unifiedEmails.value
    .filter((item) => !item.primaryRecord || item.primaryRecord.id === editingRecord.value?.id)
    .map((item) => ({
      label: item.label,
      value: item.key
    }))
);

const recoveryEmailOptions = computed(() =>
  unifiedEmails.value.map((item) => ({
    label: item.label,
    value: item.key
  }))
);

const phoneOptions = computed(() =>
  unifiedPhones.value.map((item) => ({
    label: item.label,
    value: item.key
  }))
);

async function loadReferenceData() {
  const [recoveryEmailList, registerPhoneList, recoveryPhoneList, platformList] = await Promise.all([
    recoveryEmailsApi.list(),
    registerPhonesApi.list(),
    recoveryPhonesApi.list(),
    platformsApi.list()
  ]);

  recoveryEmails.value = recoveryEmailList;
  registerPhones.value = registerPhoneList;
  recoveryPhones.value = recoveryPhoneList;
  platforms.value = platformList;
}

async function loadEmails() {
  emails.value = await emailsApi.list(search.value ? { search: search.value } : undefined);
  currentPage.value = 1;
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadReferenceData(), loadEmails()]);
  } catch (error: any) {
    message.error(extractErrorMessage(error, '加载主邮箱数据失败'));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingRecord.value = null;
  drawerVisible.value = true;
}

function openEdit(item: PrimaryEmail) {
  editingRecord.value = item;
  drawerVisible.value = true;
}

async function ensureRecoveryEmailKey(key: string, cache: Map<string, string>) {
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const target = unifiedEmails.value.find((item) => item.key === key);

  if (!target) {
    throw new Error(`未找到邮箱目录项：${key}`);
  }

  if (target.recoveryRecord) {
    cache.set(key, target.recoveryRecord.id);
    return target.recoveryRecord.id;
  }

  const created = await recoveryEmailsApi.create({
    email: target.label,
    note: target.primaryRecord?.note || ''
  });
  cache.set(key, created.id);
  return created.id;
}

async function ensureRegisterPhoneKey(key: string, cache: Map<string, string>) {
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const target = unifiedPhones.value.find((item) => item.key === key);

  if (!target) {
    throw new Error(`未找到手机目录项：${key}`);
  }

  if (target.registerRecord) {
    cache.set(key, target.registerRecord.id);
    return target.registerRecord.id;
  }

  const created = await registerPhonesApi.create({
    countryCode: target.countryCode,
    phone: target.phone,
    note: target.note || ''
  });
  cache.set(key, created.id);
  return created.id;
}

async function ensureRecoveryPhoneKey(key: string, cache: Map<string, string>) {
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const target = unifiedPhones.value.find((item) => item.key === key);

  if (!target) {
    throw new Error(`未找到手机目录项：${key}`);
  }

  if (target.recoveryRecord) {
    cache.set(key, target.recoveryRecord.id);
    return target.recoveryRecord.id;
  }

  const created = await recoveryPhonesApi.create({
    countryCode: target.countryCode,
    phone: target.phone,
    note: target.note || ''
  });
  cache.set(key, created.id);
  return created.id;
}

async function handleSubmit(payload: {
  emailKey: string;
  password: string;
  note?: string;
  registerPhoneKey?: string;
  recoveryEmailKey?: string;
  recoveryPhoneKey?: string;
  platformIds: string[];
}) {
  saving.value = true;
  try {
    const selectedMainEmail = unifiedEmails.value.find((item) => item.key === payload.emailKey);

    if (!selectedMainEmail) {
      throw new Error('请选择一个主邮箱');
    }

    if (payload.recoveryEmailKey && payload.recoveryEmailKey === payload.emailKey) {
      throw new Error('辅助邮箱不能选择自己');
    }

    const recoveryEmailCache = new Map<string, string>();
    const registerPhoneCache = new Map<string, string>();
    const recoveryPhoneCache = new Map<string, string>();

    const [recoveryEmailIds, registerPhoneIds, recoveryPhoneIds] = await Promise.all([
      payload.recoveryEmailKey
        ? Promise.all([ensureRecoveryEmailKey(payload.recoveryEmailKey, recoveryEmailCache)])
        : Promise.resolve([]),
      payload.registerPhoneKey
        ? Promise.all([ensureRegisterPhoneKey(payload.registerPhoneKey, registerPhoneCache)])
        : Promise.resolve([]),
      payload.recoveryPhoneKey
        ? Promise.all([ensureRecoveryPhoneKey(payload.recoveryPhoneKey, recoveryPhoneCache)])
        : Promise.resolve([])
    ]);

    const requestPayload = {
      email: selectedMainEmail.label,
      password: payload.password,
      note: payload.note,
      recoveryEmailIds,
      registerPhoneIds,
      recoveryPhoneIds,
      platformIds: payload.platformIds
    };

    if (editingRecord.value) {
      await emailsApi.update(editingRecord.value.id, requestPayload);
      message.success('主邮箱已更新');
    } else {
      await emailsApi.create(requestPayload);
      message.success('主邮箱已新增');
    }

    drawerVisible.value = false;
    await loadAll();
  } catch (error: any) {
    message.error(extractErrorMessage(error, '保存主邮箱失败'));
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  try {
    await emailsApi.remove(id);
    message.success('主邮箱已删除');
    await loadEmails();
    if (currentPage.value > Math.ceil(emails.value.length / pageSize) && currentPage.value > 1) {
      currentPage.value -= 1;
    }
  } catch (error: any) {
    message.error(extractErrorMessage(error, '删除主邮箱失败'));
  }
}

onMounted(loadAll);
</script>
