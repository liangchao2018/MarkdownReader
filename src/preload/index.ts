import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  TreeNode,
  FileContent,
  WorkspaceInfo,
  FsChangeEvent,
  SearchResult
} from './types'

// 暴露给渲染进程的白名单 API（与主进程 IPC handler 一一对应）
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  // 拖拽：Electron 42 已移除 File.path，需用 webUtils 取被拖入文件的真实磁盘路径
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  // 文件关联：启动时拉取待打开的 .md（仅一次），并订阅运行中的「打开方式」推送
  getOpenFile: (): Promise<string | null> => ipcRenderer.invoke('app:getOpenFile'),
  onOpenFile: (cb: (path: string) => void): (() => void) => {
    const listener = (_e: unknown, path: string): void => cb(path)
    ipcRenderer.on('open:file', listener)
    return () => ipcRenderer.off('open:file', listener)
  },

  // 工作区
  openFolder: (): Promise<WorkspaceInfo | null> => ipcRenderer.invoke('dialog:openFolder'),
  openPath: (folder: string): Promise<WorkspaceInfo> =>
    ipcRenderer.invoke('workspace:openPath', folder),

  // 文件系统
  readTree: (dirPath: string): Promise<TreeNode[]> => ipcRenderer.invoke('fs:readTree', dirPath),
  readFile: (filePath: string): Promise<FileContent> => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string): Promise<{ mtimeMs: number }> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  create: (parentDir: string, name: string, type: 'file' | 'directory'): Promise<TreeNode> =>
    ipcRenderer.invoke('fs:create', parentDir, name, type),
  delete: (targetPath: string): Promise<void> => ipcRenderer.invoke('fs:delete', targetPath),
  rename: (oldPath: string, newName: string): Promise<TreeNode> =>
    ipcRenderer.invoke('fs:rename', oldPath, newName),
  move: (srcPath: string, targetDir: string): Promise<TreeNode> =>
    ipcRenderer.invoke('fs:move', srcPath, targetDir),

  // 文档链接：存在性检查 / 系统默认程序打开
  statPath: (path: string): Promise<{ exists: boolean; isDirectory: boolean }> =>
    ipcRenderer.invoke('fs:statPath', path),
  openExternalPath: (path: string): Promise<string> => ipcRenderer.invoke('shell:openPath', path),

  // 搜索
  search: (query: string): Promise<SearchResult[]> => ipcRenderer.invoke('search:query', query),

  // 最近列表
  getRecent: (): Promise<string[]> => ipcRenderer.invoke('recent:list'),
  removeRecent: (folder: string): Promise<string[]> => ipcRenderer.invoke('recent:remove', folder),

  // 主题
  getTheme: (): Promise<'system' | 'light' | 'dark'> => ipcRenderer.invoke('store:get', 'theme'),
  setTheme: (theme: 'system' | 'light' | 'dark'): Promise<void> =>
    ipcRenderer.invoke('store:set', 'theme', theme),

  // 文件系统变更订阅，返回取消订阅函数
  onFsChange: (cb: (event: FsChangeEvent) => void): (() => void) => {
    const listener = (_e: unknown, payload: FsChangeEvent): void => cb(payload)
    ipcRenderer.on('watch:changed', listener)
    return () => ipcRenderer.off('watch:changed', listener)
  }
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (在 index.d.ts 中声明)
  window.electron = electronAPI
  // @ts-ignore (在 index.d.ts 中声明)
  window.api = api
}
