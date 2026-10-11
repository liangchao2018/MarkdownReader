import { ipcMain } from 'electron'
import { search } from '../searchIndex'

export function registerSearchHandlers(): void {
  ipcMain.handle('search:query', (_event, query: string) => search(query))
}
