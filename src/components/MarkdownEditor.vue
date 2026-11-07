<script setup lang="ts">
import { computed } from 'vue'
import { FileTextOutlined, EyeOutlined } from '@ant-design/icons-vue'
import MarkdownView from './MarkdownView.vue'
import { countWords } from '@/utils/markdown'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const words = computed(() => countWords(props.modelValue))
</script>

<template>
  <div class="editor">
    <div class="editor-pane">
      <div class="editor-pane-header">
        <FileTextOutlined />
        <span>Markdown</span>
        <span class="editor-count">{{ words }} 字</span>
      </div>
      <a-textarea
        v-model:value="value"
        class="editor-textarea"
        placeholder="开始记录你的学习笔记… 支持 Markdown 语法，例如 # 标题、**加粗**、`代码`、- 列表"
        :bordered="false"
        spellcheck="false"
      />
    </div>
    <div class="editor-pane editor-preview">
      <div class="editor-pane-header">
        <EyeOutlined />
        <span>实时预览</span>
      </div>
      <div class="editor-preview-body">
        <MarkdownView v-if="modelValue.trim()" :content="modelValue" />
        <a-empty v-else description="预览区域" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--km-card-bg);
  border: 1px solid var(--km-border);
  border-radius: 10px;
  overflow: hidden;
}

.editor-pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--km-text-secondary);
  background: var(--km-hover-bg);
  border-bottom: 1px solid var(--km-border);
}

.editor-count {
  margin-left: auto;
  font-weight: 400;
}

.editor-textarea {
  flex: 1;
  resize: none;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.75;
  background: transparent;
  color: var(--km-text);
}

.editor-preview-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
