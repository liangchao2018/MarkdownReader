<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ html: string }>()
const emit = defineEmits<{ (e: 'open-link', path: string): void }>()

export interface HighlightState {
  index: number
  count: number
}

const container = ref<HTMLElement | null>(null)
let activeHitIndex = -1

function scrollToSlug(slug: string): void {
  const el = container.value?.querySelector(`#${CSS.escape(slug)}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollTop(): void {
  container.value?.scrollTo({ top: 0 })
}

function clearHighlights(): void {
  const root = container.value
  if (!root) return
  root.querySelectorAll('mark.search-hit').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent ?? ''))
  })
  root.normalize()
  activeHitIndex = -1
}

function getHits(): HTMLElement[] {
  return Array.from(container.value?.querySelectorAll<HTMLElement>('mark.search-hit') ?? [])
}

function setActiveHit(index: number): HighlightState {
  const hits = getHits()
  const count = hits.length
  if (!count) {
    activeHitIndex = -1
    return { index: -1, count: 0 }
  }

  activeHitIndex = ((index % count) + count) % count
  hits.forEach((hit, i) => hit.classList.toggle('search-hit--active', i === activeHitIndex))
  hits[activeHitIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
  return { index: activeHitIndex, count }
}

function highlightTerm(term: string): HighlightState {
  clearHighlights()
  const root = container.value
  if (!root || !term) return { index: -1, count: 0 }

  const query = term.toLowerCase()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    if ((node.nodeValue ?? '').toLowerCase().includes(query)) textNodes.push(node as Text)
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? ''
    const lower = text.toLowerCase()
    const fragment = document.createDocumentFragment()
    let cursor = 0
    let position = lower.indexOf(query)

    while (position !== -1) {
      if (position > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, position)))

      const mark = document.createElement('mark')
      mark.className = 'search-hit'
      mark.textContent = text.slice(position, position + query.length)
      fragment.appendChild(mark)

      cursor = position + query.length
      position = lower.indexOf(query, cursor)
    }

    if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)))
    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return setActiveHit(0)
}

function nextHighlight(): HighlightState {
  return setActiveHit(activeHitIndex + 1)
}

function previousHighlight(): HighlightState {
  return setActiveHit(activeHitIndex - 1)
}

function onClick(e: MouseEvent): void {
  const a = (e.target as HTMLElement).closest('a')
  if (!a) return

  const link = a.getAttribute('data-link')
  const anchor = a.getAttribute('data-anchor')
  if (link) {
    e.preventDefault()
    emit('open-link', link)
  } else if (anchor !== null) {
    e.preventDefault()
    scrollToSlug(anchor)
  }
}

defineExpose({ scrollToSlug, scrollTop, highlightTerm, clearHighlights, nextHighlight, previousHighlight })
</script>

<template>
  <div ref="container" class="markdown-body" @click="onClick" v-html="html" />
</template>

<style scoped>
.markdown-body {
  flex: 1;
  overflow: auto;
  padding: 24px 36px 64px;
}

:deep(mark.search-hit) {
  padding: 0 1px;
  color: inherit;
  background: #fff7b8;
  box-shadow: inset 0 0 0 1px rgba(180, 120, 0, 0.35);
  border-radius: 2px;
}

:deep(mark.search-hit--active) {
  color: #ffffff;
  background: var(--color-accent);
  outline: 1px solid color-mix(in srgb, var(--color-accent) 70%, #000);
}
</style>
