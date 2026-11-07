<script setup lang="ts">
import { computed, watch } from 'vue'
import { theme as antTheme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { useSettingsStore } from '@/stores/settings'

dayjs.locale('zh-cn')

const settings = useSettingsStore()

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
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <BasicLayout />
  </a-config-provider>
</template>
