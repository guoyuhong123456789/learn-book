import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Category, Tag } from '@/types'
import { categoriesApi, tagsApi } from '@/api/knowledge'
import { errorMessage } from '@/api/http'
import { useNotesStore } from './notes'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [categoryList, tagList] = await Promise.all([
        categoriesApi.list(),
        tagsApi.list(),
      ])
      categories.value = categoryList
      tags.value = tagList
    } catch (e) {
      error.value = errorMessage(e)
      throw e
    } finally {
      loading.value = false
    }
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

  async function addCategory(name: string, color = '#1677ff'): Promise<Category> {
    const category = await categoriesApi.create({ name: name.trim(), color })
    categories.value.push(category)
    return category
  }

  async function updateCategory(id: string, payload: Partial<Omit<Category, 'id'>>) {
    const updated = await categoriesApi.update(id, payload)
    const index = categories.value.findIndex((c) => c.id === id)
    if (index >= 0) {
      categories.value[index] = updated
    }
    return updated
  }

  async function removeCategory(id: string): Promise<void> {
    await categoriesApi.remove(id)
    categories.value = categories.value.filter((c) => c.id !== id)
    await useNotesStore().fetchNotes()
  }

  async function addTag(name: string, color = 'blue'): Promise<Tag> {
    const tag = await tagsApi.create({ name: name.trim(), color })
    tags.value.push(tag)
    return tag
  }

  async function updateTag(id: string, payload: Partial<Omit<Tag, 'id'>>) {
    const updated = await tagsApi.update(id, payload)
    const index = tags.value.findIndex((t) => t.id === id)
    if (index >= 0) {
      tags.value[index] = updated
    }
    return updated
  }

  async function removeTag(id: string): Promise<void> {
    await tagsApi.remove(id)
    tags.value = tags.value.filter((t) => t.id !== id)
    await useNotesStore().fetchNotes()
  }

  return {
    categories,
    tags,
    loading,
    error,
    fetchAll,
    getCategory,
    getTag,
    getTagsByIds,
    addCategory,
    updateCategory,
    removeCategory,
    addTag,
    updateTag,
    removeTag,
  }
})
