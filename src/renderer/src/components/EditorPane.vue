<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@renderer/api'
import { useWorkspaceStore } from '@renderer/stores/workspace'
import { useMarkdown, type TocItem } from '@renderer/composables/markdown'
import PreviewPane, { type HighlightState } from './PreviewPane.vue'
import TabBar from './TabBar.vue'

const emit = defineEmits<{
  (e: 'toc-change', items: TocItem[]): void
}>()

const store = useWorkspaceStore()
const { render } = useMarkdown()

const html = ref('')
const toc = ref<TocItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const preview = ref<InstanceType<typeof PreviewPane> | null>(null)
const findInput = ref<HTMLInputElement | null>(null)
const findOpen = ref(false)
const findQuery = ref('')
const findIndex = ref(-1)
const findCount = ref(0)

watch(toc, (items) => emit('toc-change', items))

function applyHighlightState(state: HighlightState): void {
  findIndex.value = state.index
  findCount.value = state.count
}

function clearFindHighlights(): void {
  preview.value?.clearHighlights()
  findIndex.value = -1
  findCount.value = 0
}

function runFind(): void {
  if (!findQuery.value) {
    clearFindHighlights()
    return
  }
  applyHighlightState(preview.value?.highlightTerm(findQuery.value) ?? { index: -1, count: 0 })
}

function openFind(): void {
  if (!store.currentFile || loading.value || loadError.value) return
  findOpen.value = true
  void nextTick(() => {
    findInput.value?.focus()
    findInput.value?.select()
    runFind()
  })
}

function closeFind(): void {
  findOpen.value = false
  findQuery.value = ''
  clearFindHighlights()
}

function findNext(): void {
  if (!findQuery.value) return
  applyHighlightState(preview.value?.nextHighlight() ?? { index: -1, count: 0 })
}

function findPrevious(): void {
  if (!findQuery.value) return
  applyHighlightState(preview.value?.previousHighlight() ?? { index: -1, count: 0 })
}

function onFindKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) findPrevious()
    else findNext()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeFind()
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    openFind()
  } else if (event.key === 'Escape' && findOpen.value) {
    event.preventDefault()
    closeFind()
  }
}

watch(
  () => [store.currentFile, store.reloadNonce] as const,
  async ([file]) => {
    loadError.value = null
    if (!file) {
      html.value = ''
      toc.value = []
      closeFind()
      return
    }
    loading.value = true
    try {
      const { content } = await api.readFile(file)
      const result = render(content, file)
      html.value = result.html
      toc.value = result.toc
      store.markFresh()
    } catch (e) {
      loadError.value = (e as Error).message
      html.value = ''
      toc.value = []
      closeFind()
    } finally {
      loading.value = false
    }

    await nextTick()
    if (loadError.value || store.currentFile !== file) return
    if (findOpen.value && findQuery.value) runFind()
    else if (store.searchTerm) preview.value?.highlightTerm(store.searchTerm)
    else preview.value?.scrollTop()
  }
)

watch(
  () => store.searchTerm,
  (term) => {
    if (loading.value || findOpen.value) return
    if (term) preview.value?.highlightTerm(term)
    else preview.value?.clearHighlights()
  }
)

watch(findQuery, () => {
  if (!findOpen.value || loading.value) return
  runFind()
})

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))

function onOpenLink(path: string): void {
  void store.openLink(path)
}

defineExpose({
  scrollToSlug: (slug: string) => preview.value?.scrollToSlug(slug)
})
</script>

<template>
  <main class="reader">
    <template v-if="store.currentFile">
      <TabBar />

      <div v-if="findOpen" class="findbar">
        <input
          ref="findInput"
          v-model="findQuery"
          class="findbar__input"
          placeholder="Find in document"
          @keydown="onFindKeydown"
        />
        <span class="findbar__count">
          {{ findQuery ? (findCount ? `${findIndex + 1}/${findCount}` : '0/0') : '' }}
        </span>
        <button class="findbar__button" title="Previous" :disabled="!findCount" @click="findPrevious">
          ↑
        </button>
        <button class="findbar__button" title="Next" :disabled="!findCount" @click="findNext">↓</button>
        <button class="findbar__button" title="Close" @click="closeFind">×</button>
      </div>

      <div v-if="loading" class="reader__status">Loading...</div>
      <div v-else-if="loadError" class="reader__status reader__status--error">{{ loadError }}</div>
      <div v-else class="reader__body">
        <PreviewPane ref="preview" :html="html" @open-link="onOpenLink" />
      </div>
    </template>

    <div v-else class="reader__empty">
      <h1>Markdown Reader</h1>
      <p>Select a Markdown file from the sidebar, or drop one into the window.</p>
      <small>Use the outline, file browser, or full-text search from the sidebar.</small>
    </div>
  </main>
</template>

<style scoped>
.reader {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-editor-bg);
}

.reader__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.reader__status {
  padding: 16px;
  color: var(--color-text-muted);
}

.reader__status--error {
  color: #dc2626;
}

.reader__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-muted);
  text-align: center;
}

.reader__empty h1 {
  margin: 0;
  font-size: 28px;
  color: var(--color-text);
}

.findbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.findbar__input {
  width: min(320px, 45vw);
  height: 28px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-editor-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  outline: none;
}

.findbar__input:focus {
  border-color: var(--color-accent);
}

.findbar__count {
  min-width: 48px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
}

.findbar__button {
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.findbar__button:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.findbar__button:disabled {
  cursor: default;
  opacity: 0.45;
}
</style>
