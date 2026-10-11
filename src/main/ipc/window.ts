import { BrowserWindow } from 'electron'

export function getWindow(event?: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  if (event) return BrowserWindow.fromWebContents(event.sender)
  return BrowserWindow.getAllWindows()[0] ?? null
}
