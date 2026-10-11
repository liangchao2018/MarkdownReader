import Store from 'electron-store'

interface AppConfig {
  /** 最近打开的工作区目录（去重，最新在前） */
  recentFolders: string[]
  /** 主题：跟随系统 / 亮 / 暗（M2 使用，先持久化） */
  theme: 'system' | 'light' | 'dark'
  /** 窗口尺寸记忆 */
  windowBounds: { width: number; height: number }
}

const MAX_RECENT = 10

const store = new Store<AppConfig>({
  defaults: {
    recentFolders: [],
    theme: 'system',
    windowBounds: { width: 1200, height: 800 }
  }
})

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return store.get(key)
}

export function setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  store.set(key, value)
}

export function getRecentFolders(): string[] {
  return store.get('recentFolders')
}

/** 把目录置顶到最近列表，去重并截断 */
export function pushRecentFolder(folder: string): string[] {
  const next = [folder, ...store.get('recentFolders').filter((f) => f !== folder)].slice(0, MAX_RECENT)
  store.set('recentFolders', next)
  return next
}

export function removeRecentFolder(folder: string): string[] {
  const next = store.get('recentFolders').filter((f) => f !== folder)
  store.set('recentFolders', next)
  return next
}
