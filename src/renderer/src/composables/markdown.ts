import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import taskLists from 'markdown-it-task-lists'
import footnote from 'markdown-it-footnote'
import katex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js/lib/common'
import { MEDIA_SCHEME } from '../../../shared/markdown'
import { dirOf, isAbsoluteFsPath, joinFsPath } from '../../../shared/path'

// 与主进程 protocol.ts 的 MEDIA_SCHEME 保持一致：工作区内本地资源经此协议加载

export interface TocItem {
  level: number
  text: string
  slug: string
}

export interface RenderResult {
  html: string
  toc: TocItem[]
}

function toMediaUrl(absPath: string): string {
  return `${MEDIA_SCHEME}://media/${encodeURIComponent(absPath)}`
}

/** 把图片/资源相对路径解析为安全的媒体协议 URL；外链/数据 URL 原样保留 */
function resolveResource(src: string, basePath: string): string {
  if (!src) return src
  if (/^(https?:|data:|blob:|mdreader:)/i.test(src)) return src
  const abs = isAbsoluteFsPath(src) ? src : joinFsPath(dirOf(basePath), src)
  return abs ? toMediaUrl(abs) : src
}

/** 标题 slug：小写、空白转连字符，保留中文 */
function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '')
}

const md: MarkdownIt = new MarkdownIt({
  html: false, // 安全：禁用源码内原始 HTML，防注入
  linkify: true,
  breaks: false,
  highlight(str, lang): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {
        /* 回退到转义 */
      }
    }
    return ''
  }
})

md.use(anchor, { slugify, tabIndex: false })
md.use(taskLists, { enabled: true })
md.use(footnote)
md.use(katex)

// 图片相对路径 -> 媒体协议
const defaultImage =
  md.renderer.rules.image ??
  ((tokens, idx, opts, _env, self): string => self.renderToken(tokens, idx, opts))
md.renderer.rules.image = (tokens, idx, opts, env: { basePath?: string }, self): string => {
  const token = tokens[idx]
  const i = token.attrIndex('src')
  if (i >= 0 && token.attrs) {
    token.attrs[i][1] = resolveResource(token.attrs[i][1], env.basePath ?? '')
  }
  return defaultImage(tokens, idx, opts, env, self)
}

// 链接：内部 .md 链接交给应用打开，外链新窗口，锚点交给点击滚动
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, opts, _env, self): string => self.renderToken(tokens, idx, opts))
md.renderer.rules.link_open = (tokens, idx, opts, env: { basePath?: string }, self): string => {
  const token = tokens[idx]
  const i = token.attrIndex('href')
  if (i >= 0 && token.attrs) {
    const href = token.attrs[i][1]
    if (/^#/.test(href)) {
      token.attrSet('data-anchor', href.slice(1))
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    } else {
      // 本地文件链接（相对或绝对路径）：统一交给应用处理
      // 由点击时做存在性检查与路由（md 用本应用打开 / 其它走系统默认程序）
      const abs = isAbsoluteFsPath(href) ? href : joinFsPath(dirOf(env.basePath ?? ''), href)
      token.attrSet('data-link', abs)
      token.attrSet('href', '#')
    }
  }
  return defaultLinkOpen(tokens, idx, opts, env, self)
}

export function useMarkdown(): { render: (content: string, basePath: string) => RenderResult } {
  function render(content: string, basePath: string): RenderResult {
    const env = { basePath }
    const tokens = md.parse(content, env)
    const toc: TocItem[] = []
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type === 'heading_open') {
        const level = Number(t.tag.slice(1))
        const inline = tokens[i + 1]
        const text = inline?.content ?? ''
        toc.push({ level, text, slug: t.attrGet('id') ?? slugify(text) })
      }
    }
    const html = md.renderer.render(tokens, md.options, env)
    return { html, toc }
  }

  return { render }
}
