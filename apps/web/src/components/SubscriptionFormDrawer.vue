<template>
  <n-drawer :show="show" :width="520" @update:show="emit('update:show', $event)">
    <n-drawer-content :title="initialValue?.id ? '编辑周期性支出' : '新增周期性支出'" closable>
      <n-form label-placement="top" :model="formModel">
        <n-form-item label="名称">
          <n-input
            v-model:value="formModel.name"
            placeholder="例如：手机话费、ChatGPT Plus、阿里云 ECS、Netflix"
          />
        </n-form-item>

        <n-form-item label="分类">
          <n-select
            v-model:value="formModel.categoryId"
            :options="categoryOptions"
            clearable
            placeholder="例如：话费、水电、云服务、视频会员"
          />
        </n-form-item>

        <n-form-item label="计费周期">
          <n-select v-model:value="formModel.billingCycle" :options="billingOptions" />
        </n-form-item>

        <n-form-item label="费用">
          <n-input-number
            v-model:value="formModel.price"
            style="width: 100%"
            :min="0"
            :precision="2"
          />
        </n-form-item>

        <n-form-item label="起始日期">
          <n-date-picker
            v-model:value="formModel.startedAt"
            type="date"
            :to="false"
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item label="下一次扣费日期">
          <n-date-picker
            v-model:value="formModel.nextBillingDate"
            type="date"
            :to="false"
            style="width: 100%"
            clearable
          />
        </n-form-item>

        <n-form-item label="自动续费">
          <n-switch v-model:value="formModel.autoRenew" />
        </n-form-item>

        <n-form-item label="启用状态">
          <n-switch v-model:value="formModel.isActive" />
        </n-form-item>

        <n-form-item label="备注">
          <n-input
            v-model:value="formModel.note"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" :loading="saving" @click="submit">保存</n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, reactive, watch } from 'vue';
import {
  NButton,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch
} from 'naive-ui';
import type { Category, Subscription } from '@/types';

const props = withDefaults(
  defineProps<{
    show: boolean;
    saving?: boolean;
    categories: Category[];
    initialValue?: Subscription | null;
  }>(),
  {
    saving: false,
    initialValue: null
  }
);

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void;
  (event: 'submit', value: Record<string, unknown>): void;
}>();

const billingOptions = [
  { label: '月度', value: 'MONTHLY' },
  { label: '年度', value: 'YEARLY' },
  { label: '自定义', value: 'CUSTOM' }
];

const categoryOptions = computed(() =>
  props.categories.map((category) => ({
    label: category.name,
    value: category.id
  }))
);

const defaultState = () => ({
  categoryId: null as number | null,
  name: '',
  billingCycle: 'MONTHLY',
  price: null as number | null,
  startedAt: Date.now(),
  nextBillingDate: null as number | null,
  autoRenew: true,
  isActive: true,
  note: ''
});

const formModel = reactive(defaultState());

function normalizeTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value).getTime();
}

watch(
  () => [props.show, props.initialValue],
  () => {
    if (!props.show) {
      return;
    }

    Object.assign(formModel, defaultState());
    if (props.initialValue) {
      Object.assign(formModel, {
        categoryId: props.initialValue.categoryId ?? null,
        name: props.initialValue.name,
        billingCycle: props.initialValue.billingCycle,
        price: props.initialValue.price,
        startedAt: normalizeTimestamp(props.initialValue.startedAt) ?? Date.now(),
        nextBillingDate: normalizeTimestamp(props.initialValue.nextBillingDate ?? null),
        autoRenew: props.initialValue.autoRenew,
        isActive: props.initialValue.isActive,
        note: props.initialValue.note ?? ''
      });
    }
  },
  { immediate: true }
);

function submit() {
  emit('submit', {
    categoryId: formModel.categoryId ?? undefined,
    name: formModel.name.trim(),
    billingCycle: formModel.billingCycle,
    price: formModel.price,
    startedAt: formModel.startedAt ? dayjs(formModel.startedAt).format('YYYY-MM-DD') : undefined,
    nextBillingDate: formModel.nextBillingDate
      ? dayjs(formModel.nextBillingDate).format('YYYY-MM-DD')
      : undefined,
    autoRenew: formModel.autoRenew,
    isActive: formModel.isActive,
    note: formModel.note?.trim() || undefined
  });
}
</script>
