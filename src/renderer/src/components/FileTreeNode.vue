<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceStore } from '@renderer/stores/workspace'
import { useContextMenu } from '@renderer/composables/contextMenu'
import { usePrompt } from '@renderer/composables/prompt'
import type { TreeNode } from '@renderer/api'

const props = defineProps<{ node: TreeNode; depth: number }>()

const store = useWorkspaceStore()
const { show } = useContextMenu()
const { prompt } = usePrompt()

const expanded = computed(() => store.isExpanded(props.node.path))
const selected = computed(() => store.currentFile === props.node.path)
const children = computed(() => store.childrenOf(props.node.path))
const indent = computed(() => `${props.depth * 14 + 8}px`)

function onClick(): void {
  if (props.node.isDirectory) void store.toggleDir(props.node)
  else store.selectFile(props.node)
}

async function doCreate(type: 'file' | 'directory'): Promise<void> {
  const label = type === 'directory' ? '文件夹' : '文件'
  const def = type === 'file' ? '未命名.md' : ''
  const name = await prompt(`新建${label}`, def, `输入${label}名称`)
  if (name) {
    try {
      await store.createEntry(props.node.path, name, type)
      if (!expanded.value) await store.toggleDir(props.node)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }
}

async function doRename(): Promise<void> {
  const name = await prompt('重命名', props.node.name, '输入新名称')
  if (name && name !== props.node.name) {
    try {
      await store.renameEntry(props.node, name)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }
}

async function doDelete(): Promise<void> {
  if (window.confirm(`确定删除「${props.node.name}」？将移入回收站。`)) {
    try {
      await store.deleteEntry(props.node)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }
}

function onContextMenu(e: MouseEvent): void {
  const items = props.node.isDirectory
    ? [
        { label: '新建文件', action: () => void doCreate('file') },
        { label: '新建文件夹', action: () => void doCreate('directory') },
        { label: '', action: () => {}, separator: true },
        { label: '重命名', action: () => void doRename() },
        { label: '删除', action: () => void doDelete(), danger: true }
      ]
    : [
        { label: '重命名', action: () => void doRename() },
        { label: '删除', action: () => void doDelete(), danger: true }
      ]
  show(e, items)
}
</script>

<template>
  <div class="node">
    <div
      class="node__row"
      :class="{ 'node__row--selected': selected }"
      :style="{ paddingLeft: indent }"
      @click="onClick"
      @contextmenu="onContextMenu"
    >
      <span class="node__arrow">
        <template v-if="node.isDirectory && node.hasChildren">{{ expanded ? '▾' : '▸' }}</template>
      </span>
      <span class="node__icon">{{ node.isDirectory ? (expanded ? '📂' : '📁') : '📄' }}</span>
      <span class="node__name">{{ node.name }}</span>
    </div>
    <div v-if="node.isDirectory && expanded">
      <FileTreeNode v-for="child in children" :key="child.path" :node="child" :depth="depth + 1" />
    </div>
  </div>
</template>

<style scoped>
.node__row {
  display: flex;
  align-items: center;
  height: 26px;
  padding-right: 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.node__row:hover {
  background: rgba(127, 127, 127, 0.12);
}
.node__row--selected {
  background: var(--color-accent);
  color: #fff;
}
.node__arrow {
  width: 14px;
  flex: 0 0 14px;
  font-size: 10px;
  opacity: 0.7;
  text-align: center;
}
.node__icon {
  margin-right: 5px;
  font-size: 13px;
}
.node__name {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
