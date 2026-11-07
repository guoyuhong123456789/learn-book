<script setup lang="ts">
import { computed } from 'vue'
import { useCategoriesStore } from '@/stores/categories'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const categoriesStore = useCategoriesStore()

const value = computed({
  get: () => props.modelValue,
  set: (val: string[]) => emit('update:modelValue', val),
})

const options = computed(() =>
  categoriesStore.tags.map((tag) => ({ label: tag.name, value: tag.id })),
)
</script>

<template>
  <a-select
    v-model:value="value"
    mode="multiple"
    :options="options"
    placeholder="选择标签"
    allow-clear
    :max-tag-count="4"
    style="width: 100%"
  />
</template>
