<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useWorkspaceStore } from '@renderer/stores/workspace'
import type { TocItem } from '@renderer/composables/markdown'
import FileTree from './FileTree.vue'
import SearchPane from './SearchPane.vue'
import TocPane from './TocPane.vue'

const props = defineProps<{ toc: TocItem[] }>()
const emit = defineEmits<{ (e: 'toc-select', slug: string): void }>()

const store = useWorkspaceStore()
const mode = ref<'toc' | 'files' | 'search'>('files')
let unsubscribe: (() => void) | null = null

// 实际生效的标签：若所选标签当前不可用（无大纲 / 未打开文件夹），自动回退
const effectiveMode = computed<'toc' | 'files' | 'search'>(() => {
  if (mode.value === 'toc' && props.toc.length) return 'toc'
  if (mode.value === 'search' && store.root) return 'search'
  if (mode.value === 'files' && store.root) return 'files'
  if (store.root) return 'files'
  if (props.toc.length) return 'toc'
  return 'files'
})

onMounted(() => {
  void store.loadRecent()
  unsubscribe = store.subscribeFsChanges()
})

onUnmounted(() => unsubscribe?.())

function folderName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__header">
      <span class="sidebar__title" :title="store.root ?? ''">
        {{ store.root ? store.rootName : '资源管理器' }}
      </span>
      <button class="sidebar__open" title="打开文件夹" @click="store.openFolder()">打开</button>
    </div>

    <!-- 大纲 / 文件 / 搜索 切换 -->
    <div v-if="store.root || toc.length" class="sidebar__tabs">
      <button
        v-if="toc.length"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--on': effectiveMode === 'toc' }"
        @click="mode = 'toc'"
      >
        大纲
      </button>
      <button
        v-if="store.root"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--on': effectiveMode === 'files' }"
        @click="mode = 'files'"
      >
        文件
      </button>
      <button
        v-if="store.root"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--on': effectiveMode === 'search' }"
        @click="mode = 'search'"
      >
        搜索
      </button>
    </div>

    <!-- 大纲 / 目录树 / 搜索 -->
    <TocPane v-if="effectiveMode === 'toc'" :items="toc" @select="emit('toc-select', $event)" />
    <SearchPane v-else-if="effectiveMode === 'search'" />
    <FileTree v-else-if="store.root" />

    <!-- 未打开：最近列表 -->
    <div v-else class="sidebar__welcome">
      <p class="sidebar__hint">尚未打开文件夹</p>
      <button class="sidebar__cta" @click="store.openFolder()">打开文件夹</button>

      <template v-if="store.recent.length">
        <div class="sidebar__recent-label">最近打开</div>
        <ul class="recent">
          <li v-for="folder in store.recent" :key="folder" class="recent__item">
            <button class="recent__open" :title="folder" @click="store.openPath(folder)">
              📁 {{ folderName(folder) }}
            </button>
            <button class="recent__remove" title="从列表移除" @click="store.removeRecent(folder)">
              ×
            </button>
          </li>
        </ul>
      </template>
    </div>

    <div v-if="store.error" class="sidebar__error">{{ store.error }}</div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  user-select: none;
}
.sidebar__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 14px;
}
.sidebar__title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar__open {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}
.sidebar__open:hover {
  border-color: var(--color-accent);
}
.sidebar__tabs {
  display: flex;
  gap: 4px;
  padding: 0 10px 6px;
}
.sidebar__tab {
  flex: 1;
  padding: 4px 0;
  font-size: 12px;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}
.sidebar__tab:hover {
  background: rgba(127, 127, 127, 0.12);
}
.sidebar__tab--on {
  color: #fff;
  background: var(--color-accent);
}
.sidebar__welcome {
  padding: 14px;
}
.sidebar__hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--color-text-muted);
}
.sidebar__cta {
  width: 100%;
  padding: 7px;
  font-size: 13px;
  color: #fff;
  background: var(--color-accent);
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.sidebar__recent-label {
  margin: 18px 0 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.recent {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recent__item {
  display: flex;
  align-items: center;
}
.recent__open {
  flex: 1;
  display: block;
  padding: 5px 6px;
  text-align: left;
  font-size: 13px;
  color: var(--color-text);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent__open:hover {
  background: rgba(127, 127, 127, 0.12);
}
.recent__remove {
  padding: 2px 7px;
  font-size: 14px;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0;
}
.recent__item:hover .recent__remove {
  opacity: 1;
}
.sidebar__error {
  margin-top: auto;
  padding: 8px 14px;
  font-size: 12px;
  color: #dc2626;
}
</style>
