import evalRaw from './seeds/eval.md?raw'
import interviewRaw from './seeds/interview-qa.md?raw'
import ragRaw from './seeds/rag-service.md?raw'
import type { Category, Note, Tag } from '@/types'
import { extractTitle } from '@/utils/markdown'

export const seedCategories: Category[] = [
  { id: 'cat_project', name: '项目复盘', color: '#1677ff' },
  { id: 'cat_interview', name: '面试准备', color: '#722ed1' },
  { id: 'cat_ai', name: 'AI 工程', color: '#13c2c2' },
]

export const seedTags: Tag[] = [
  { id: 'tag_rag', name: 'RAG', color: 'blue' },
  { id: 'tag_eval', name: '评测', color: 'green' },
  { id: 'tag_interview', name: '面试', color: 'purple' },
  { id: 'tag_qa', name: '问答', color: 'orange' },
  { id: 'tag_langgraph', name: 'LangGraph', color: 'cyan' },
  { id: 'tag_backend', name: '后端', color: 'geekblue' },
]

interface SeedNoteInput {
  id: string
  title: string
  content: string
  categoryId: string | null
  tagIds: string[]
  daysAgo: number
}

const inputs: SeedNoteInput[] = [
  {
    id: 'note_eval',
    title: extractTitle(evalRaw),
    content: evalRaw,
    categoryId: 'cat_project',
    tagIds: ['tag_rag', 'tag_eval'],
    daysAgo: 2,
  },
  {
    id: 'note_interview',
    title: extractTitle(interviewRaw),
    content: interviewRaw,
    categoryId: 'cat_interview',
    tagIds: ['tag_interview', 'tag_qa'],
    daysAgo: 1,
  },
  {
    id: 'note_rag',
    title: extractTitle(ragRaw),
    content: ragRaw,
    categoryId: 'cat_project',
    tagIds: ['tag_rag', 'tag_backend', 'tag_langgraph'],
    daysAgo: 5,
  },
]

function dateFromDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const seedNotes: Note[] = inputs.map((input) => ({
  id: input.id,
  title: input.title,
  content: input.content,
  categoryId: input.categoryId,
  tagIds: input.tagIds,
  starred: false,
  createdAt: dateFromDaysAgo(input.daysAgo + 3),
  updatedAt: dateFromDaysAgo(input.daysAgo),
}))
