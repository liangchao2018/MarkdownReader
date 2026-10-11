import { ipcMain } from 'electron'
import {
  getConfig,
  getRecentFolders,
  removeRecentFolder,
  setConfig
} from '../store'

export function registerStoreHandlers(): void {
  ipcMain.handle('store:get', (_event, key: 'recentFolders' | 'theme' | 'windowBounds') =>
    getConfig(key)
  )

  ipcMain.handle('store:set', (_event, key: 'theme' | 'windowBounds', value: unknown) =>
    setConfig(key as 'theme', value as never)
  )

  ipcMain.handle('recent:list', () => getRecentFolders())
  ipcMain.handle('recent:remove', (_event, folder: string) => removeRecentFolder(folder))
}
