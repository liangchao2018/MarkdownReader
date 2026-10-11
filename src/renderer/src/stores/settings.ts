import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@renderer/api'

export type Theme = 'system' | 'light' | 'dark'

const ORDER: Theme[] = ['system', 'light', 'dark']
const LABEL: Record<Theme, string> = { system: '跟随系统', light: '亮色', dark: '暗色' }

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>('system')

  function apply(): void {
    const root = document.documentElement
    if (theme.value === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme.value)
  }

  async function init(): Promise<void> {
    theme.value = await api.getTheme()
    apply()
  }

  async function setTheme(t: Theme): Promise<void> {
    theme.value = t
    apply()
    await api.setTheme(t)
  }

  function cycleTheme(): void {
    void setTheme(ORDER[(ORDER.indexOf(theme.value) + 1) % ORDER.length])
  }

  const themeLabel = (): string => LABEL[theme.value]

  return { theme, init, setTheme, cycleTheme, themeLabel }
})
