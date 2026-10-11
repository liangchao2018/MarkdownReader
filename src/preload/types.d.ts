// 主进程 / preload / 渲染进程共享的领域类型。
// 放在 .d.ts 中以便被各端 tsconfig 包含，避免跨工程引用 .ts 报 TS6307。

export interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  /** 目录是否含可显示子项（用于决定是否显示展开箭头） */
  hasChildren?: boolean
}

export interface FileContent {
  content: string
  mtimeMs: number
}

export interface WorkspaceInfo {
  root: string
  tree: TreeNode[]
  recent: string[]
}

export type FsChangeType = 'add' | 'addDir' | 'unlink' | 'unlinkDir' | 'change'

export interface FsChangeEvent {
  type: FsChangeType
  path: string
}

/** 搜索摘要：text 为展示文本，highlights 为其中需高亮的 [起, 止] 字符区间 */
export interface SearchSnippet {
  text: string
  highlights: [number, number][]
}

export interface SearchResult {
  path: string
  name: string
  /** 是否命中文件名 */
  fileNameMatch: boolean
  /** 正文命中次数 */
  matchCount: number
  snippets: SearchSnippet[]
}
