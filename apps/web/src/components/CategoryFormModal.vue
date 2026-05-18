<template>
  <n-modal
    :show="show"
    preset="card"
    title="分类设置"
    style="width: min(480px, calc(100vw - 24px))"
    @update:show="emit('update:show', $event)"
  >
    <n-form label-placement="top" :model="formModel">
      <n-form-item label="名称">
        <n-input v-model:value="formModel.name" placeholder="例如：云服务、课程、数码硬件" />
      </n-form-item>

      <n-form-item label="颜色">
        <n-input v-model:value="formModel.color" placeholder="#14b8a6" />
      </n-form-item>

      <n-form-item label="图标标识">
        <n-input v-model:value="formModel.icon" placeholder="例如：cloud-outline" />
      </n-form-item>
    </n-form>

    <template #action>
      <n-space justify="end">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="submit">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput, NModal, NSpace } from 'naive-ui';
import type { Category } from '@/types';

const props = withDefaults(
  defineProps<{
    show: boolean;
    saving?: boolean;
    initialValue?: Category | null;
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

const formModel = reactive({
  name: '',
  color: '',
  icon: ''
});

watch(
  () => [props.show, props.initialValue],
  () => {
    if (!props.show) {
      return;
    }

    Object.assign(formModel, {
      name: props.initialValue?.name ?? '',
      color: props.initialValue?.color ?? '',
      icon: props.initialValue?.icon ?? ''
    });
  },
  { immediate: true }
);

function submit() {
  emit('submit', {
    name: formModel.name.trim(),
    color: formModel.color.trim() || undefined,
    icon: formModel.icon.trim() || undefined
  });
}
</script>
