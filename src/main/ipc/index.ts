import { clearIndex } from '../searchIndex'
import { closeWatcher } from '../watcher'
import { registerAppHandlers } from './app'
import { registerFsHandlers } from './fs'
import { registerLinkHandlers } from './links'
import { registerSearchHandlers } from './search'
import { registerStoreHandlers } from './store'
import { registerWorkspaceHandlers } from './workspace'

export function registerIpcHandlers(): void {
  registerAppHandlers()
  registerWorkspaceHandlers()
  registerFsHandlers()
  registerLinkHandlers()
  registerSearchHandlers()
  registerStoreHandlers()
}

export function disposeIpc(): void {
  closeWatcher()
  clearIndex()
}
