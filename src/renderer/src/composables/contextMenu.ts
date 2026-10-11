import { reactive } from 'vue'

export interface MenuItem {
  label: string
  action: () => void
  danger?: boolean
  separator?: boolean
}

interface MenuState {
  open: boolean
  x: number
  y: number
  items: MenuItem[]
}

// 模块级单例，配合 ContextMenu.vue 提供全局右键菜单
const state = reactive<MenuState>({ open: false, x: 0, y: 0, items: [] })

export function useContextMenu(): {
  state: MenuState
  show: (e: MouseEvent, items: MenuItem[]) => void
  hide: () => void
} {
  function show(e: MouseEvent, items: MenuItem[]): void {
    e.preventDefault()
    state.x = e.clientX
    state.y = e.clientY
    state.items = items
    state.open = true
  }

  function hide(): void {
    state.open = false
  }

  return { state, show, hide }
}
