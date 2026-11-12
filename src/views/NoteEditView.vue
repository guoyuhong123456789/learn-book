<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import TagSelect from '@/components/TagSelect.vue'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { errorMessage } from '@/api/http'
import { extractTitle } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()

const isNew = computed(() => route.name === 'note-new')
const noteId = computed(() => (isNew.value ? '' : String(route.params.id)))
const existing = computed(() => (noteId.value ? notesStore.getById(noteId.value) : undefined))
const missing = computed(() => !isNew.value && !existing.value)

const title = ref('')
const content = ref('')
const categoryId = ref<string | null>(null)
const tagIds = ref<string[]>([])
const savedSnapshot = ref('')

const categoryOptions = computed(() => [
  { label: '未分类', value: '' },
  ...categoriesStore.categories.map((category) => ({
    label: category.name,
    value: category.id,
  })),
])

const categoryValue = computed({
  get: () => categoryId.value ?? '',
  set: (val: string) => {
    categoryId.value = val || null
  },
})

const isDirty = computed(() => snapshot() !== savedSnapshot.value)

function snapshot(): string {
  return JSON.stringify({
    title: title.value,
    content: content.value,
    categoryId: categoryId.value,
    tagIds: tagIds.value,
  })
}

function load() {
  if (isNew.value || !existing.value) {
    title.value = ''
    content.value = ''
    categoryId.value = null
    tagIds.value = []
  } else {
    title.value = existing.value.title
    content.value = existing.value.content
    categoryId.value = existing.value.categoryId
    tagIds.value = [...existing.value.tagIds]
  }
  savedSnapshot.value = snapshot()
}

async function save() {
  const finalTitle = title.value.trim() || extractTitle(content.value) || '未命名笔记'
  try {
    if (isNew.value) {
      const note = await notesStore.createNote({
        title: finalTitle,
        content: content.value,
        categoryId: categoryId.value,
        tagIds: tagIds.value,
      })
      message.success('笔记已创建')
      router.replace(`/notes/${note.id}`)
    } else if (existing.value) {
      await notesStore.updateNote(existing.value.id, {
        title: finalTitle,
        content: content.value,
        categoryId: categoryId.value,
        tagIds: tagIds.value,
      })
      message.success('笔记已保存')
      router.replace(`/notes/${existing.value.id}`)
    }
  } catch (e) {
    message.error(errorMessage(e))
  }
}

async function remove() {
  if (!existing.value) return
  try {
    await notesStore.removeNote(existing.value.id)
    message.success('笔记已删除')
    router.replace('/notes')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

function goBack() {
  if (existing.value) {
    router.push(`/notes/${existing.value.id}`)
  } else {
    router.push('/notes')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (!missing.value) save()
  }
}

watch(() => route.fullPath, load, { immediate: true })

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="edit-page">
    <a-result
      v-if="missing"
      status="404"
      title="笔记不存在"
      sub-title="无法编辑这篇笔记，它可能已被删除。"
    >
      <template #extra>
        <a-button type="primary" @click="router.push('/notes')">返回笔记库</a-button>
      </template>
    </a-result>

    <template v-else>
      <div class="edit-topbar">
        <div class="edit-topbar-left">
          <a-button type="text" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回
          </a-button>
          <span class="edit-mode">{{ isNew ? '新建笔记' : '编辑笔记' }}</span>
          <a-tag v-if="isDirty" color="orange">未保存</a-tag>
        </div>
        <a-space>
          <a-button v-if="!isNew" @click="save">
            <template #icon><SaveOutlined /></template>
            保存
          </a-button>
          <a-popconfirm
            v-if="!isNew"
            title="确定删除这篇笔记吗？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="remove"
          >
            <a-button danger>
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </a-popconfirm>
          <a-button type="primary" @click="save">
            <template #icon><CheckOutlined /></template>
            {{ isNew ? '创建笔记' : '保存并阅读' }}
          </a-button>
        </a-space>
      </div>

      <div class="edit-meta km-card">
        <a-input
          v-model:value="title"
          class="edit-title"
          placeholder="笔记标题"
          :bordered="false"
          size="large"
        />
        <div class="edit-meta-row">
          <div class="edit-meta-field">
            <span class="edit-meta-label">分类</span>
            <a-select
              v-model:value="categoryValue"
              :options="categoryOptions"
              placeholder="选择分类"
              style="width: 160px"
            />
          </div>
          <div class="edit-meta-field edit-meta-tags">
            <span class="edit-meta-label">标签</span>
            <TagSelect v-model="tagIds" />
          </div>
          <span class="edit-hint">快捷键 Ctrl / ⌘ + S 保存</span>
        </div>
      </div>

      <div class="edit-body">
        <MarkdownEditor v-model="content" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.edit-page {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - 56px - 48px);
  min-height: 560px;
}

.edit-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.edit-topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-mode {
  font-size: 15px;
  font-weight: 600;
  color: var(--km-text);
}

.edit-meta {
  padding: 10px 16px 14px;
}

.edit-title {
  font-size: 22px;
  font-weight: 600;
  padding: 4px 0;
}

.edit-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 6px;
}

.edit-meta-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-meta-tags {
  flex: 1;
  min-width: 220px;
  max-width: 420px;
}

.edit-meta-label {
  font-size: 13px;
  color: var(--km-text-secondary);
  flex-shrink: 0;
}

.edit-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--km-text-secondary);
}

.edit-body {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .edit-page {
    height: auto;
    min-height: 0;
  }
  .edit-body {
    height: 70vh;
  }
  .edit-hint {
    display: none;
  }
}
</style>
