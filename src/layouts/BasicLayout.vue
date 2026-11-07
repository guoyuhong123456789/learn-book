<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BookOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbFilled,
  PlusOutlined,
  SettingOutlined,
  BulbOutlined,
} from '@ant-design/icons-vue'
import type { MenuProps } from 'ant-design-vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

const searchValue = ref('')

const menuItems: MenuProps['items'] = [
  { key: '/', icon: () => h(DashboardOutlined), label: '学习工作台' },
  { key: '/notes', icon: () => h(BookOutlined), label: '笔记库' },
  { key: '/categories', icon: () => h(FolderOpenOutlined), label: '分类与标签' },
  { key: '/settings', icon: () => h(SettingOutlined), label: '设置' },
]

const selectedKeys = computed<string[]>(() => {
  if (route.path.startsWith('/notes')) return ['/notes']
  if (route.path.startsWith('/categories')) return ['/categories']
  if (route.path.startsWith('/settings')) return ['/settings']
  return ['/']
})

function handleMenuClick({ key }: { key: string | number }) {
  router.push(String(key))
}

function handleSearch(value: string) {
  const keyword = value.trim()
  router.push({ path: '/notes', query: keyword ? { q: keyword } : {} })
}

function createNote() {
  router.push('/notes/new')
}
</script>

<template>
  <a-layout class="app-layout">
    <a-layout-sider
      :collapsed="settings.sidebarCollapsed"
      :trigger="null"
      collapsible
      :width="220"
      :theme="settings.theme === 'dark' ? 'dark' : 'light'"
      class="app-sider"
      breakpoint="lg"
      @collapse="settings.sidebarCollapsed = $event"
    >
      <div class="app-logo" @click="router.push('/')">
        <BookOutlined class="app-logo-icon" />
        <span v-show="!settings.sidebarCollapsed" class="app-logo-text">学习知识库</span>
      </div>
      <a-menu
        :selected-keys="selectedKeys"
        :items="menuItems"
        mode="inline"
        :theme="settings.theme === 'dark' ? 'dark' : 'light'"
        class="app-menu"
        @click="handleMenuClick"
      />
      <div v-show="!settings.sidebarCollapsed" class="app-sider-footer">
        <div class="app-sider-hint">本地笔记 · 数据存于浏览器</div>
      </div>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="app-header">
        <div class="app-header-left">
          <a-button type="text" class="collapse-btn" @click="settings.toggleSidebar">
            <MenuUnfoldOutlined v-if="settings.sidebarCollapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
          <a-input-search
            v-model:value="searchValue"
            placeholder="搜索笔记标题或内容…"
            allow-clear
            class="app-search"
            @search="handleSearch"
          />
        </div>
        <div class="app-header-right">
          <a-button type="text" class="theme-btn" @click="settings.toggleTheme">
            <BulbFilled v-if="settings.theme === 'dark'" />
            <BulbOutlined v-else />
          </a-button>
          <a-button type="primary" @click="createNote">
            <template #icon><PlusOutlined /></template>
            <span class="new-note-text">新建笔记</span>
          </a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="app-content">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-sider {
  border-right: 1px solid var(--km-border);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 20px;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
}

.app-logo-icon {
  font-size: 22px;
  color: var(--km-primary);
}

.app-logo-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--km-text);
}

.app-menu {
  border-inline-end: none;
  background: transparent;
}

.app-sider-footer {
  padding: 16px 20px;
  margin-top: 12px;
}

.app-sider-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--km-text-secondary);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 20px;
  background: var(--km-header-bg);
  border-bottom: 1px solid var(--km-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.collapse-btn,
.theme-btn {
  font-size: 16px;
}

.app-search {
  max-width: 420px;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-content {
  padding: 24px;
  background: var(--km-content-bg);
  min-height: calc(100vh - 56px);
}

@media (max-width: 768px) {
  .app-content {
    padding: 16px;
  }
  .app-search {
    max-width: none;
  }
  .new-note-text {
    display: none;
  }
}
</style>
