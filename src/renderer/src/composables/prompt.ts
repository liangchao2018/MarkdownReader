import { reactive } from 'vue'

interface PromptState {
  open: boolean
  title: string
  value: string
  placeholder: string
  resolve: ((value: string | null) => void) | null
}

// 模块级单例状态，配合 PromptModal.vue 实现 Promise 化的输入框
// （Electron 渲染进程不支持原生 window.prompt）
const state = reactive<PromptState>({
  open: false,
  title: '',
  value: '',
  placeholder: '',
  resolve: null
})

export function usePrompt(): {
  state: PromptState
  prompt: (title: string, defaultValue?: string, placeholder?: string) => Promise<string | null>
  confirm: (value: string) => void
  cancel: () => void
} {
  function prompt(title: string, defaultValue = '', placeholder = ''): Promise<string | null> {
    state.title = title
    state.value = defaultValue
    state.placeholder = placeholder
    state.open = true
    return new Promise((resolve) => {
      state.resolve = resolve
    })
  }

  function confirm(value: string): void {
    state.open = false
    state.resolve?.(value)
    state.resolve = null
  }

  function cancel(): void {
    state.open = false
    state.resolve?.(null)
    state.resolve = null
  }

  return { state, prompt, confirm, cancel }
}
