import { app, ipcMain } from 'electron'
import { takePendingFile } from '../openFile'

export function registerAppHandlers(): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getOpenFile', () => takePendingFile())
}
