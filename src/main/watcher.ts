import chokidar, { FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import type { FsChangeType, FsChangeEvent } from '../preload/types'
import { updateFile, removeFile } from './searchIndex'

let watcher: FSWatcher | null = null

/**
 * 监听工作区根目录：
 *  - 外部文件变更推送到渲染进程（watch:changed）
 *  - 同步增量更新搜索索引
 * 切换工作区时复用：先关旧 watcher 再建新的。
 */
export function watchRoot(root: string, getWindow: () => BrowserWindow | null): void {
  closeWatcher()

  watcher = chokidar.watch(root, {
    ignoreInitial: true,
    // 忽略隐藏文件、依赖与版本控制目录，避免大目录监听卡顿
    ignored: /(^|[\\/])(\.[^\\/]+|node_modules)([\\/]|$)/,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
  })

  const send = (type: FsChangeType, path: string): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('watch:changed', { type, path } satisfies FsChangeEvent)
    }
  }

  watcher
    .on('add', (p) => {
      void updateFile(p)
      send('add', p)
    })
    .on('change', (p) => {
      void updateFile(p)
      send('change', p)
    })
    .on('unlink', (p) => {
      removeFile(p)
      send('unlink', p)
    })
    .on('unlinkDir', (p) => {
      removeFile(p)
      send('unlinkDir', p)
    })
    .on('addDir', (p) => send('addDir', p))
}

export function closeWatcher(): void {
  if (watcher) {
    void watcher.close()
    watcher = null
  }
}
