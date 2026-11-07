<script setup lang="ts">
import {
  BookOutlined,
  FolderOutlined,
  StarOutlined,
} from '@ant-design/icons-vue'
import type { Category } from '@/types'

defineProps<{
  categories: Category[]
  counts: Record<string, number>
  total: number
  starredCount: number
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

interface Item {
  key: string
  label: string
  count: number
  color?: string
  icon: 'all' | 'star' | 'folder'
}

function buildItems(
  categories: Category[],
  counts: Record<string, number>,
  total: number,
  starredCount: number,
): Item[] {
  return [
    { key: 'all', label: '全部笔记', count: total, icon: 'all' },
    { key: 'starred', label: '收藏', count: starredCount, icon: 'star' },
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      count: counts[category.id] ?? 0,
      color: category.color,
      icon: 'folder' as const,
    })),
  ]
}
</script>

<template>
  <div class="category-tree">
    <div class="category-tree-title">知识分类</div>
    <button
      v-for="item in buildItems(categories, counts, total, starredCount)"
      :key="item.key"
      class="category-item"
      :class="{ active: modelValue === item.key }"
      type="button"
      @click="emit('update:modelValue', item.key)"
    >
      <span class="category-item-icon">
        <BookOutlined v-if="item.icon === 'all'" />
        <StarOutlined v-else-if="item.icon === 'star'" />
        <FolderOutlined v-else :style="{ color: item.color }" />
      </span>
      <span class="category-item-label">{{ item.label }}</span>
      <span class="category-item-count">{{ item.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.category-tree {
  background: var(--km-card-bg);
  border: 1px solid var(--km-border);
  border-radius: 12px;
  padding: 14px 10px;
}

.category-tree-title {
  padding: 4px 10px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--km-text-secondary);
  text-transform: uppercase;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--km-text);
  font-size: 14px;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;
}

.category-item:hover {
  background: var(--km-hover-bg);
}

.category-item.active {
  background: rgba(22, 119, 255, 0.1);
  color: var(--km-primary);
  font-weight: 500;
}

.category-item-icon {
  display: inline-flex;
  font-size: 15px;
  color: inherit;
}

.category-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-item-count {
  font-size: 12px;
  color: var(--km-text-secondary);
  background: var(--km-hover-bg);
  border-radius: 10px;
  padding: 0 8px;
  min-width: 22px;
  text-align: center;
}

.category-item.active .category-item-count {
  color: var(--km-primary);
  background: rgba(22, 119, 255, 0.12);
}
</style>
