import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTabsStore = defineStore('tabs', () => {
  const openTabs = ref<string[]>([])
  const currentFile = ref<string | null>(null)
  const searchTerm = ref<string | null>(null)
  const reloadNonce = ref(0)

  function activate(path: string): void {
    if (!openTabs.value.includes(path)) openTabs.value.push(path)
    currentFile.value = path
  }

  function activateTab(path: string): void {
    searchTerm.value = null
    currentFile.value = path
  }

  function clearTabs(): void {
    openTabs.value = []
    currentFile.value = null
    searchTerm.value = null
  }

  function closeTab(path: string): void {
    const idx = openTabs.value.indexOf(path)
    if (idx === -1) return

    const wasCurrent = currentFile.value === path
    openTabs.value.splice(idx, 1)
    if (openTabs.value.length === 0) {
      currentFile.value = null
      searchTerm.value = null
      return
    }
    if (wasCurrent) {
      searchTerm.value = null
      currentFile.value = openTabs.value[idx] ?? openTabs.value[idx - 1] ?? null
    }
  }

  function closeLeftTabs(path: string): void {
    const idx = openTabs.value.indexOf(path)
    if (idx <= 0) return
    const removed = openTabs.value.splice(0, idx)
    if (currentFile.value && removed.includes(currentFile.value)) activateTab(path)
  }

  function closeRightTabs(path: string): void {
    const idx = openTabs.value.indexOf(path)
    if (idx === -1 || idx === openTabs.value.length - 1) return
    const removed = openTabs.value.splice(idx + 1)
    if (currentFile.value && removed.includes(currentFile.value)) activateTab(path)
  }

  function reorderTabs(from: number, to: number): void {
    const tabs = openTabs.value
    if (from < 0 || from >= tabs.length || to < 0 || to >= tabs.length || from === to) return
    const [moved] = tabs.splice(from, 1)
    tabs.splice(to, 0, moved)
  }

  function replacePath(oldPath: string, newPath: string): void {
    const idx = openTabs.value.indexOf(oldPath)
    if (idx !== -1) openTabs.value[idx] = newPath
    if (currentFile.value === oldPath) currentFile.value = newPath
  }

  function openFileForSearch(path: string, term: string): void {
    searchTerm.value = term
    activate(path)
  }

  function clearSearchTerm(): void {
    searchTerm.value = null
  }

  function reloadCurrentFile(): void {
    reloadNonce.value++
  }

  return {
    openTabs,
    currentFile,
    searchTerm,
    reloadNonce,
    activate,
    activateTab,
    clearTabs,
    closeTab,
    closeLeftTabs,
    closeRightTabs,
    reorderTabs,
    replacePath,
    openFileForSearch,
    clearSearchTerm,
    reloadCurrentFile
  }
})
