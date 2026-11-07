import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: '学习工作台' },
    },
    {
      path: '/notes',
      name: 'notes',
      component: () => import('@/views/NoteListView.vue'),
      meta: { title: '笔记库' },
    },
    {
      path: '/notes/new',
      name: 'note-new',
      component: () => import('@/views/NoteEditView.vue'),
      meta: { title: '新建笔记' },
    },
    {
      path: '/notes/:id',
      name: 'note-read',
      component: () => import('@/views/NoteReadView.vue'),
      meta: { title: '阅读笔记' },
    },
    {
      path: '/notes/:id/edit',
      name: 'note-edit',
      component: () => import('@/views/NoteEditView.vue'),
      meta: { title: '编辑笔记' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/CategoryView.vue'),
      meta: { title: '分类与标签' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || '学习知识库'
  document.title = `${title} · 学习知识库`
})

export default router
