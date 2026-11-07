<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  BulbFilled,
  BulbOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import type { Category, Note, Tag } from '@/types'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { seedCategories, seedNotes, seedTags } from '@/data/seeds'
import { extractTitle } from '@/utils/markdown'
import dayjs from 'dayjs'

const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()
const settings = useSettingsStore()

const backupSize = computed(() => {
  const bytes = new Blob([JSON.stringify(notesStore.notes)]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
})

function download(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function titleFromMarkdown(text: string, filename: string): string {
  const match = text.match(/^\s*#\s+(.+)$/m)
  if (match) return match[1].trim()
  const fallback = extractTitle(text)
  return fallback === '未命名笔记' ? filename.replace(/\.md$/i, '') : fallback
}

function handleMarkdownUpload(file: File): boolean {
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result ?? '')
    notesStore.createNote({
      title: titleFromMarkdown(text, file.name),
      content: text,
      categoryId: null,
      tagIds: [],
    })
    message.success(`已导入「${file.name}」`)
  }
  reader.onerror = () => message.error(`读取「${file.name}」失败`)
  reader.readAsText(file)
  return false
}

function exportMarkdown() {
  const parts = notesStore.sortedByUpdated.map((note) => {
    const category = categoriesStore.getCategory(note.categoryId)
    const tags = categoriesStore.getTagsByIds(note.tagIds).map((t) => t.name)
    const meta = [
      category ? `分类：${category.name}` : '',
      tags.length ? `标签：${tags.join('、')}` : '',
      `更新时间：${dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm')}`,
    ]
      .filter(Boolean)
      .join(' · ')
    const body = note.content.startsWith('#') ? note.content : `# ${note.title}\n\n${note.content}`
    return `${body}\n\n> ${meta}`
  })
  const content = `# 学习知识库导出\n\n导出时间：${dayjs().format('YYYY-MM-DD HH:mm')}\n\n---\n\n${parts.join(
    '\n\n---\n\n',
  )}\n`
  download(`学习知识库-${dayjs().format('YYYYMMDD-HHmm')}.md`, content, 'text/markdown;charset=utf-8')
  message.success('Markdown 已导出')
}

function exportJson() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notesStore.notes,
    categories: categoriesStore.categories,
    tags: categoriesStore.tags,
  }
  download(
    `学习知识库备份-${dayjs().format('YYYYMMDD-HHmm')}.json`,
    JSON.stringify(data, null, 2),
    'application/json;charset=utf-8',
  )
  message.success('JSON 备份已导出')
}

function handleJsonUpload(file: File): boolean {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result ?? '{}')) as {
        notes?: Note[]
        categories?: Category[]
        tags?: Tag[]
      }
      if (!Array.isArray(data.notes)) throw new Error('invalid backup')
      notesStore.replaceAll(data.notes)
      if (Array.isArray(data.categories) && Array.isArray(data.tags)) {
        categoriesStore.replaceAll(data.categories, data.tags)
      }
      message.success('备份已导入')
    } catch {
      message.error('备份文件格式不正确')
    }
  }
  reader.onerror = () => message.error('读取备份文件失败')
  reader.readAsText(file)
  return false
}

function clearNotes() {
  notesStore.clearAll()
  message.success('所有笔记已清空')
}

function restoreSeeds() {
  notesStore.replaceAll(JSON.parse(JSON.stringify(seedNotes)) as Note[])
  categoriesStore.replaceAll(
    JSON.parse(JSON.stringify(seedCategories)) as Category[],
    JSON.parse(JSON.stringify(seedTags)) as Tag[],
  )
  message.success('已恢复初始示例数据')
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">设置</h1>
        <p class="page-subtitle">管理外观、数据备份与本地笔记存储</p>
      </div>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">外观</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">主题模式</div>
              <div class="setting-desc">切换浅色 / 深色主题</div>
            </div>
            <a-radio-group v-model:value="settings.theme" button-style="solid">
              <a-radio-button value="light">
                <BulbOutlined />
                浅色
              </a-radio-button>
              <a-radio-button value="dark">
                <BulbFilled />
                深色
              </a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <div class="panel km-card storage-panel">
          <div class="panel-head">
            <span class="panel-title">存储概览</span>
          </div>
          <div class="storage-grid">
            <div class="storage-item">
              <div class="storage-value">{{ notesStore.notes.length }}</div>
              <div class="storage-label">笔记</div>
            </div>
            <div class="storage-item">
              <div class="storage-value">{{ categoriesStore.categories.length }}</div>
              <div class="storage-label">分类</div>
            </div>
            <div class="storage-item">
              <div class="storage-value">{{ categoriesStore.tags.length }}</div>
              <div class="storage-label">标签</div>
            </div>
            <div class="storage-item">
              <div class="storage-value">{{ backupSize }}</div>
              <div class="storage-label">占用</div>
            </div>
          </div>
          <a-alert
            type="info"
            show-icon
            message="所有数据保存在当前浏览器的 localStorage 中，清除浏览器数据会导致笔记丢失，建议定期导出备份。"
          />
        </div>
      </a-col>

      <a-col :xs="24" :lg="12">
        <div class="panel km-card">
          <div class="panel-head">
            <span class="panel-title">导入</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">导入 Markdown</div>
              <div class="setting-desc">支持一次选择多个 .md 文件，自动按标题命名</div>
            </div>
            <a-upload
              :show-upload-list="false"
              accept=".md,.markdown,text/markdown"
              multiple
              :before-upload="handleMarkdownUpload"
            >
              <a-button>
                <template #icon><UploadOutlined /></template>
                选择文件
              </a-button>
            </a-upload>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">导入 JSON 备份</div>
              <div class="setting-desc">从之前导出的备份恢复全部数据</div>
            </div>
            <a-upload
              :show-upload-list="false"
              accept=".json,application/json"
              :before-upload="handleJsonUpload"
            >
              <a-button>
                <template #icon><CloudUploadOutlined /></template>
                导入备份
              </a-button>
            </a-upload>
          </div>

          <a-divider />

          <div class="panel-head">
            <span class="panel-title">导出</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">导出为 Markdown</div>
              <div class="setting-desc">把所有笔记合并成一个 Markdown 文件</div>
            </div>
            <a-button @click="exportMarkdown">
              <template #icon><DownloadOutlined /></template>
              导出
            </a-button>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">导出 JSON 备份</div>
              <div class="setting-desc">完整备份笔记、分类与标签</div>
            </div>
            <a-button @click="exportJson">
              <template #icon><CloudDownloadOutlined /></template>
              备份
            </a-button>
          </div>
        </div>

        <div class="panel km-card danger-panel">
          <div class="panel-head">
            <span class="panel-title">危险操作</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">恢复初始示例数据</div>
              <div class="setting-desc">用内置的三篇示例笔记替换当前所有笔记</div>
            </div>
            <a-popconfirm
              title="确定用示例数据替换当前笔记吗？"
              ok-text="恢复"
              cancel-text="取消"
              @confirm="restoreSeeds"
            >
              <a-button>
                <template #icon><ExperimentOutlined /></template>
                恢复示例
              </a-button>
            </a-popconfirm>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">清空所有笔记</div>
              <div class="setting-desc">删除所有笔记（分类和标签保留）</div>
            </div>
            <a-popconfirm
              title="确定清空所有笔记吗？此操作不可撤销"
              ok-text="清空"
              cancel-text="取消"
              @confirm="clearNotes"
            >
              <a-button danger>
                <template #icon><DeleteOutlined /></template>
                清空
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.panel {
  padding: 18px 20px;
  margin-bottom: 16px;
}

.storage-panel {
  margin-bottom: 0;
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

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--km-border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  min-width: 0;
}

.setting-name {
  font-size: 14px;
  color: var(--km-text);
  margin-bottom: 3px;
}

.setting-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--km-text-secondary);
}

.storage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.storage-item {
  text-align: center;
  padding: 12px 8px;
  border-radius: 10px;
  background: var(--km-hover-bg);
}

.storage-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--km-text);
}

.storage-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--km-text-secondary);
}

.danger-panel {
  margin-bottom: 0;
}
</style>
