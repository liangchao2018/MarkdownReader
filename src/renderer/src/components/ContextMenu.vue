<script setup lang="ts">
import { computed } from 'vue'
import { useContextMenu, type MenuItem } from '@renderer/composables/contextMenu'

const { state, hide } = useContextMenu()

// 防止菜单超出窗口右/下边界
const style = computed(() => ({
  left: `${Math.min(state.x, window.innerWidth - 200)}px`,
  top: `${Math.min(state.y, window.innerHeight - state.items.length * 30 - 8)}px`
}))

function onClick(item: MenuItem): void {
  hide()
  item.action()
}
</script>

<template>
  <div v-if="state.open" class="cm-mask" @mousedown="hide" @contextmenu.prevent="hide">
    <ul class="cm" :style="style" @mousedown.stop>
      <li v-for="(item, i) in state.items" :key="i">
        <hr v-if="item.separator" class="cm__sep" />
        <button v-else class="cm__item" :class="{ 'cm__item--danger': item.danger }" @click="onClick(item)">
          {{ item.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.cm-mask {
  position: fixed;
  inset: 0;
  z-index: 900;
}
.cm {
  position: fixed;
  min-width: 160px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
}
.cm__item {
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
}
.cm__item:hover {
  background: var(--color-accent);
  color: #fff;
}
.cm__item--danger {
  color: #dc2626;
}
.cm__item--danger:hover {
  background: #dc2626;
  color: #fff;
}
.cm__sep {
  margin: 4px 6px;
  border: none;
  border-top: 1px solid var(--color-border);
}
</style>
