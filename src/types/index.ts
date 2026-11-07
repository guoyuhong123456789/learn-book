export interface Note {
  id: string
  title: string
  content: string
  categoryId: string | null
  tagIds: string[]
  starred: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export type ThemeMode = 'light' | 'dark'

export interface Settings {
  theme: ThemeMode
  sidebarCollapsed: boolean
}
