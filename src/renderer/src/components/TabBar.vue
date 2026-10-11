<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWorkspaceStore } from '@renderer/stores/workspace'
import { useContextMenu, type MenuItem } from '@renderer/composables/contextMenu'

const store = useWorkspaceStore()
const { show } = useContextMenu()

const strip = ref<HTMLElement | null>(null)
const hidden = ref<string[]>([])
const overflowOpen = ref(false)
const dragIndex = ref<number | null>(null)

function fileName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

// 中键关闭标签
function onAuxClick(p: string, e: MouseEvent): void {
  if (e.button === 1) {
    e.preventDefault()
    store.closeTab(p)
  }
}

function onContext(p: string, e: MouseEvent): void {
  const items: MenuItem[] = [
    { label: '关闭此标签', action: () => store.closeTab(p) },
    { label: '关闭左侧标签', action: () => store.closeLeftTabs(p) },
    { label: '关闭右侧标签', action: () => store.closeRightTabs(p) },
    { label: '', action: () => {}, separator: true },
    { label: '关闭全部标签', danger: true, action: () => store.closeAllTabs() }
  ]
  show(e, items)
}

// —— 拖拽排序 ——
function onDragStart(i: number, e: DragEvent): void {
  dragIndex.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i)) // 某些平台需有数据才触发 drop
  }
}

function onDragOver(e: DragEvent): void {
  if (dragIndex.value === null) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(i: number): void {
  if (dragIndex.value !== null) store.reorderTabs(dragIndex.value, i)
  dragIndex.value = null
}

// —— 溢出检测：找出未完整显示在可视区内的标签 ——
function recompute(): void {
  const el = strip.value
  if (!el) {
    hidden.value = []
    return
  }
  const left = el.scrollLeft
  const right = left + el.clientWidth
  const h: string[] = []
  el.querySelectorAll<HTMLElement>('[data-tab]').forEach((tab) => {
    const tabLeft = tab.offsetLeft
    const tabRight = tabLeft + tab.offsetWidth
    if (tabLeft < left - 1 || tabRight > right + 1) h.push(tab.dataset.tab ?? '')
  })
  hidden.value = h.filter(Boolean)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  recompute()
  ro = new ResizeObserver(() => recompute())
  if (strip.value) ro.observe(strip.value)
})
onUnmounted(() => ro?.disconnect())

watch(
  () => store.openTabs.slice(),
  () => void nextTick(recompute),
  { deep: true }
)

// 切换激活标签时滚动到可见并重算溢出
watch(
  () => store.currentFile,
  async () => {
    await nextTick()
    strip.value?.querySelectorAll<HTMLElement>('[data-tab]').forEach((tab) => {
      if (tab.dataset.tab === store.currentFile) {
        tab.scrollIntoView({ inline: 'nearest', block: 'nearest' })
      }
    })
    recompute()
  }
)

function pickHidden(p: string): void {
  overflowOpen.value = false
  store.activateTab(p)
}
</script>

<template>
  <div class="tabbar">
    <div ref="strip" class="tabbar__strip" @scroll="recompute">
      <div
        v-for="(p, i) in store.openTabs"
        :key="p"
        :data-tab="p"
        class="tab"
        :class="{ 'tab--active': store.currentFile === p }"
        :title="p"
        draggable="true"
        @click="store.activateTab(p)"
        @auxclick="onAuxClick(p, $event)"
        @contextmenu="onContext(p, $event)"
        @dragstart="onDragStart(i, $event)"
        @dragover="onDragOver($event)"
        @drop="onDrop(i)"
        @dragend="dragIndex = null"
      >
        <span class="tab__name">{{ fileName(p) }}</span>
        <button class="tab__close" title="关闭标签" @click.stop="store.closeTab(p)">×</button>
      </div>
    </div>

    <div v-if="hidden.length" class="tabbar__overflow">
      <button class="tabbar__more" title="显示隐藏的标签" @click="overflowOpen = !overflowOpen">
        ▾
      </button>
      <template v-if="overflowOpen">
        <div class="tabbar__mask" @click="overflowOpen = false" />
        <ul class="tabbar__menu">
          <li v-for="p in hidden" :key="p">
            <button
              class="tabbar__menu-item"
              :class="{ 'tabbar__menu-item--active': store.currentFile === p }"
              :title="p"
              @click="pickHidden(p)"
            >
              {{ fileName(p) }}
            </button>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-sidebar-bg);
}
.tabbar__strip {
  position: relative;
  flex: 1;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabbar__strip::-webkit-scrollbar {
  display: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  max-width: 200px;
  padding: 0 8px 0 12px;
  height: 34px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: transparent;
  border-right: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}
.tab:hover {
  background: rgba(127, 127, 127, 0.1);
}
.tab--active {
  color: var(--color-text);
  background: var(--color-editor-bg);
  box-shadow: inset 0 2px 0 var(--color-accent);
}
.tab__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab__close {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  line-height: 16px;
  font-size: 15px;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.tab__close:hover {
  color: #fff;
  background: #dc2626;
}
.tabbar__overflow {
  position: relative;
  flex: 0 0 auto;
  display: flex;
}
.tabbar__more {
  width: 30px;
  font-size: 13px;
  color: var(--color-text);
  background: transparent;
  border: none;
  border-left: 1px solid var(--color-border);
  cursor: pointer;
}
.tabbar__more:hover {
  background: rgba(127, 127, 127, 0.12);
}
.tabbar__mask {
  position: fixed;
  inset: 0;
  z-index: 800;
}
.tabbar__menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 801;
  min-width: 160px;
  max-width: 280px;
  max-height: 60vh;
  overflow: auto;
  margin: 2px 0 0;
  padding: 4px;
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
}
.tabbar__menu-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
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
.tabbar__menu-item:hover {
  background: var(--color-accent);
  color: #fff;
}
.tabbar__menu-item--active {
  font-weight: 600;
}
</style>
