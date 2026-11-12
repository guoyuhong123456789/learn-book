import type { Category, Note, Tag } from '@/types'
import { importApi } from '@/api/knowledge'
import { readStorage, removeStorage, writeStorage } from '@/utils/storage'

const MIGRATED_KEY = 'migratedToDb'

export async function migrateLocalData(): Promise<boolean> {
  if (readStorage<boolean>(MIGRATED_KEY, false)) return false

  const notes = readStorage<Note[] | null>('notes', null)
  if (!notes || notes.length === 0) return false

  const categories = readStorage<Category[]>('categories', [])
  const tags = readStorage<Tag[]>('tags', [])

  await importApi.all({
    notes,
    categories,
    tags,
    mode: 'replace',
  })

  removeStorage('notes')
  removeStorage('categories')
  removeStorage('tags')
  writeStorage(MIGRATED_KEY, true)
  return true
}
