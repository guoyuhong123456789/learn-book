import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Category, Tag } from '@/types'
import { createId, readStorage, writeStorage } from '@/utils/storage'
import { seedCategories, seedTags } from '@/data/seeds'
import { useNotesStore } from './notes'

const CATEGORY_KEY = 'categories'
const TAG_KEY = 'tags'

function loadCategories(): Category[] {
  const stored = readStorage<Category[] | null>(CATEGORY_KEY, null)
  if (stored === null) {
    writeStorage(CATEGORY_KEY, seedCategories)
    return seedCategories
  }
  return stored
}

function loadTags(): Tag[] {
  const stored = readStorage<Tag[] | null>(TAG_KEY, null)
  if (stored === null) {
    writeStorage(TAG_KEY, seedTags)
    return seedTags
  }
  return stored
}

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>(loadCategories())
  const tags = ref<Tag[]>(loadTags())

  function persistCategories() {
    writeStorage(CATEGORY_KEY, categories.value)
  }

  function persistTags() {
    writeStorage(TAG_KEY, tags.value)
  }

  function getCategory(id: string | null): Category | undefined {
    if (!id) return undefined
    return categories.value.find((c) => c.id === id)
  }

  function getTag(id: string): Tag | undefined {
    return tags.value.find((t) => t.id === id)
  }

  function getTagsByIds(ids: string[]): Tag[] {
    return ids.map((id) => getTag(id)).filter((t): t is Tag => Boolean(t))
  }

  function addCategory(name: string, color = '#1677ff'): Category {
    const category: Category = { id: createId('cat'), name: name.trim(), color }
    categories.value.push(category)
    persistCategories()
    return category
  }

  function updateCategory(id: string, payload: Partial<Omit<Category, 'id'>>) {
    const category = categories.value.find((c) => c.id === id)
    if (!category) return
    Object.assign(category, payload)
    persistCategories()
  }

  function removeCategory(id: string) {
    categories.value = categories.value.filter((c) => c.id !== id)
    persistCategories()
    const notesStore = useNotesStore()
    notesStore.notes.forEach((note) => {
      if (note.categoryId === id) note.categoryId = null
    })
    notesStore.replaceAll(notesStore.notes)
  }

  function addTag(name: string, color = 'blue'): Tag {
    const tag: Tag = { id: createId('tag'), name: name.trim(), color }
    tags.value.push(tag)
    persistTags()
    return tag
  }

  function updateTag(id: string, payload: Partial<Omit<Tag, 'id'>>) {
    const tag = tags.value.find((t) => t.id === id)
    if (!tag) return
    Object.assign(tag, payload)
    persistTags()
  }

  function removeTag(id: string) {
    tags.value = tags.value.filter((t) => t.id !== id)
    persistTags()
    const notesStore = useNotesStore()
    notesStore.notes.forEach((note) => {
      note.tagIds = note.tagIds.filter((tagId) => tagId !== id)
    })
    notesStore.replaceAll(notesStore.notes)
  }

  function replaceAll(nextCategories: Category[], nextTags: Tag[]) {
    categories.value = nextCategories
    tags.value = nextTags
    persistCategories()
    persistTags()
  }

  return {
    categories,
    tags,
    getCategory,
    getTag,
    getTagsByIds,
    addCategory,
    updateCategory,
    removeCategory,
    addTag,
    updateTag,
    removeTag,
    replaceAll,
  }
})
