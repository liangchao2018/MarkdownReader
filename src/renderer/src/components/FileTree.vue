<script setup lang="ts">
import { useWorkspaceStore } from '@renderer/stores/workspace'
import { useContextMenu } from '@renderer/composables/contextMenu'
import { usePrompt } from '@renderer/composables/prompt'
import FileTreeNode from './FileTreeNode.vue'

const store = useWorkspaceStore()
const { show } = useContextMenu()
const { prompt } = usePrompt()

async function createAtRoot(type: 'file' | 'directory'): Promise<void> {
  if (!store.root) return
  const label = type === 'directory' ? '文件夹' : '文件'
  const name = await prompt(`新建${label}`, type === 'file' ? '未命名.md' : '', `输入${label}名称`)
  if (name) {
    try {
      await store.createEntry(store.root, name, type)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }
}

// 空白处右键：在工作区根目录新建
function onRootContextMenu(e: MouseEvent): void {
  show(e, [
    { label: '新建文件', action: () => void createAtRoot('file') },
    { label: '新建文件夹', action: () => void createAtRoot('directory') }
  ])
}
</script>

<template>
  <div class="tree" @contextmenu.self="onRootContextMenu">
    <FileTreeNode v-for="node in store.tree" :key="node.path" :node="node" :depth="0" />
    <div v-if="store.tree.length === 0" class="tree__empty">空文件夹</div>
  </div>
</template>

<style scoped>
.tree {
  flex: 1;
  overflow: auto;
  padding-bottom: 8px;
}
.tree__empty {
  padding: 12px 14px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
