<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  StarFilled,
  StarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import MarkdownView from '@/components/MarkdownView.vue'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { extractToc, countWords } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()

const noteId = computed(() => String(route.params.id))
const note = computed(() => notesStore.getById(noteId.value))
const category = computed(() => categoriesStore.getCategory(note.value?.categoryId ?? null))
const tags = computed(() => (note.value ? categoriesStore.getTagsByIds(note.value.tagIds) : []))
const toc = computed(() => (note.value ? extractToc(note.value.content) : []))
const words = computed(() => (note.value ? countWords(note.value.content) : 0))

const ordered = computed(() => notesStore.sortedByUpdated)
const currentIndex = computed(() => ordered.value.findIndex((n) => n.id === noteId.value))
const prevNote = computed(() =>
  currentIndex.value > 0 ? ordered.value[currentIndex.value - 1] : undefined,
)
const nextNote = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < ordered.value.length - 1
    ? ordered.value[currentIndex.value + 1]
    : undefined,
)

function goBack() {
  router.push('/notes')
}

function editNote() {
  router.push(`/notes/${noteId.value}/edit`)
}

function deleteNote() {
  notesStore.removeNote(noteId.value)
  message.success('笔记已删除')
  router.push('/notes')
}

function toggleStar() {
  notesStore.toggleStar(noteId.value)
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="page">
    <a-result
      v-if="!note"
      status="404"
      title="笔记不存在"
      sub-title="它可能已被删除，或链接有误。"
    >
      <template #extra>
        <a-button type="primary" @click="goBack">返回笔记库</a-button>
      </template>
    </a-result>

    <template v-else>
      <div class="read-topbar">
        <a-button type="text" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
          返回笔记库
        </a-button>
        <a-space>
          <a-button @click="toggleStar">
            <template #icon>
              <StarFilled v-if="note.starred" class="starred" />
              <StarOutlined v-else />
            </template>
            {{ note.starred ? '已收藏' : '收藏' }}
          </a-button>
          <a-button type="primary" @click="editNote">
            <template #icon><EditOutlined /></template>
            编辑
          </a-button>
          <a-popconfirm
            title="确定删除这篇笔记吗？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="deleteNote"
          >
            <a-button danger>
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>

      <a-row :gutter="[24, 16]">
        <a-col :xs="24" :lg="18">
          <div class="read-card km-card">
            <div class="read-head">
              <h1 class="read-title">{{ note.title }}</h1>
              <div class="read-meta">
                <a-tag v-if="category" :color="category.color">{{ category.name }}</a-tag>
                <a-tag v-for="tag in tags" :key="tag.id" :color="tag.color">{{ tag.name }}</a-tag>
                <span class="read-meta-item">
                  <ClockCircleOutlined />
                  {{ dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm') }}
                </span>
                <span class="read-meta-item">
                  <FileTextOutlined />
                  {{ words }} 字
                </span>
              </div>
            </div>
            <a-divider class="read-divider" />
            <MarkdownView :content="note.content" />

            <div class="read-footer">
              <button
                type="button"
                class="read-nav"
                :disabled="!prevNote"
                @click="prevNote && router.push(`/notes/${prevNote.id}`)"
              >
                <span class="read-nav-label">上一篇</span>
                <span class="read-nav-title">{{ prevNote?.title ?? '没有了' }}</span>
              </button>
              <button
                type="button"
                class="read-nav read-nav-next"
                :disabled="!nextNote"
                @click="nextNote && router.push(`/notes/${nextNote.id}`)"
              >
                <span class="read-nav-label">下一篇</span>
                <span class="read-nav-title">{{ nextNote?.title ?? '没有了' }}</span>
              </button>
            </div>
          </div>
        </a-col>

        <a-col :xs="24" :lg="6">
          <div class="toc km-card">
            <div class="toc-title">文章目录</div>
            <a-empty v-if="!toc.length" description="暂无小标题" />
            <ul v-else class="toc-list">
              <li
                v-for="item in toc"
                :key="item.id"
                class="toc-item"
                :class="`level-${item.level}`"
                @click="scrollToHeading(item.id)"
              >
                {{ item.text }}
              </li>
            </ul>
          </div>
        </a-col>
      </a-row>
    </template>
  </div>
</template>

<style scoped>
.read-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.starred {
  color: #faad14;
}

.read-card {
  padding: 28px 32px;
  min-height: 60vh;
}

.read-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.read-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--km-text);
}

.read-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.read-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--km-text-secondary);
}

.read-divider {
  margin: 20px 0;
}

.read-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--km-border);
}

.read-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid var(--km-border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--km-text);
  transition: border-color 0.16s ease;
  overflow: hidden;
}

.read-nav:hover:not(:disabled) {
  border-color: var(--km-primary);
}

.read-nav:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.read-nav-next {
  text-align: right;
  align-items: flex-end;
}

.read-nav-label {
  font-size: 12px;
  color: var(--km-text-secondary);
}

.read-nav-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.toc {
  position: sticky;
  top: 76px;
  padding: 16px;
  max-height: calc(100vh - 100px);
  overflow: auto;
}

.toc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--km-text-secondary);
  margin-bottom: 10px;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  padding: 6px 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--km-text-secondary);
  border-left: 2px solid transparent;
  cursor: pointer;
  border-radius: 0 6px 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.16s ease, background 0.16s ease;
}

.toc-item:hover {
  color: var(--km-primary);
  background: var(--km-hover-bg);
}

.toc-item.level-3 {
  padding-left: 20px;
  font-size: 12px;
}

.toc-item.level-4 {
  padding-left: 32px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .read-card {
    padding: 20px;
  }
  .read-footer {
    grid-template-columns: 1fr;
  }
  .toc {
    display: none;
  }
}
</style>
