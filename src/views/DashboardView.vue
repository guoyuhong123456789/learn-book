<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  PlusOutlined,
  StarOutlined,
  TagsOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { plainText } from '@/utils/markdown'

const router = useRouter()
const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()

const greeting = computed(() => {
  const hour = dayjs().hour()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const today = dayjs().format('YYYY 年 M 月 D 日 dddd')

const total = computed(() => notesStore.notes.length)
const categoryCount = computed(() => categoriesStore.categories.length)
const tagCount = computed(() => categoriesStore.tags.length)
const starredCount = computed(() => notesStore.starredNotes.length)
const weeklyCount = computed(() => {
  const weekAgo = dayjs().subtract(7, 'day')
  return notesStore.notes.filter((n) => dayjs(n.updatedAt).isAfter(weekAgo)).length
})

const stats = computed(() => [
  { key: 'total', label: '笔记总数', value: total.value, icon: BookOutlined, color: '#1677ff' },
  {
    key: 'weekly',
    label: '近 7 天更新',
    value: weeklyCount.value,
    icon: ClockCircleOutlined,
    color: '#52c41a',
  },
  {
    key: 'category',
    label: '分类数量',
    value: categoryCount.value,
    icon: FolderOutlined,
    color: '#faad14',
  },
  {
    key: 'tag',
    label: '标签数量',
    value: tagCount.value,
    icon: TagsOutlined,
    color: '#722ed1',
  },
])

const recentNotes = computed(() => notesStore.sortedByUpdated.slice(0, 6))

const distribution = computed(() => {
  const totalCount = Math.max(total.value, 1)
  return categoriesStore.categories
    .map((category) => {
      const count = notesStore.countByCategory(category.id)
      return {
        ...category,
        count,
        percent: Math.round((count / totalCount) * 100),
      }
    })
    .sort((a, b) => b.count - a.count)
})

function categoryName(id: string | null): string {
  return categoriesStore.getCategory(id)?.name ?? '未分类'
}

function openNote(id: string) {
  router.push(`/notes/${id}`)
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ greeting }}，继续学习吧</h1>
        <p class="page-subtitle">{{ today }} · 已积累 {{ total }} 篇学习笔记</p>
      </div>
      <a-space>
        <a-button @click="router.push('/notes')">
          <template #icon><BookOutlined /></template>
          浏览笔记
        </a-button>
        <a-button type="primary" @click="router.push('/notes/new')">
          <template #icon><PlusOutlined /></template>
          新建笔记
        </a-button>
      </a-space>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col v-for="item in stats" :key="item.key" :xs="12" :sm="12" :md="6">
        <div class="stat-card km-card">
          <div class="stat-icon" :style="{ background: item.color + '1a', color: item.color }">
            <component :is="item.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="dashboard-body">
      <a-col :xs="24" :lg="15">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">最近编辑</span>
            <a-button type="link" size="small" @click="router.push('/notes')">
              全部笔记
              <RightOutlined />
            </a-button>
          </div>
          <a-empty v-if="!recentNotes.length" description="还没有笔记，去记录第一篇吧" />
          <ul v-else class="recent-list">
            <li
              v-for="note in recentNotes"
              :key="note.id"
              class="recent-item"
              @click="openNote(note.id)"
            >
              <span class="recent-icon"><BookOutlined /></span>
              <span class="recent-main">
                <span class="recent-title">
                  {{ note.title }}
                  <StarOutlined v-if="note.starred" class="recent-star" />
                </span>
                <span class="recent-excerpt">{{ plainText(note.content, 70) }}</span>
              </span>
              <span class="recent-side">
                <a-tag color="default" class="recent-category">{{ categoryName(note.categoryId) }}</a-tag>
                <span class="recent-time">{{ dayjs(note.updatedAt).format('MM-DD HH:mm') }}</span>
              </span>
            </li>
          </ul>
        </div>
      </a-col>

      <a-col :xs="24" :lg="9">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">分类分布</span>
            <a-tag color="gold">{{ starredCount }} 篇收藏</a-tag>
          </div>
          <a-empty v-if="!distribution.length" description="暂无分类" />
          <div v-else class="distribution">
            <div v-for="item in distribution" :key="item.id" class="distribution-item">
              <div class="distribution-label">
                <span class="distribution-name">
                  <span class="dot" :style="{ background: item.color }" />
                  {{ item.name }}
                </span>
                <span class="distribution-count">{{ item.count }} 篇</span>
              </div>
              <a-progress
                :percent="item.percent"
                :stroke-color="item.color"
                :show-info="false"
                size="small"
              />
            </div>
          </div>
        </div>

        <div class="panel km-card quick-panel">
          <div class="panel-head">
            <span class="panel-title">快捷操作</span>
          </div>
          <div class="quick-actions">
            <button class="quick-action" type="button" @click="router.push('/notes/new')">
              <PlusOutlined />
              <span>新建笔记</span>
            </button>
            <button class="quick-action" type="button" @click="router.push('/notes?star=1')">
              <StarOutlined />
              <span>查看收藏</span>
            </button>
            <button class="quick-action" type="button" @click="router.push('/categories')">
              <FolderOutlined />
              <span>管理分类</span>
            </button>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--km-text);
}

.stat-label {
  margin-top: 2px;
  font-size: 13px;
  color: var(--km-text-secondary);
}

.dashboard-body {
  margin-top: 16px;
}

.panel {
  padding: 18px 20px;
  height: 100%;
}

.quick-panel {
  margin-top: 16px;
  height: auto;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--km-text);
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.16s ease;
}

.recent-item:hover {
  background: var(--km-hover-bg);
}

.recent-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(22, 119, 255, 0.1);
  color: var(--km-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recent-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recent-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--km-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-star {
  color: #faad14;
  margin-left: 4px;
  font-size: 12px;
}

.recent-excerpt {
  font-size: 12px;
  color: var(--km-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.recent-category {
  margin: 0;
}

.recent-time {
  font-size: 12px;
  color: var(--km-text-secondary);
}

.distribution {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.distribution-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 13px;
}

.distribution-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--km-text);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.distribution-count {
  color: var(--km-text-secondary);
}

.quick-actions {
  display: flex;
  gap: 10px;
}

.quick-action {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px solid var(--km-border);
  background: var(--km-hover-bg);
  border-radius: 10px;
  cursor: pointer;
  color: var(--km-text);
  font-size: 13px;
  transition: border-color 0.16s ease, color 0.16s ease;
}

.quick-action:hover {
  border-color: var(--km-primary);
  color: var(--km-primary);
}

@media (max-width: 768px) {
  .recent-side {
    display: none;
  }
}
</style>
