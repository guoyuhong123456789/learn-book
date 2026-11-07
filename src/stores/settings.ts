import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Settings, ThemeMode } from '@/types'
import { readStorage, writeStorage } from '@/utils/storage'

const STORAGE_KEY = 'settings'

const defaultSettings: Settings = {
  theme: 'light',
  sidebarCollapsed: false,
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = readStorage<Settings>(STORAGE_KEY, defaultSettings)
  const theme = ref<ThemeMode>(stored.theme ?? 'light')
  const sidebarCollapsed = ref<boolean>(stored.sidebarCollapsed ?? false)

  function applyTheme(mode: ThemeMode) {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode
  }

  applyTheme(theme.value)

  watch([theme, sidebarCollapsed], () => {
    writeStorage<Settings>(STORAGE_KEY, {
      theme: theme.value,
      sidebarCollapsed: sidebarCollapsed.value,
    })
  })

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    applyTheme(mode)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    theme,
    sidebarCollapsed,
    setTheme,
    toggleTheme,
    toggleSidebar,
  }
})
