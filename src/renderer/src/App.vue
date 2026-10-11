<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SidebarPane from '@renderer/components/SidebarPane.vue'
import EditorPane from '@renderer/components/EditorPane.vue'
import StatusBar from '@renderer/components/StatusBar.vue'
import ContextMenu from '@renderer/components/ContextMenu.vue'
import PromptModal from '@renderer/components/PromptModal.vue'
import FileChangedModal from '@renderer/components/FileChangedModal.vue'
import { api } from '@renderer/api'
import { useSettingsStore } from '@renderer/stores/settings'
import { useWorkspaceStore } from '@renderer/stores/workspace'
import type { TocItem } from '@renderer/composables/markdown'

const settings = useSettingsStore()
const workspace = useWorkspaceStore()
const editor = ref<InstanceType<typeof EditorPane> | null>(null)
const toc = ref<TocItem[]>([])
const dragOver = ref(false)
let unsubscribeOpen: (() => void) | null = null
let dragDepth = 0

const MD_EXT = /\.(md|markdown|mdown|mkd)$/i

function onTocSelect(slug: string): void {
  editor.value?.scrollToSlug(slug)
}

// —— 外部拖拽 .md 入窗口：打开文件并定位其所在目录 ——
// dragenter/leave 会在子元素间冒泡触发，用计数避免高亮闪烁
function onDragEnter(): void {
  dragDepth++
  dragOver.value = true
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}

function onDrop(e: DragEvent): void {
  dragDepth = 0
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  // 取第一个 Markdown 文件；其余忽略（保持单文档预览语义）
  const md = files.map((f) => api.getPathForFile(f)).find((p) => MD_EXT.test(p))
  if (md) void workspace.openExternalFile(md)
}

onMounted(async () => {
  void settings.init()
  // 运行中通过「打开方式」再次打开的文件
  unsubscribeOpen = api.onOpenFile((path) => void workspace.openExternalFile(path))
  // 由文件关联/命令行启动时带入的文件
  const initial = await api.getOpenFile()
  if (initial) void workspace.openExternalFile(initial)
})

onUnmounted(() => unsubscribeOpen?.())
</script>

<template>
  <div
    class="app"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="app__body">
      <SidebarPane class="app__sidebar" :toc="toc" @toc-select="onTocSelect" />
      <EditorPane ref="editor" class="app__main" @toc-change="toc = $event" />
    </div>
    <StatusBar />
    <ContextMenu />
    <PromptModal />
    <FileChangedModal />

    <div v-if="dragOver" class="app__drop">
      <div class="app__drop-card">拖入 Markdown 文件以打开</div>
    </div>

    <div v-if="workspace.notice" class="app__toast" @click="workspace.dismissNotice()">
      {{ workspace.notice }}
    </div>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}
.app__drop {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.app__drop-card {
  padding: 18px 28px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-accent);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}
.app__toast {
  position: absolute;
  left: 50%;
  bottom: 44px;
  transform: translateX(-50%);
  z-index: 60;
  max-width: 70%;
  padding: 9px 16px;
  font-size: 13px;
  color: #fff;
  background: rgba(31, 35, 40, 0.94);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  word-break: break-all;
}
.app__body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.app__sidebar {
  flex: 0 0 260px;
  width: 260px;
  min-height: 0;
}
.app__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
