import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { api, type TreeNode, type WorkspaceInfo } from '@renderer/api'
import { MARKDOWN_FILE_RE } from '../../../shared/markdown'
import { useTabsStore } from './tabs'

/** 取路径所在目录（兼容 \ 与 /） */
function parentDir(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx <= 0 ? p : p.slice(0, idx)
}

/** 取路径末段文件名（兼容 \ 与 /） */
function baseName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

/** 视为 Markdown 的扩展名（与主进程 MD_EXTS 对应） */
/** 比较两个路径是否指向同一文件（统一分隔符；Windows 大小写不敏感） */
function samePath(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  const norm = (p: string): string => p.replace(/\\/g, '/').toLowerCase()
  return norm(a) === norm(b)
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const tabs = useTabsStore()
  const { openTabs, currentFile, searchTerm, reloadNonce } = storeToRefs(tabs)
  const root = ref<string | null>(null)
  const recent = ref<string[]>([])
  /** 顶层节点 */
  const tree = ref<TreeNode[]>([])
  /** 已展开目录路径 */
  const expanded = ref<Set<string>>(new Set())
  /** 目录 -> 子节点缓存（懒加载） */
  const children = ref<Map<string, TreeNode[]>>(new Map())
  /** 已打开的文件标签（按显示顺序） */
  /** 当前预览文件在磁盘上被外部进程修改（或删除），尚未确认是否重载 */
  const currentFileChanged = ref(false)
  /** 当前预览文件已被外部删除 */
  const currentFileDeleted = ref(false)
  /** 自增计数：递增即请求 EditorPane 重新读取当前文件（路径不变也生效） */
  /** 由搜索结果打开时携带的命中词，供预览定位高亮；普通打开为 null */
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 轻量、自动消失的提示（如链接文件不存在） */
  const notice = ref<string | null>(null)
  let noticeTimer: ReturnType<typeof setTimeout> | null = null

  const rootName = computed(() => {
    if (!root.value) return ''
    const parts = root.value.split(/[\\/]/).filter(Boolean)
    return parts[parts.length - 1] ?? root.value
  })

  /** 路径是否位于当前工作区根目录内（统一分隔符；Windows 大小写不敏感） */
  function insideRoot(p: string): boolean {
    if (!root.value) return false
    const norm = (s: string): string => s.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
    const r = norm(root.value)
    const t = norm(p)
    return t === r || t.startsWith(r + '/')
  }

  function notify(message: string): void {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => (notice.value = null), 3500)
  }

  function dismissNotice(): void {
    if (noticeTimer) clearTimeout(noticeTimer)
    notice.value = null
  }

  function applyWorkspace(info: WorkspaceInfo): void {
    root.value = info.root
    tree.value = info.tree
    recent.value = info.recent
    expanded.value = new Set()
    children.value = new Map()
    tabs.clearTabs()
    error.value = null
  }

  /** 打开/激活一个文件标签（不在标签列表中则追加到末尾）；不改动 searchTerm */
  function activate(path: string): void {
    tabs.activate(path)
  }

  /** 还原到初始（未打开工作区）状态 */
  async function loadRecent(): Promise<void> {
    recent.value = await api.getRecent()
  }

  async function openFolder(): Promise<void> {
    loading.value = true
    try {
      const info = await api.openFolder()
      if (info) applyWorkspace(info)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function openPath(folder: string): Promise<void> {
    loading.value = true
    try {
      applyWorkspace(await api.openPath(folder))
    } catch (e) {
      error.value = (e as Error).message
      recent.value = await api.getRecent()
    } finally {
      loading.value = false
    }
  }

  /**
   * 由系统「打开方式」/命令行传入的单个文件：
   * 打开其所在目录为工作区（受安全根目录约束需如此），随后定位该文件。
   */
  async function openExternalFile(filePath: string): Promise<void> {
    // 已在当前工作区内：直接开标签，避免重置工作区而丢失已打开的标签
    if (insideRoot(filePath)) {
      tabs.clearSearchTerm()
      activate(filePath)
      return
    }
    await openPath(parentDir(filePath))
    if (!error.value && root.value) {
      tabs.clearSearchTerm()
      activate(filePath)
    }
  }

  async function removeRecent(folder: string): Promise<void> {
    recent.value = await api.removeRecent(folder)
  }

  function childrenOf(dirPath: string): TreeNode[] {
    return children.value.get(dirPath) ?? []
  }

  function isExpanded(dirPath: string): boolean {
    return expanded.value.has(dirPath)
  }

  async function loadDir(dirPath: string): Promise<void> {
    const nodes = await api.readTree(dirPath)
    children.value.set(dirPath, nodes)
  }

  async function toggleDir(node: TreeNode): Promise<void> {
    if (expanded.value.has(node.path)) {
      expanded.value.delete(node.path)
      return
    }
    if (!children.value.has(node.path)) await loadDir(node.path)
    expanded.value.add(node.path)
  }

  function selectFile(node: TreeNode): void {
    tabs.clearSearchTerm()
    activate(node.path)
  }

  /** 点击标签：切换到该已打开文件 */
  function activateTab(path: string): void {
    tabs.activateTab(path)
  }

  /** 关闭单个标签：若是当前标签则切到相邻标签；关到空则还原初始状态 */
  function closeTab(path: string): void {
    tabs.closeTab(path)
    if (!currentFile.value) dismissExternalChange()
  }

  /** 关闭目标标签左侧的所有标签 */
  function closeLeftTabs(path: string): void {
    tabs.closeLeftTabs(path)
  }

  /** 关闭目标标签右侧的所有标签 */
  function closeRightTabs(path: string): void {
    tabs.closeRightTabs(path)
  }

  /** 关闭全部标签：还原到初始状态 */
  function closeAllTabs(): void {
    tabs.clearTabs()
    dismissExternalChange()
  }

  /** 拖拽排序：把第 from 个标签移动到第 to 个位置 */
  function reorderTabs(from: number, to: number): void {
    tabs.reorderTabs(from, to)
  }

  /**
   * 处理文档内的本地文件链接：
   * 不存在则提示；md 用本应用打开（必要时切换工作区）；其它交系统默认程序。
   */
  async function openLink(target: string): Promise<void> {
    const info = await api.statPath(target)
    if (!info.exists) {
      notify(`链接的文件不存在：${baseName(target)}`)
      return
    }
    if (!info.isDirectory && MARKDOWN_FILE_RE.test(target)) {
      if (insideRoot(target)) {
        tabs.clearSearchTerm()
        activate(target)
      } else {
        await openExternalFile(target)
      }
      return
    }
    const err = await api.openExternalPath(target)
    if (err) notify(`无法打开：${err}`)
  }

  /** 从搜索结果打开文件，并记录命中词用于预览高亮 */
  function openFileForSearch(path: string, term: string): void {
    tabs.openFileForSearch(path, term)
  }

  /** 重新读取某目录（root 或已缓存目录）以反映变更 */
  async function refreshDir(dirPath: string): Promise<void> {
    if (dirPath === root.value) {
      tree.value = await api.readTree(dirPath)
    } else if (children.value.has(dirPath)) {
      await loadDir(dirPath)
    }
  }

  // —— 文件操作 ——
  async function createEntry(parent: string, name: string, type: 'file' | 'directory'): Promise<void> {
    await api.create(parent, name, type)
    if (!expanded.value.has(parent) && parent !== root.value) {
      await toggleDir({ name: '', path: parent, isDirectory: true })
    } else {
      await refreshDir(parent)
    }
  }

  async function renameEntry(node: TreeNode, newName: string): Promise<void> {
    const result = await api.rename(node.path, newName)
    await refreshDir(parentDir(node.path))
    tabs.replacePath(node.path, result.path)
  }

  async function deleteEntry(node: TreeNode): Promise<void> {
    await api.delete(node.path)
    children.value.delete(node.path)
    expanded.value.delete(node.path)
    await refreshDir(parentDir(node.path))
    // 若该文件已作为标签打开，连同标签一并关闭（必要时切换/还原）
    closeTab(node.path)
  }

  /** 监听主进程文件系统变更，刷新对应目录；并检测当前预览文件被外部改动 */
  function subscribeFsChanges(): () => void {
    return api.onFsChange((event) => {
      void refreshDir(parentDir(event.path))
      if (!samePath(event.path, currentFile.value)) return
      if (event.type === 'change') currentFileChanged.value = true
      else if (event.type === 'unlink') currentFileDeleted.value = true
    })
  }

  /** 重新读取当前文件（确认重载），并清除「已变更」提示 */
  function reloadCurrentFile(): void {
    currentFileChanged.value = false
    tabs.reloadCurrentFile()
  }

  /** 忽略本次外部变更提示，保留当前已渲染内容 */
  function dismissExternalChange(): void {
    currentFileChanged.value = false
    currentFileDeleted.value = false
  }

  /** EditorPane 完成一次读取后调用：当前显示内容已与磁盘一致 */
  function markFresh(): void {
    currentFileChanged.value = false
    currentFileDeleted.value = false
  }

  return {
    root,
    rootName,
    recent,
    tree,
    openTabs,
    currentFile,
    currentFileChanged,
    currentFileDeleted,
    reloadNonce,
    searchTerm,
    loading,
    error,
    notice,
    childrenOf,
    isExpanded,
    loadRecent,
    openFolder,
    openPath,
    openExternalFile,
    removeRecent,
    toggleDir,
    selectFile,
    activateTab,
    closeTab,
    closeLeftTabs,
    closeRightTabs,
    closeAllTabs,
    reorderTabs,
    openLink,
    notify,
    dismissNotice,
    openFileForSearch,
    createEntry,
    renameEntry,
    deleteEntry,
    subscribeFsChanges,
    reloadCurrentFile,
    dismissExternalChange,
    markFresh
  }
})
