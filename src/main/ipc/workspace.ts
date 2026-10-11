import { dialog, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import { readDir } from '../fileSystem'
import { buildIndex } from '../searchIndex'
import { pushRecentFolder, removeRecentFolder } from '../store'
import { setRoot } from '../workspace'
import { watchRoot } from '../watcher'
import type { TreeNode } from '../../preload/types'
import { getWindow } from './window'

async function openWorkspace(
  root: string,
  event: Electron.IpcMainInvokeEvent
): Promise<{ root: string; tree: TreeNode[]; recent: string[] }> {
  const abs = setRoot(root)
  const win = getWindow(event)
  watchRoot(abs, () => win)
  void buildIndex(abs)
  const recent = pushRecentFolder(abs)
  return { root: abs, tree: await readDir(abs), recent }
}

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('dialog:openFolder', async (event) => {
    const win = getWindow(event)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Open folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return openWorkspace(result.filePaths[0], event)
  })

  ipcMain.handle('workspace:openPath', async (event, folder: string) => {
    try {
      const stat = await fs.stat(folder)
      if (!stat.isDirectory()) throw new Error('Not a directory')
    } catch {
      removeRecentFolder(folder)
      throw new Error(`Directory does not exist or was moved: ${folder}`)
    }
    return openWorkspace(folder, event)
  })
}
