import { ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import {
  createEntry,
  moveEntry,
  readDir,
  renameEntry
} from '../fileSystem'
import { assertInsideRoot } from '../workspace'
import type { FileContent, TreeNode } from '../../preload/types'

export function registerFsHandlers(): void {
  ipcMain.handle('fs:readTree', async (_event, dirPath: string) => {
    return readDir(assertInsideRoot(dirPath))
  })

  ipcMain.handle('fs:readFile', async (_event, filePath: string): Promise<FileContent> => {
    const abs = assertInsideRoot(filePath)
    const [content, stat] = await Promise.all([fs.readFile(abs, 'utf-8'), fs.stat(abs)])
    return { content, mtimeMs: stat.mtimeMs }
  })

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    const abs = assertInsideRoot(filePath)
    await fs.writeFile(abs, content, 'utf-8')
    const stat = await fs.stat(abs)
    return { mtimeMs: stat.mtimeMs }
  })

  ipcMain.handle(
    'fs:create',
    async (_event, parentDir: string, name: string, type: 'file' | 'directory'): Promise<TreeNode> => {
      const parent = assertInsideRoot(parentDir)
      assertInsideRoot(join(parent, name))
      return createEntry(parent, name, type)
    }
  )

  ipcMain.handle('fs:delete', async (_event, targetPath: string) => {
    const abs = assertInsideRoot(targetPath)
    await shell.trashItem(abs)
  })

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newName: string): Promise<TreeNode> => {
    const abs = assertInsideRoot(oldPath)
    assertInsideRoot(join(abs, '..', newName))
    return renameEntry(abs, newName)
  })

  ipcMain.handle('fs:move', async (_event, srcPath: string, targetDir: string): Promise<TreeNode> => {
    const src = assertInsideRoot(srcPath)
    const dir = assertInsideRoot(targetDir)
    assertInsideRoot(join(dir, src.split(/[\\/]/).pop() ?? ''))
    return moveEntry(src, dir)
  })
}
