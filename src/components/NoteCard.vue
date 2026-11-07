<script setup lang="ts">
import { computed } from 'vue'
import { EditOutlined, StarFilled, StarOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Category, Note, Tag } from '@/types'
import { plainText, countWords } from '@/utils/markdown'
import dayjs from 'dayjs'

const props = defineProps<{
  note: Note
  category?: Category
  tags: Tag[]
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'star', id: string): void
}>()

const excerpt = computed(() => plainText(props.note.content, 110))
const words = computed(() => countWords(props.note.content))
const updated = computed(() => dayjs(props.note.updatedAt).format('YYYY-MM-DD HH:mm'))
</script>

<template>
  <div class="note-card km-card" @click="emit('open', note.id)">
    <div class="note-card-head">
      <h3 class="note-card-title">{{ note.title }}</h3>
      <a-tooltip :title="note.starred ? '取消收藏' : '收藏'">
        <a-button
          type="text"
          size="small"
          class="star-btn"
          @click.stop="emit('star', note.id)"
        >
          <StarFilled v-if="note.starred" class="starred" />
          <StarOutlined v-else />
        </a-button>
      </a-tooltip>
    </div>

    <p class="note-card-excerpt">{{ excerpt || '暂无内容' }}</p>

    <div class="note-card-meta">
      <a-tag v-if="category" :color="category.color" class="category-tag">
        {{ category.name }}
      </a-tag>
      <a-tag v-for="tag in tags" :key="tag.id" :color="tag.color">{{ tag.name }}</a-tag>
    </div>

    <div class="note-card-footer">
      <span class="note-card-time">{{ updated }} · {{ words }} 字</span>
      <span class="note-card-actions" @click.stop>
        <a-button type="text" size="small" @click="emit('edit', note.id)">
          <template #icon><EditOutlined /></template>
          编辑
        </a-button>
        <a-popconfirm
          title="确定删除这篇笔记吗？"
          ok-text="删除"
          cancel-text="取消"
          @confirm="emit('delete', note.id)"
        >
          <a-button type="text" size="small" danger>
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-popconfirm>
      </span>
    </div>
  </div>
</template>

<style scoped>
.note-card {
  padding: 18px 20px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.note-card:hover {
  border-color: var(--km-primary);
  box-shadow: 0 6px 20px rgba(22, 119, 255, 0.12);
  transform: translateY(-2px);
}

.note-card-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.note-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--km-text);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.star-btn {
  color: var(--km-text-secondary);
}

.starred {
  color: #faad14;
}

.note-card-excerpt {
  margin: 10px 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--km-text-secondary);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.category-tag {
  font-weight: 500;
}

.note-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--km-border);
}

.note-card-time {
  font-size: 12px;
  color: var(--km-text-secondary);
}

.note-card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
