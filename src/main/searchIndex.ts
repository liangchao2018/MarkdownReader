import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import type { SearchResult, SearchSnippet } from '../preload/types'
import { MARKDOWN_EXTENSION_SET } from '../shared/markdown'

/** 视为 Markdown 的扩展名（与 ipc 中保持一致） */
const MAX_FILES = 300 // 最多返回的命中文件数
const MAX_SNIPPETS = 3 // 每个文件最多摘要数
const MAX_POSITIONS = 50 // 每个文件最多统计的命中位置
const CTX_BEFORE = 30
const CTX_AFTER = 50

interface Entry {
  path: string
  name: string
  content: string
}

const index = new Map<string, Entry>()
let buildToken = 0

function isMarkdown(p: string): boolean {
  return MARKDOWN_EXTENSION_SET.has(extname(p).toLowerCase())
}

async function addFile(full: string): Promise<void> {
  try {
    const content = await fs.readFile(full, 'utf-8')
    index.set(full, { path: full, name: basename(full), content })
  } catch {
    /* 读取失败（权限/二进制）则跳过 */
  }
}

async function walk(dir: string, token: number): Promise<void> {
  if (token !== buildToken) return // 已有新的构建任务，放弃旧任务
  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) await walk(full, token)
    else if (isMarkdown(e.name)) await addFile(full)
  }
}

/** 全量重建索引（切换工作区时调用）。后台执行，不阻塞打开流程。 */
export async function buildIndex(root: string): Promise<void> {
  const token = ++buildToken
  index.clear()
  await walk(root, token)
}

/** 增量：文件新增/修改 */
export async function updateFile(full: string): Promise<void> {
  if (isMarkdown(full)) await addFile(full)
}

/** 增量：文件或目录删除（含目录下所有条目） */
export function removeFile(full: string): void {
  index.delete(full)
  const prefixA = full + '/'
  const prefixB = full + '\\'
  for (const key of index.keys()) {
    if (key.startsWith(prefixA) || key.startsWith(prefixB)) index.delete(key)
  }
}

export function clearIndex(): void {
  index.clear()
  buildToken++
}

/** 在一段文本中围绕命中位置生成带高亮偏移的摘要（保持字符索引稳定） */
function buildSnippets(content: string, positions: number[], qlen: number): SearchSnippet[] {
  const snippets: SearchSnippet[] = []
  let lastEnd = -1
  for (const p of positions) {
    if (snippets.length >= MAX_SNIPPETS) break
    const start = Math.max(0, p - CTX_BEFORE)
    if (start <= lastEnd) continue // 与上一摘要窗口重叠则跳过
    const end = Math.min(content.length, p + qlen + CTX_AFTER)
    lastEnd = end
    const pre = start > 0 ? '…' : ''
    const post = end < content.length ? '…' : ''
    // 逐字符替换空白，长度不变，保证高亮偏移正确
    const body = content.slice(start, end).replace(/[\r\n\t]/g, ' ')
    const hlStart = pre.length + (p - start)
    snippets.push({ text: pre + body + post, highlights: [[hlStart, hlStart + qlen]] })
  }
  return snippets
}

/** 文件名 + 全文搜索（大小写不敏感） */
export function search(rawQuery: string): SearchResult[] {
  const query = rawQuery.trim()
  if (!query) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const entry of index.values()) {
    const nameMatch = entry.name.toLowerCase().includes(q)
    const lower = entry.content.toLowerCase()
    const positions: number[] = []
    let pos = lower.indexOf(q)
    while (pos !== -1 && positions.length < MAX_POSITIONS) {
      positions.push(pos)
      pos = lower.indexOf(q, pos + q.length)
    }
    if (!nameMatch && positions.length === 0) continue
    results.push({
      path: entry.path,
      name: entry.name,
      fileNameMatch: nameMatch,
      matchCount: positions.length,
      snippets: buildSnippets(entry.content, positions, q.length)
    })
    if (results.length >= MAX_FILES) break
  }

  // 文件名命中优先，其次按命中次数降序
  results.sort((a, b) => {
    if (a.fileNameMatch !== b.fileNameMatch) return a.fileNameMatch ? -1 : 1
    return b.matchCount - a.matchCount
  })
  return results
}
