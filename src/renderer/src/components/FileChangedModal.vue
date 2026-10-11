<script setup lang="ts">
import { useWorkspaceStore } from '@renderer/stores/workspace'

// 当前预览文件被外部修改/删除时弹出确认对话框
// 状态来自 workspace store，全局挂载于 App.vue
const store = useWorkspaceStore()

function fileName(p: string | null): string {
  if (!p) return ''
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}
</script>

<template>
  <div
    v-if="store.currentFileDeleted || store.currentFileChanged"
    class="modal-mask"
    @mousedown.self="store.dismissExternalChange()"
  >
    <div class="modal">
      <template v-if="store.currentFileDeleted">
        <div class="modal__title">文件已删除</div>
        <p class="modal__body">
          「{{ fileName(store.currentFile) }}」已被外部程序删除。
        </p>
        <div class="modal__actions">
          <button class="btn btn--primary" @click="store.dismissExternalChange()">知道了</button>
        </div>
      </template>
      <template v-else>
        <div class="modal__title">文件已被修改</div>
        <p class="modal__body">
          「{{ fileName(store.currentFile) }}」已被其他程序修改，是否重新加载？
        </p>
        <div class="modal__actions">
          <button class="btn" @click="store.dismissExternalChange()">忽略</button>
          <button class="btn btn--primary" @click="store.reloadCurrentFile()">重新加载</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  width: 360px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.modal__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.modal__body {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text);
  word-break: break-all;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.btn {
  padding: 5px 14px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}
.btn:hover {
  border-color: var(--color-accent);
}
.btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
</style>
