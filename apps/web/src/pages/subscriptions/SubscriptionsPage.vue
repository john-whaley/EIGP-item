<template>
  <div class="page-shell">
    <page-header
      title="实体目录"
      eyebrow="实体目录"
      description="这里维护统一的邮箱目录、手机目录和平台标签。主邮箱表单里选到哪个字段，就以那个字段的角色参与关系。"
    />

    <n-card class="glass-panel" :bordered="false" style="border-radius: 22px">
      <div class="split-title">
        <n-tabs v-model:value="activeTab" animated type="segment">
          <n-tab-pane name="emails" tab="邮箱目录" />
          <n-tab-pane name="phones" tab="手机目录" />
          <n-tab-pane name="platforms" tab="平台标签" />
        </n-tabs>
        <n-space>
          <n-input
            v-model:value="search"
            clearable
            style="width: 280px"
            placeholder="按当前标签搜索"
          />
          <n-button type="primary" @click="openCreate">新增</n-button>
        </n-space>
      </div>
    </n-card>

    <div v-if="pagedItems.length" class="entity-list">
      <n-card
        v-for="item in pagedItems"
        :key="item.id"
        class="glass-panel"
        :bordered="false"
        style="border-radius: 22px"
      >
        <div class="split-title">
          <div>
            <h3 style="margin: 0">{{ item.title }}</h3>
            <div class="soft-muted">{{ item.subtitle }}</div>
          </div>
          <n-space>
            <n-tag round>{{ item.associationCount }} 个关联</n-tag>
            <n-button secondary @click="openEdit(item.raw)">编辑</n-button>
            <n-popconfirm @positive-click="handleDelete(item.raw)">
              <template #trigger>
                <n-button type="error" secondary>删除</n-button>
              </template>
              确认删除这条记录吗？
            </n-popconfirm>
          </n-space>
        </div>

        <div class="entity-meta" v-if="item.note">
          <div><strong>备注：</strong>{{ item.note }}</div>
        </div>

        <div class="chip-row" v-if="item.related.length">
          <span class="soft-muted">关联信息</span>
          <span v-for="label in item.related" :key="label" class="mini-chip">{{ label }}</span>
        </div>
      </n-card>
    </div>

    <n-card
      v-if="filteredItems.length > pageSize"
      class="glass-panel"
      :bordered="false"
      style="border-radius: 22px"
    >
      <n-pagination
        v-model:page="currentPage"
        :page-size="pageSize"
        :item-count="filteredItems.length"
        size="large"
      />
    </n-card>

    <n-empty v-if="!filteredItems.length" description="当前分类下还没有数据" />

    <n-modal
      v-model:show="modalVisible"
      preset="card"
      style="width: min(560px, 92vw)"
      :title="modalTitle"
    >
      <n-form label-placement="top">
        <template v-if="activeTab === 'emails'">
          <n-form-item label="邮箱">
            <n-input v-model:value="form.email" placeholder="name@example.com" />
          </n-form-item>
        </template>

        <template v-else-if="activeTab === 'phones'">
          <div class="grid-two">
            <n-form-item label="国家区号">
              <n-input v-model:value="form.countryCode" placeholder="+86" />
            </n-form-item>
            <n-form-item label="号码">
              <n-input v-model:value="form.phone" placeholder="13800000000" />
            </n-form-item>
          </div>
        </template>

        <template v-else>
          <div class="grid-two">
            <n-form-item label="标签名称">
              <n-input v-model:value="form.name" placeholder="例如：OpenAI、Github、Claude" />
            </n-form-item>
            <n-form-item label="标签分类">
              <n-select v-model:value="form.type" :options="platformTypeOptions" />
            </n-form-item>
          </div>
        </template>

        <n-form-item label="备注">
          <n-input
            v-model:value="form.note"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </n-form-item>
        <n-space justify="end">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
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
import type { Platform, PrimaryEmail, RecoveryEmail, RecoveryPhone, RegisterPhone } from '@/types';
import { extractErrorMessage } from '@/utils/error';

type DirectoryTab = 'emails' | 'phones' | 'platforms';
type DirectoryRecord = Platform | CombinedPhoneItem | CombinedEmailItem;

interface CombinedPhoneItem {
  id: string;
  label: string;
  note?: string | null;
  associationCount: number;
  related: string[];
  registerRecord?: RegisterPhone;
  recoveryRecord?: RecoveryPhone;
}

interface CombinedEmailItem {
  id: string;
  email: string;
  note?: string | null;
  associationCount: number;
  related: string[];
  primaryRecord?: PrimaryEmail;
  recoveryRecord?: RecoveryEmail;
}

const pageSize = 5;
const message = useMessage();
const activeTab = ref<DirectoryTab>('emails');
const search = ref('');
const currentPage = ref(1);
const saving = ref(false);
const modalVisible = ref(false);
const editingRecord = ref<DirectoryRecord | null>(null);

const primaryEmails = ref<PrimaryEmail[]>([]);
const recoveryEmails = ref<RecoveryEmail[]>([]);
const registerPhones = ref<RegisterPhone[]>([]);
const recoveryPhones = ref<RecoveryPhone[]>([]);
const platforms = ref<Platform[]>([]);

const platformTypeOptions = [
  { label: '平台', value: '平台' },
  { label: 'AI 工具', value: 'AI 工具' },
  { label: '代码托管', value: '代码托管' },
  { label: '邮箱服务', value: '邮箱服务' },
  { label: '社交平台', value: '社交平台' },
  { label: '云服务', value: '云服务' },
  { label: '其他', value: '其他' }
];

const form = reactive({
  email: '',
  countryCode: '',
  phone: '',
  name: '',
  type: '平台',
  note: ''
});

const modalTitle = computed(() => (editingRecord.value ? '编辑记录' : '新增记录'));

const combinedEmails = computed<CombinedEmailItem[]>(() => {
  const map = new Map<string, CombinedEmailItem>();

  for (const item of primaryEmails.value) {
    map.set(item.email, {
      id: item.email,
      email: item.email,
      note: item.note,
      associationCount: item.relationshipCount,
      related: [
        ...item.recoveryEmails.map((entry) => `辅助邮箱：${entry.email}`),
        ...item.registerPhones.map((entry) => `注册号码：${entry.label}`),
        ...item.recoveryPhones.map((entry) => `辅助号码：${entry.label}`),
        ...item.platforms.map((entry) => `标签：${entry.name}`)
      ],
      primaryRecord: item,
      recoveryRecord: map.get(item.email)?.recoveryRecord
    });
  }

  for (const item of recoveryEmails.value) {
    const existing = map.get(item.email);
    map.set(item.email, {
      id: item.email,
      email: item.email,
      note: existing?.note || item.note,
      associationCount: Math.max(existing?.associationCount || 0, item.associationCount),
      related: [
        ...(existing?.related || []),
        ...item.associatedEmails.map((email) => `关联主邮箱：${email.email}`)
      ],
      primaryRecord: existing?.primaryRecord,
      recoveryRecord: item
    });
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      related: [...new Set(item.related)]
    }))
    .sort((left, right) => left.email.localeCompare(right.email));
});

const combinedPhones = computed<CombinedPhoneItem[]>(() => {
  const map = new Map<string, CombinedPhoneItem>();

  for (const item of registerPhones.value) {
    map.set(item.label, {
      id: item.label,
      label: item.label,
      note: item.note,
      associationCount: item.associationCount,
      related: item.associatedEmails.map((email) => `关联主邮箱：${email.email}`),
      registerRecord: item,
      recoveryRecord: map.get(item.label)?.recoveryRecord
    });
  }

  for (const item of recoveryPhones.value) {
    const existing = map.get(item.label);
    map.set(item.label, {
      id: item.label,
      label: item.label,
      note: existing?.note || item.note,
      associationCount: Math.max(existing?.associationCount || 0, item.associationCount),
      related: [...(existing?.related || []), ...item.associatedEmails.map((email) => `关联主邮箱：${email.email}`)],
      registerRecord: existing?.registerRecord,
      recoveryRecord: item
    });
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      related: [...new Set(item.related)]
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
});

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (activeTab.value === 'emails') {
    return combinedEmails.value
      .filter((item) =>
        keyword ? [item.email, item.note || '', ...item.related].join(' ').toLowerCase().includes(keyword) : true
      )
      .map((item) => ({
        id: item.id,
        title: item.email,
        subtitle: '邮箱目录项',
        note: item.note,
        associationCount: item.associationCount,
        related: item.related,
        raw: item as DirectoryRecord
      }));
  }

  if (activeTab.value === 'phones') {
    return combinedPhones.value
      .filter((item) =>
        keyword ? [item.label, item.note || '', ...item.related].join(' ').toLowerCase().includes(keyword) : true
      )
      .map((item) => ({
        id: item.id,
        title: item.label,
        subtitle: '手机目录项',
        note: item.note,
        associationCount: item.associationCount,
        related: item.related,
        raw: item as DirectoryRecord
      }));
  }

  return platforms.value
    .filter((item) =>
      keyword
        ? [item.name, item.type, item.note || '', ...item.associatedEmails.map((email) => email.email)]
            .join(' ')
            .toLowerCase()
            .includes(keyword)
        : true
    )
    .map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.type,
      note: item.note,
      associationCount: item.associationCount,
      related: item.associatedEmails.map((email) => `关联主邮箱：${email.email}`),
      raw: item as DirectoryRecord
    }));
});

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredItems.value.slice(start, start + pageSize);
});

watch([activeTab, search], () => {
  currentPage.value = 1;
});

function resetForm() {
  form.email = '';
  form.countryCode = '';
  form.phone = '';
  form.name = '';
  form.type = '平台';
  form.note = '';
}

function openCreate() {
  editingRecord.value = null;
  resetForm();
  modalVisible.value = true;
}

function openEdit(record: DirectoryRecord) {
  editingRecord.value = record;
  resetForm();

  if (activeTab.value === 'emails') {
    const emailRecord = record as CombinedEmailItem;
    form.email = emailRecord.email;
    form.note = emailRecord.note || '';
  } else if (activeTab.value === 'phones') {
    const phoneRecord = record as CombinedPhoneItem;
    const [countryCode, phone] = phoneRecord.id.split(' ');
    form.countryCode = countryCode;
    form.phone = phone;
    form.note = phoneRecord.note || '';
  } else {
    const platform = record as Platform;
    form.name = platform.name;
    form.type = platform.type;
    form.note = platform.note || '';
  }

  modalVisible.value = true;
}

async function loadAll() {
  const [primaryEmailList, recoveryEmailList, registerPhoneList, recoveryPhoneList, platformList] =
    await Promise.all([
      emailsApi.list(),
      recoveryEmailsApi.list(),
      registerPhonesApi.list(),
      recoveryPhonesApi.list(),
      platformsApi.list()
    ]);

  primaryEmails.value = primaryEmailList;
  recoveryEmails.value = recoveryEmailList;
  registerPhones.value = registerPhoneList;
  recoveryPhones.value = recoveryPhoneList;
  platforms.value = platformList;
}

async function handleSubmit() {
  saving.value = true;
  try {
    if (activeTab.value === 'emails') {
      const payload = { email: form.email, note: form.note };
      const current = editingRecord.value as CombinedEmailItem | null;

      if (current?.recoveryRecord) {
        await recoveryEmailsApi.update(current.recoveryRecord.id, payload);
      } else {
        await recoveryEmailsApi.create(payload);
      }
    } else if (activeTab.value === 'phones') {
      const current = editingRecord.value as CombinedPhoneItem | null;
      const payload = { countryCode: form.countryCode, phone: form.phone, note: form.note };

      if (current?.registerRecord) {
        await registerPhonesApi.update(current.registerRecord.id, payload);
      } else {
        await registerPhonesApi.create(payload);
      }

      if (current?.recoveryRecord) {
        await recoveryPhonesApi.update(current.recoveryRecord.id, payload);
      } else {
        await recoveryPhonesApi.create(payload);
      }
    } else {
      const payload = { name: form.name, type: form.type, note: form.note };
      if (editingRecord.value) {
        await platformsApi.update((editingRecord.value as Platform).id, payload);
      } else {
        await platformsApi.create(payload);
      }
    }

    modalVisible.value = false;
    message.success('保存成功');
    await loadAll();
  } catch (error: any) {
    message.error(extractErrorMessage(error, '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function handleDelete(record: DirectoryRecord) {
  try {
    if (activeTab.value === 'emails') {
      const emailRecord = record as CombinedEmailItem;
      if (emailRecord.primaryRecord) {
        throw new Error('该邮箱已被主邮箱使用，请先在主邮箱管理中处理后再删除目录项');
      }

      if (emailRecord.recoveryRecord) {
        await recoveryEmailsApi.remove(emailRecord.recoveryRecord.id);
      }
    } else if (activeTab.value === 'phones') {
      const phoneRecord = record as CombinedPhoneItem;
      await Promise.all([
        phoneRecord.registerRecord ? registerPhonesApi.remove(phoneRecord.registerRecord.id) : Promise.resolve(),
        phoneRecord.recoveryRecord ? recoveryPhonesApi.remove(phoneRecord.recoveryRecord.id) : Promise.resolve()
      ]);
    } else {
      await platformsApi.remove((record as Platform).id);
    }

    message.success('删除成功');
    await loadAll();
    if (
      currentPage.value > Math.ceil(filteredItems.value.length / pageSize) &&
      currentPage.value > 1
    ) {
      currentPage.value -= 1;
    }
  } catch (error: any) {
    message.error(extractErrorMessage(error, '删除失败'));
  }
}

onMounted(loadAll);
</script>
