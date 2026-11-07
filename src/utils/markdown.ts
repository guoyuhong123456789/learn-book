import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(code: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch {
        // fall through
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(code) + '</code></pre>'
  },
})

export function renderMarkdown(source: string): string {
  return md.render(source || '')
}

export interface TocItem {
  id: string
  text: string
  level: number
}

export function extractToc(source: string): TocItem[] {
  if (!source) return []
  const tokens = md.parse(source, {})
  const seen = new Map<string, number>()
  const toc: TocItem[] = []
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type === 'heading_open') {
      const level = Number(token.tag.replace('h', ''))
      if (level < 2 || level > 4) continue
      const inline = tokens[i + 1]
      const text = inline ? inline.content.trim() : ''
      if (!text) continue
      let id = slugify(text)
      const count = seen.get(id) ?? 0
      seen.set(id, count + 1)
      if (count > 0) id = `${id}-${count}`
      toc.push({ id, text, level })
    }
  }
  return toc
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
}

export function renderWithAnchors(source: string): string {
  const html = renderMarkdown(source)
  const seen = new Map<string, number>()
  return html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (_match, level: string, inner: string) => {
    const plain = inner.replace(/<[^>]+>/g, '').trim()
    if (!plain) return _match
    let id = slugify(plain)
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`
    return `<h${level} id="${id}">${inner}</h${level}>`
  })
}

export function plainText(source: string, max = 120): string {
  const text = (source || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function extractTitle(source: string): string {
  const match = (source || '').match(/^\s*#\s+(.+)$/m)
  if (match) return match[1].trim()
  const first = (source || '').split('\n').find((line) => line.trim())
  return first ? first.slice(0, 60) : '未命名笔记'
}

export function countWords(source: string): number {
  const text = (source || '').replace(/\s+/g, '')
  return text.length
}
