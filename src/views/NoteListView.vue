<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import type { Note } from '@/types'
import NoteCard from '@/components/NoteCard.vue'
import CategoryTree from '@/components/CategoryTree.vue'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { errorMessage } from '@/api/http'
import { plainText } from '@/utils/markdown'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()

const keyword = ref(String(route.query.q ?? ''))
const selectedCategory = ref<string>(route.query.star ? 'starred' : 'all')
const selectedTags = ref<string[]>([])
const sortBy = ref<'updated' | 'created' | 'title'>('updated')
const viewMode = ref<'grid' | 'list'>('grid')

watch(
  () => route.query.q,
  (val) => {
    keyword.value = String(val ?? '')
  },
)

watch(
  () => route.query.star,
  (val) => {
    if (val) selectedCategory.value = 'starred'
  },
)

const counts = computed<Record<string, number>>(() => {
  const result: Record<string, number> = {}
  categoriesStore.categories.forEach((category) => {
    result[category.id] = notesStore.countByCategory(category.id)
  })
  return result
})

const filteredNotes = computed<Note[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  let list = [...notesStore.notes]

  if (selectedCategory.value === 'starred') {
    list = list.filter((n) => n.starred)
  } else if (selectedCategory.value !== 'all') {
    list = list.filter((n) => n.categoryId === selectedCategory.value)
  }

  if (selectedTags.value.length) {
    list = list.filter((n) => selectedTags.value.every((tagId) => n.tagIds.includes(tagId)))
  }

  if (q) {
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        plainText(n.content, 100000).toLowerCase().includes(q),
    )
  }

  list.sort((a, b) => {
    if (sortBy.value === 'title') return a.title.localeCompare(b.title, 'zh-CN')
    if (sortBy.value === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return list
})

const tagOptions = computed(() => {
  return categoriesStore.tags.map((tag) => ({
    label: `${tag.name} (${notesStore.countByTag(tag.id)})`,
    value: tag.id,
  }))
})

function openNote(id: string) {
  router.push(`/notes/${id}`)
}

function editNote(id: string) {
  router.push(`/notes/${id}/edit`)
}

async function deleteNote(id: string) {
  try {
    await notesStore.removeNote(id)
    message.success('笔记已删除')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

async function toggleStar(id: string) {
  try {
    await notesStore.toggleStar(id)
  } catch (e) {
    message.error(errorMessage(e))
  }
}

function resetFilters() {
  selectedCategory.value = 'all'
  selectedTags.value = []
  keyword.value = ''
  router.replace({ path: '/notes' })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">笔记库</h1>
        <p class="page-subtitle">
          共 {{ notesStore.notes.length }} 篇笔记 · 当前筛选出 {{ filteredNotes.length }} 篇
        </p>
      </div>
      <a-button type="primary" @click="router.push('/notes/new')">
        <template #icon><PlusOutlined /></template>
        新建笔记
      </a-button>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="7" :lg="6" :xl="5">
        <CategoryTree
          v-model="selectedCategory"
          :categories="categoriesStore.categories"
          :counts="counts"
          :total="notesStore.notes.length"
          :starred-count="notesStore.starredNotes.length"
        />
      </a-col>

      <a-col :xs="24" :md="17" :lg="18" :xl="19">
        <div class="toolbar km-card">
          <a-input
            v-model:value="keyword"
            placeholder="搜索标题或内容"
            allow-clear
            class="toolbar-search"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select
            v-model:value="selectedTags"
            mode="multiple"
            :options="tagOptions"
            placeholder="按标签筛选"
            allow-clear
            :max-tag-count="2"
            class="toolbar-tags"
          />
          <a-select v-model:value="sortBy" class="toolbar-sort">
            <a-select-option value="updated">最近更新</a-select-option>
            <a-select-option value="created">创建时间</a-select-option>
            <a-select-option value="title">标题排序</a-select-option>
          </a-select>
          <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
            <a-radio-button value="grid">
              <AppstoreOutlined />
            </a-radio-button>
            <a-radio-button value="list">
              <BarsOutlined />
            </a-radio-button>
          </a-radio-group>
        </div>

        <a-empty
          v-if="!filteredNotes.length"
          class="empty-block"
          description="没有找到符合条件的笔记"
        >
          <a-button @click="resetFilters">重置筛选</a-button>
        </a-empty>

        <a-row v-else-if="viewMode === 'grid'" :gutter="[16, 16]" class="notes-grid">
          <a-col
            v-for="note in filteredNotes"
            :key="note.id"
            :xs="24"
            :sm="12"
            :xl="8"
          >
            <NoteCard
              :note="note"
              :category="categoriesStore.getCategory(note.categoryId)"
              :tags="categoriesStore.getTagsByIds(note.tagIds)"
              @open="openNote"
              @edit="editNote"
              @delete="deleteNote"
              @star="toggleStar"
            />
          </a-col>
        </a-row>

        <div v-else class="notes-list">
          <div
            v-for="note in filteredNotes"
            :key="note.id"
            class="note-row km-card"
            @click="openNote(note.id)"
          >
            <div class="note-row-main">
              <div class="note-row-title">
                {{ note.title }}
                <span v-if="note.starred" class="row-star">★</span>
              </div>
              <div class="note-row-excerpt">{{ plainText(note.content, 120) }}</div>
              <div class="note-row-tags">
                <a-tag
                  v-if="categoriesStore.getCategory(note.categoryId)"
                  :color="categoriesStore.getCategory(note.categoryId)?.color"
                >
                  {{ categoriesStore.getCategory(note.categoryId)?.name }}
                </a-tag>
                <a-tag
                  v-for="tag in categoriesStore.getTagsByIds(note.tagIds)"
                  :key="tag.id"
                  :color="tag.color"
                >
                  {{ tag.name }}
                </a-tag>
              </div>
            </div>
            <div class="note-row-side">
              <span>{{ dayjs(note.updatedAt).format('YYYY-MM-DD') }}</span>
              <a-button type="link" size="small" @click.stop="editNote(note.id)">编辑</a-button>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.toolbar-search {
  flex: 1;
  min-width: 180px;
}

.toolbar-tags {
  width: 220px;
}

.toolbar-sort {
  width: 120px;
}

.notes-grid {
  margin-top: 0;
}

.empty-block {
  padding: 60px 0;
  background: var(--km-card-bg);
  border: 1px dashed var(--km-border);
  border-radius: 12px;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-row {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.note-row:hover {
  border-color: var(--km-primary);
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.1);
}

.note-row-main {
  flex: 1;
  min-width: 0;
}

.note-row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--km-text);
  margin-bottom: 6px;
}

.row-star {
  color: #faad14;
  margin-left: 4px;
}

.note-row-excerpt {
  font-size: 13px;
  color: var(--km-text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.note-row-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.note-row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  font-size: 12px;
  color: var(--km-text-secondary);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .toolbar-tags {
    width: 100%;
  }
  .toolbar-sort {
    flex: 1;
  }
  .note-row-side {
    display: none;
  }
}
</style>
