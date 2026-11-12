<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { theme as antTheme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { useSettingsStore } from '@/stores/settings'
import { useNotesStore } from '@/stores/notes'
import { useCategoriesStore } from '@/stores/categories'
import { errorMessage } from '@/api/http'
import { migrateLocalData } from '@/utils/migrate'

dayjs.locale('zh-cn')

const settings = useSettingsStore()
const notesStore = useNotesStore()
const categoriesStore = useCategoriesStore()

const booting = ref(true)
const bootError = ref('')

const themeConfig = computed(() => ({
  algorithm: settings.theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontSize: 14,
  },
}))

watch(
  () => settings.theme,
  (mode) => {
    document.documentElement.dataset.theme = mode
  },
  { immediate: true },
)

async function bootstrap() {
  booting.value = true
  bootError.value = ''
  try {
    await Promise.all([categoriesStore.fetchAll(), notesStore.fetchNotes()])
    const migrated = await migrateLocalData()
    if (migrated) {
      await Promise.all([categoriesStore.fetchAll(), notesStore.fetchNotes()])
    }
  } catch (e) {
    bootError.value = errorMessage(e)
  } finally {
    booting.value = false
  }
}

onMounted(bootstrap)
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <div v-if="booting" class="boot-state">
      <a-spin size="large" />
      <p class="boot-text">正在连接数据库…</p>
    </div>
    <a-result
      v-else-if="bootError"
      class="boot-state"
      status="error"
      title="无法加载数据"
      :sub-title="bootError"
    >
      <template #extra>
        <a-button type="primary" @click="bootstrap">重试</a-button>
      </template>
    </a-result>
    <BasicLayout v-else />
  </a-config-provider>
</template>

<style scoped>
.boot-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}

.boot-text {
  margin: 0;
  font-size: 14px;
  color: var(--km-text-secondary);
}
</style>
