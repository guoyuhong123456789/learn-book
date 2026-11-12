import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Note } from '@/types'
import { notesApi } from '@/api/knowledge'
import { errorMessage } from '@/api/http'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sortedByUpdated = computed(() =>
    [...notes.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  const starredNotes = computed(() => sortedByUpdated.value.filter((n) => n.starred))

  async function fetchNotes(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      notes.value = await notesApi.list()
    } catch (e) {
      error.value = errorMessage(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function getById(id: string): Note | undefined {
    return notes.value.find((n) => n.id === id)
  }

  async function createNote(payload: Partial<Note> = {}): Promise<Note> {
    const note = await notesApi.create({
      title: payload.title?.trim() || '未命名笔记',
      content: payload.content ?? '',
      categoryId: payload.categoryId ?? null,
      tagIds: payload.tagIds ?? [],
      starred: payload.starred ?? false,
    })
    notes.value.unshift(note)
    return note
  }

  async function updateNote(id: string, payload: Partial<Note>): Promise<Note> {
    const updated = await notesApi.update(id, payload)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index >= 0) {
      notes.value[index] = updated
    }
    return updated
  }

  async function removeNote(id: string): Promise<void> {
    await notesApi.remove(id)
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  async function toggleStar(id: string): Promise<Note> {
    const updated = await notesApi.toggleStar(id)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index >= 0) {
      notes.value[index] = updated
    }
    return updated
  }

  async function clearAll(): Promise<void> {
    await notesApi.clearAll()
    notes.value = []
  }

  function countByCategory(categoryId: string): number {
    return notes.value.filter((n) => n.categoryId === categoryId).length
  }

  function countByTag(tagId: string): number {
    return notes.value.filter((n) => n.tagIds.includes(tagId)).length
  }

  return {
    notes,
    loading,
    error,
    sortedByUpdated,
    starredNotes,
    fetchNotes,
    getById,
    createNote,
    updateNote,
    removeNote,
    toggleStar,
    clearAll,
    countByCategory,
    countByTag,
  }
})
