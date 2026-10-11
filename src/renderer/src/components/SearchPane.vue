<script setup lang="ts">
import { ref, watch } from 'vue'
import { api, type SearchResult, type SearchSnippet } from '@renderer/api'
import { useWorkspaceStore } from '@renderer/stores/workspace'

const store = useWorkspaceStore()
const query = ref('')
const results = ref<SearchResult[]>([])
const searching = ref(false)
const searched = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let seq = 0

watch(query, (q) => {
  if (timer) clearTimeout(timer)
  if (!q.trim()) {
    results.value = []
    searched.value = false
    return
  }
  timer = setTimeout(() => void run(q), 200)
})

async function run(q: string): Promise<void> {
  const mySeq = ++seq
  searching.value = true
  try {
    const res = await api.search(q)
    if (mySeq === seq) {
      results.value = res
      searched.value = true
    }
  } finally {
    if (mySeq === seq) searching.value = false
  }
}

// 把摘要按高亮区间切成 {text, hit} 片段，避免 v-html 注入
function parts(s: SearchSnippet): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const [start, end] of s.highlights) {
    if (start > cursor) out.push({ text: s.text.slice(cursor, start), hit: false })
    out.push({ text: s.text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < s.text.length) out.push({ text: s.text.slice(cursor), hit: false })
  return out
}

function relPath(p: string): string {
  const root = store.root
  if (root && p.startsWith(root)) return p.slice(root.length).replace(/^[\\/]/, '')
  return p
}

function open(r: SearchResult): void {
  store.openFileForSearch(r.path, query.value.trim())
}
</script>

<template>
  <div class="search">
    <div class="search__box">
      <input
        v-model="query"
        class="search__input"
        type="text"
        placeholder="搜索文件名或内容…"
        spellcheck="false"
      />
    </div>

    <div class="search__meta">
      <span v-if="searching">搜索中…</span>
      <span v-else-if="searched && results.length">{{ results.length }} 个文件命中</span>
      <span v-else-if="searched">无匹配结果</span>
      <span v-else class="search__hint">输入关键字开始搜索</span>
    </div>

    <div class="search__results">
      <div v-for="r in results" :key="r.path" class="result">
        <button class="result__file" :title="r.path" @click="open(r)">
          <span class="result__name">📄 {{ r.name }}</span>
          <span v-if="r.matchCount" class="result__count">{{ r.matchCount }}</span>
        </button>
        <div class="result__path">{{ relPath(r.path) }}</div>
        <button
          v-for="(s, i) in r.snippets"
          :key="i"
          class="result__snippet"
          @click="open(r)"
        >
          <span v-for="(part, j) in parts(s)" :key="j" :class="{ hit: part.hit }">{{
            part.text
          }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.search__box {
  padding: 8px 12px;
}
.search__input {
  width: 100%;
  padding: 6px 9px;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-editor-bg);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  outline: none;
}
.search__input:focus {
  border-color: var(--color-accent);
}
.search__meta {
  padding: 0 14px 6px;
  font-size: 12px;
  color: var(--color-text-muted);
}
.search__results {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.result {
  padding: 4px 0 8px;
  border-top: 1px solid var(--color-border);
}
.result__file {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
}
.result__file:hover {
  background: rgba(127, 127, 127, 0.12);
}
.result__name {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result__count {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: rgba(127, 127, 127, 0.18);
  border-radius: 8px;
  padding: 0 6px;
}
.result__path {
  padding: 0 12px 2px 30px;
  font-size: 11px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result__snippet {
  display: block;
  width: 100%;
  padding: 3px 12px 3px 30px;
  text-align: left;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.result__snippet:hover {
  background: rgba(127, 127, 127, 0.1);
  color: var(--color-text);
}
.result__snippet .hit {
  background: #ffd54a;
  color: #1f2328;
  border-radius: 2px;
}
</style>
