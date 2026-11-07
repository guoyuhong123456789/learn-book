import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Note } from '@/types'
import { createId, readStorage, writeStorage } from '@/utils/storage'
import { seedNotes } from '@/data/seeds'

const STORAGE_KEY = 'notes'

function loadNotes(): Note[] {
  const stored = readStorage<Note[] | null>(STORAGE_KEY, null)
  if (stored === null) {
    writeStorage(STORAGE_KEY, seedNotes)
    return seedNotes
  }
  return stored
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>(loadNotes())

  const sortedByUpdated = computed(() =>
    [...notes.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  const starredNotes = computed(() => sortedByUpdated.value.filter((n) => n.starred))

  function persist() {
    writeStorage(STORAGE_KEY, notes.value)
  }

  function getById(id: string): Note | undefined {
    return notes.value.find((n) => n.id === id)
  }

  function createNote(payload: Partial<Note> = {}): Note {
    const now = new Date().toISOString()
    const note: Note = {
      id: createId('note'),
      title: payload.title?.trim() || '未命名笔记',
      content: payload.content ?? '',
      categoryId: payload.categoryId ?? null,
      tagIds: payload.tagIds ?? [],
      starred: payload.starred ?? false,
      createdAt: now,
      updatedAt: now,
    }
    notes.value.unshift(note)
    persist()
    return note
  }

  function updateNote(id: string, payload: Partial<Note>) {
    const note = getById(id)
    if (!note) return
    Object.assign(note, payload, { updatedAt: new Date().toISOString() })
    persist()
  }

  function removeNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
    persist()
  }

  function toggleStar(id: string) {
    const note = getById(id)
    if (!note) return
    note.starred = !note.starred
    persist()
  }

  function replaceAll(next: Note[]) {
    notes.value = next
    persist()
  }

  function clearAll() {
    notes.value = []
    persist()
  }

  function importNotes(list: Note[]) {
    notes.value = [...list, ...notes.value]
    persist()
  }

  function countByCategory(categoryId: string): number {
    return notes.value.filter((n) => n.categoryId === categoryId).length
  }

  function countByTag(tagId: string): number {
    return notes.value.filter((n) => n.tagIds.includes(tagId)).length
  }

  return {
    notes,
    sortedByUpdated,
    starredNotes,
    getById,
    createNote,
    updateNote,
    removeNote,
    toggleStar,
    replaceAll,
    clearAll,
    importNotes,
    countByCategory,
    countByTag,
  }
})
