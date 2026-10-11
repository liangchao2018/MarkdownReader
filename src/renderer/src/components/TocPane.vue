<script setup lang="ts">
import type { TocItem } from '@renderer/composables/markdown'

const props = defineProps<{ items: TocItem[] }>()
const emit = defineEmits<{ (e: 'select', slug: string): void }>()

// 以最小标题级别为基准缩进
function indent(level: number): string {
  const min = Math.min(...props.items.map((i) => i.level))
  return `${(level - min) * 12 + 10}px`
}
</script>

<template>
  <nav v-if="items.length" class="toc">
    <ul class="toc__list">
      <li v-for="(item, i) in items" :key="i">
        <button
          class="toc__item"
          :style="{ paddingLeft: indent(item.level) }"
          :title="item.text"
          @click="emit('select', item.slug)"
        >
          {{ item.text }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.toc {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 0;
  background: var(--color-sidebar-bg);
}
.toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.toc__item {
  display: block;
  width: 100%;
  padding: 4px 14px;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc__item:hover {
  color: var(--color-accent);
  background: rgba(127, 127, 127, 0.1);
}
</style>
