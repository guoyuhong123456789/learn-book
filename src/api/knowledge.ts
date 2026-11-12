import type { Category, Note, Tag } from '@/types'
import { http } from './http'

export type ImportMode = 'merge' | 'replace'

export interface ImportPayload {
  notes?: Note[]
  categories?: Category[]
  tags?: Tag[]
  mode?: ImportMode
}

export interface ImportResult {
  imported: number
  mode: string
}

export interface HealthResponse {
  status: string
  database: string
  notes: number
  categories: number
  tags: number
}

export const notesApi = {
  list: () => http.get<Note[]>('/notes'),
  get: (id: string) => http.get<Note>(`/notes/${id}`),
  create: (payload: Partial<Note>) => http.post<Note>('/notes', payload),
  update: (id: string, payload: Partial<Note>) => http.put<Note>(`/notes/${id}`, payload),
  toggleStar: (id: string) => http.patch<Note>(`/notes/${id}/star`),
  remove: (id: string) => http.delete<void>(`/notes/${id}`),
  clearAll: () => http.delete<void>('/notes'),
}

export const categoriesApi = {
  list: () => http.get<Category[]>('/categories'),
  create: (payload: Partial<Category>) => http.post<Category>('/categories', payload),
  update: (id: string, payload: Partial<Category>) =>
    http.put<Category>(`/categories/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/categories/${id}`),
}

export const tagsApi = {
  list: () => http.get<Tag[]>('/tags'),
  create: (payload: Partial<Tag>) => http.post<Tag>('/tags', payload),
  update: (id: string, payload: Partial<Tag>) => http.put<Tag>(`/tags/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/tags/${id}`),
}

export const importApi = {
  all: (payload: ImportPayload) => http.post<ImportResult>('/import', payload),
}

export const healthApi = {
  get: () => http.get<HealthResponse>('/health'),
}
