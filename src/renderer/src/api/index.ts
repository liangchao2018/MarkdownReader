// 对 preload 暴露的 window.api 的封装入口。
// 统一从这里转发 fs / workspace / search 调用，便于统一类型与错误处理。
export const api = window.api

// 复用 preload 中定义的类型，渲染层无需重复声明
export type {
  TreeNode,
  FileContent,
  WorkspaceInfo,
  FsChangeType,
  FsChangeEvent,
  SearchResult,
  SearchSnippet
} from '../../../preload/types'
