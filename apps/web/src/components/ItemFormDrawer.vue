<template>
  <n-drawer :show="show" :width="540" @update:show="emit('update:show', $event)">
    <n-drawer-content :title="initialValue?.id ? '编辑物品' : '新增物品'" closable>
      <n-form label-placement="top" :model="formModel">
        <n-form-item label="物品名称">
          <n-input
            v-model:value="formModel.name"
            placeholder="例如：MacBook Pro、Steam 游戏、ChatGPT Plus"
          />
        </n-form-item>

        <n-form-item label="分类">
          <n-select
            v-model:value="formModel.categoryId"
            :options="categoryOptions"
            placeholder="选择一个物品分类"
          />
        </n-form-item>

        <n-form-item label="购买金额">
          <n-input-number
            v-model:value="formModel.price"
            style="width: 100%"
            :min="0"
            :precision="2"
          />
        </n-form-item>

        <n-form-item label="购买日期">
          <n-date-picker
            v-model:value="formModel.purchaseDate"
            type="date"
            :to="false"
            style="width: 100%"
            clearable
          />
        </n-form-item>

        <n-form-item label="状态">
          <n-radio-group v-model:value="formModel.status">
            <n-space>
              <n-radio-button value="ACTIVE">使用中</n-radio-button>
              <n-radio-button value="PAUSED">暂停</n-radio-button>
              <n-radio-button value="ENDED">已结束</n-radio-button>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="预计生命周期（天）">
          <n-input-number
            v-model:value="formModel.expectedLifeDays"
            style="width: 100%"
            :min="1"
            clearable
          />
        </n-form-item>

        <n-form-item label="结束日期">
          <n-date-picker
            v-model:value="formModel.endDate"
            type="date"
            :to="false"
            style="width: 100%"
            clearable
          />
        </n-form-item>

        <n-form-item label="参考日价值">
          <n-input-number
            v-model:value="formModel.referenceDailyValue"
            style="width: 100%"
            :min="0"
            :precision="2"
            clearable
          />
        </n-form-item>

        <n-form-item label="每 30 天使用频率">
          <n-input-number
            v-model:value="formModel.usageFrequency"
            style="width: 100%"
            :min="1"
            :max="30"
            clearable
          />
        </n-form-item>

        <n-form-item label="情绪价值评分（1-10）">
          <n-input-number
            v-model:value="formModel.emotionScore"
            style="width: 100%"
            :min="1"
            :max="10"
            clearable
          />
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
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace
} from 'naive-ui';
import type { Category, Item } from '@/types';

const props = withDefaults(
  defineProps<{
    show: boolean;
    saving?: boolean;
    categories: Category[];
    initialValue?: Item | null;
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

const defaultState = () => ({
  name: '',
  categoryId: null as number | null,
  price: null as number | null,
  purchaseDate: Date.now(),
  expectedLifeDays: null as number | null,
  endDate: null as number | null,
  status: 'ACTIVE',
  referenceDailyValue: null as number | null,
  usageFrequency: null as number | null,
  emotionScore: null as number | null,
  note: ''
});

const formModel = reactive(defaultState());

const categoryOptions = computed(() =>
  props.categories.map((category) => ({
    label: category.name,
    value: category.id
  }))
);

function normalizeTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }
  return new Date(value).getTime();
}

function syncForm() {
  Object.assign(formModel, defaultState());

  if (props.initialValue) {
    Object.assign(formModel, {
      name: props.initialValue.name,
      categoryId: props.initialValue.categoryId,
      price: props.initialValue.price,
      purchaseDate: normalizeTimestamp(props.initialValue.purchaseDate) ?? Date.now(),
      expectedLifeDays: props.initialValue.expectedLifeDays ?? null,
      endDate: normalizeTimestamp(props.initialValue.endDate ?? null),
      status: props.initialValue.status,
      referenceDailyValue: props.initialValue.referenceDailyValue ?? null,
      usageFrequency: props.initialValue.usageFrequency ?? null,
      emotionScore: props.initialValue.emotionScore ?? null,
      note: props.initialValue.note ?? ''
    });
  }
}

watch(
  () => [props.show, props.initialValue],
  () => {
    if (props.show) {
      syncForm();
    }
  },
  { immediate: true }
);

function submit() {
  emit('submit', {
    name: formModel.name.trim(),
    categoryId: formModel.categoryId,
    price: formModel.price,
    purchaseDate: formModel.purchaseDate
      ? dayjs(formModel.purchaseDate).format('YYYY-MM-DD')
      : undefined,
    expectedLifeDays: formModel.expectedLifeDays,
    endDate: formModel.endDate ? dayjs(formModel.endDate).format('YYYY-MM-DD') : undefined,
    status: formModel.status,
    referenceDailyValue: formModel.referenceDailyValue ?? undefined,
    usageFrequency: formModel.usageFrequency ?? undefined,
    emotionScore: formModel.emotionScore ?? undefined,
    note: formModel.note?.trim() || undefined
  });
}
</script>

