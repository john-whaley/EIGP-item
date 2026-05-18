<template>
  <n-drawer :show="show" :width="560" @update:show="emit('update:show', $event)">
    <n-drawer-content :title="model?.id ? '编辑主邮箱' : '新增主邮箱'" closable>
      <n-form label-placement="top" :model="form" style="display: grid; gap: 8px">
        <n-form-item label="主邮箱">
          <n-select
            v-model:value="form.emailKey"
            filterable
            clearable
            :options="emailOptions"
            placeholder="从邮箱目录中选择"
          />
        </n-form-item>
        <n-form-item label="密码">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="填写这个主邮箱对应的密码"
          />
        </n-form-item>
        <n-form-item label="注册号码">
          <n-select
            v-model:value="form.registerPhoneKeys"
            multiple
            filterable
            clearable
            :options="phoneOptions"
            placeholder="从手机目录中选择"
          />
        </n-form-item>
        <n-form-item label="辅助邮箱">
          <n-select
            v-model:value="form.recoveryEmailKeys"
            multiple
            filterable
            clearable
            :options="recoveryEmailOptions"
            placeholder="从邮箱目录中选择"
          />
        </n-form-item>
        <n-form-item label="辅助号码">
          <n-select
            v-model:value="form.recoveryPhoneKeys"
            multiple
            filterable
            clearable
            :options="phoneOptions"
            placeholder="从手机目录中选择"
          />
        </n-form-item>
        <n-form-item label="平台标签">
          <n-select
            v-model:value="form.platformIds"
            multiple
            filterable
            clearable
            :options="platformOptions"
            placeholder="可多选"
          />
        </n-form-item>
        <n-form-item label="备注">
          <n-input
            v-model:value="form.note"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="例如账号重要程度、用途、提醒事项等"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  type SelectOption
} from 'naive-ui';
import type { Platform, PrimaryEmail } from '@/types';

const props = defineProps<{
  show: boolean;
  saving?: boolean;
  model?: PrimaryEmail | null;
  emailOptions: SelectOption[];
  phoneOptions: SelectOption[];
  recoveryEmailOptions: SelectOption[];
  platforms: Platform[];
}>();

const emit = defineEmits<{
  'update:show': [boolean];
  submit: [
    {
      emailKey: string;
      password: string;
      note?: string;
      registerPhoneKeys: string[];
      recoveryEmailKeys: string[];
      recoveryPhoneKeys: string[];
      platformIds: string[];
    }
  ];
}>();

const form = reactive({
  emailKey: '',
  password: '',
  note: '',
  registerPhoneKeys: [] as string[],
  recoveryEmailKeys: [] as string[],
  recoveryPhoneKeys: [] as string[],
  platformIds: [] as string[]
});

const platformOptions = computed(() =>
  props.platforms.map((item) => ({
    label: `${item.name} / ${item.type}`,
    value: item.id
  }))
);

watch(
  () => [props.show, props.model] as const,
  () => {
    if (!props.show) {
      return;
    }

    form.emailKey = props.model?.email || '';
    form.password = props.model?.password || '';
    form.note = props.model?.note || '';
    form.registerPhoneKeys = props.model?.registerPhones.map((item) => item.label) || [];
    form.recoveryEmailKeys = props.model?.recoveryEmails.map((item) => item.email) || [];
    form.recoveryPhoneKeys = props.model?.recoveryPhones.map((item) => item.label) || [];
    form.platformIds = props.model?.platforms.map((item) => item.id) || [];
  },
  { immediate: true }
);

function handleSubmit() {
  emit('submit', {
    emailKey: form.emailKey,
    password: form.password,
    note: form.note,
    registerPhoneKeys: form.registerPhoneKeys,
    recoveryEmailKeys: form.recoveryEmailKeys,
    recoveryPhoneKeys: form.recoveryPhoneKeys,
    platformIds: form.platformIds
  });
}
</script>
