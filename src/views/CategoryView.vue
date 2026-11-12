<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  PlusOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue'
import type { Category, Tag } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { useNotesStore } from '@/stores/notes'
import { errorMessage } from '@/api/http'

const categoriesStore = useCategoriesStore()
const notesStore = useNotesStore()

const categoryColors = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa541c',
  '#2f54eb',
]
const tagColors = ['blue', 'green', 'gold', 'purple', 'cyan', 'magenta', 'orange', 'geekblue', 'red', 'volcano']

const newCategoryName = ref('')
const newCategoryColor = ref(categoryColors[0])
const newTagName = ref('')
const newTagColor = ref(tagColors[0])

const editingCategory = ref<Category | null>(null)
const editingCategoryName = ref('')
const editingCategoryColor = ref('#1677ff')

const editingTag = ref<Tag | null>(null)
const editingTagName = ref('')
const editingTagColor = ref('blue')

const categoryRows = computed(() =>
  categoriesStore.categories.map((category) => ({
    ...category,
    count: notesStore.countByCategory(category.id),
  })),
)

const tagRows = computed(() =>
  categoriesStore.tags.map((tag) => ({
    ...tag,
    count: notesStore.countByTag(tag.id),
  })),
)

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) {
    message.warning('请输入分类名称')
    return
  }
  try {
    await categoriesStore.addCategory(name, newCategoryColor.value)
    newCategoryName.value = ''
    message.success('分类已添加')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

function openEditCategory(category: Category) {
  editingCategory.value = category
  editingCategoryName.value = category.name
  editingCategoryColor.value = category.color
}

async function saveCategory() {
  if (!editingCategory.value) return
  const name = editingCategoryName.value.trim()
  if (!name) {
    message.warning('分类名称不能为空')
    return
  }
  try {
    await categoriesStore.updateCategory(editingCategory.value.id, {
      name,
      color: editingCategoryColor.value,
    })
    editingCategory.value = null
    message.success('分类已更新')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

async function removeCategory(id: string) {
  try {
    await categoriesStore.removeCategory(id)
    message.success('分类已删除')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

async function addTag() {
  const name = newTagName.value.trim()
  if (!name) {
    message.warning('请输入标签名称')
    return
  }
  try {
    await categoriesStore.addTag(name, newTagColor.value)
    newTagName.value = ''
    message.success('标签已添加')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

function openEditTag(tag: Tag) {
  editingTag.value = tag
  editingTagName.value = tag.name
  editingTagColor.value = tag.color
}

async function saveTag() {
  if (!editingTag.value) return
  const name = editingTagName.value.trim()
  if (!name) {
    message.warning('标签名称不能为空')
    return
  }
  try {
    await categoriesStore.updateTag(editingTag.value.id, {
      name,
      color: editingTagColor.value,
    })
    editingTag.value = null
    message.success('标签已更新')
  } catch (e) {
    message.error(errorMessage(e))
  }
}

async function removeTag(id: string) {
  try {
    await categoriesStore.removeTag(id)
    message.success('标签已删除')
  } catch (e) {
    message.error(errorMessage(e))
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">分类与标签</h1>
        <p class="page-subtitle">用分类归档知识，用标签建立跨分类的关联</p>
      </div>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">
              <FolderAddOutlined />
              分类
            </span>
            <a-tag>{{ categoryRows.length }} 个</a-tag>
          </div>

          <div class="add-row">
            <a-input
              v-model:value="newCategoryName"
              placeholder="新分类名称"
              allow-clear
              @press-enter="addCategory"
            />
            <a-select v-model:value="newCategoryColor" style="width: 96px">
              <a-select-option v-for="color in categoryColors" :key="color" :value="color">
                <span class="color-option">
                  <span class="color-dot" :style="{ background: color }" />
                  {{ color }}
                </span>
              </a-select-option>
            </a-select>
            <a-button type="primary" @click="addCategory">
              <template #icon><PlusOutlined /></template>
              添加
            </a-button>
          </div>

          <a-empty v-if="!categoryRows.length" description="还没有分类" />
          <ul v-else class="manage-list">
            <li v-for="item in categoryRows" :key="item.id" class="manage-item">
              <span class="color-dot" :style="{ background: item.color }" />
              <span class="manage-name">{{ item.name }}</span>
              <span class="manage-count">{{ item.count }} 篇</span>
              <span class="manage-actions">
                <a-button type="text" size="small" @click="openEditCategory(item)">
                  <template #icon><EditOutlined /></template>
                </a-button>
                <a-popconfirm
                  :title="`删除分类「${item.name}」？其中笔记会变为未分类`"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="removeCategory(item.id)"
                >
                  <a-button type="text" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-popconfirm>
              </span>
            </li>
          </ul>
        </div>
      </a-col>

      <a-col :xs="24" :lg="12">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">
              <TagsOutlined />
              标签
            </span>
            <a-tag>{{ tagRows.length }} 个</a-tag>
          </div>

          <div class="add-row">
            <a-input
              v-model:value="newTagName"
              placeholder="新标签名称"
              allow-clear
              @press-enter="addTag"
            />
            <a-select v-model:value="newTagColor" style="width: 110px">
              <a-select-option v-for="color in tagColors" :key="color" :value="color">
                <a-tag :color="color" class="color-option-tag">{{ color }}</a-tag>
              </a-select-option>
            </a-select>
            <a-button type="primary" @click="addTag">
              <template #icon><PlusOutlined /></template>
              添加
            </a-button>
          </div>

          <a-empty v-if="!tagRows.length" description="还没有标签" />
          <ul v-else class="manage-list">
            <li v-for="item in tagRows" :key="item.id" class="manage-item">
              <a-tag :color="item.color" class="manage-tag">{{ item.name }}</a-tag>
              <span class="manage-count">{{ item.count }} 篇</span>
              <span class="manage-actions">
                <a-button type="text" size="small" @click="openEditTag(item)">
                  <template #icon><EditOutlined /></template>
                </a-button>
                <a-popconfirm
                  :title="`删除标签「${item.name}」？`"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="removeTag(item.id)"
                >
                  <a-button type="text" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-popconfirm>
              </span>
            </li>
          </ul>
        </div>
      </a-col>
    </a-row>

    <a-modal
      :open="Boolean(editingCategory)"
      title="编辑分类"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveCategory"
      @cancel="editingCategory = null"
    >
      <div class="modal-field">
        <span class="modal-label">名称</span>
        <a-input v-model:value="editingCategoryName" @press-enter="saveCategory" />
      </div>
      <div class="modal-field">
        <span class="modal-label">颜色</span>
        <a-select v-model:value="editingCategoryColor" style="width: 100%">
          <a-select-option v-for="color in categoryColors" :key="color" :value="color">
            <span class="color-option">
              <span class="color-dot" :style="{ background: color }" />
              {{ color }}
            </span>
          </a-select-option>
        </a-select>
      </div>
    </a-modal>

    <a-modal
      :open="Boolean(editingTag)"
      title="编辑标签"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveTag"
      @cancel="editingTag = null"
    >
      <div class="modal-field">
        <span class="modal-label">名称</span>
        <a-input v-model:value="editingTagName" @press-enter="saveTag" />
      </div>
      <div class="modal-field">
        <span class="modal-label">颜色</span>
        <a-select v-model:value="editingTagColor" style="width: 100%">
          <a-select-option v-for="color in tagColors" :key="color" :value="color">
            <a-tag :color="color" class="color-option-tag">{{ color }}</a-tag>
          </a-select-option>
        </a-select>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.panel {
  padding: 18px 20px;
  height: 100%;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--km-text);
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.color-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.manage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manage-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background 0.16s ease;
}

.manage-item:hover {
  background: var(--km-hover-bg);
}

.manage-name {
  flex: 1;
  font-size: 14px;
  color: var(--km-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-tag {
  margin: 0;
}

.manage-count {
  font-size: 12px;
  color: var(--km-text-secondary);
  flex-shrink: 0;
}

.manage-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.modal-field {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-label {
  width: 40px;
  font-size: 13px;
  color: var(--km-text-secondary);
  flex-shrink: 0;
}

.color-option-tag {
  margin: 0;
}
</style>
