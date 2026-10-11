import { ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'

export function registerLinkHandlers(): void {
  ipcMain.handle('fs:statPath', async (_event, target: string) => {
    try {
      const stat = await fs.stat(target)
      return { exists: true, isDirectory: stat.isDirectory() }
    } catch {
      return { exists: false, isDirectory: false }
    }
  })

  ipcMain.handle('shell:openPath', (_event, target: string) => shell.openPath(target))
}
