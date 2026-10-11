<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { usePrompt } from '@renderer/composables/prompt'

const { state, confirm, cancel } = usePrompt()
const input = ref<HTMLInputElement | null>(null)

watch(
  () => state.open,
  async (open) => {
    if (open) {
      await nextTick()
      input.value?.focus()
      input.value?.select()
    }
  }
)

function onSubmit(): void {
  const v = state.value.trim()
  if (v) confirm(v)
}
</script>

<template>
  <div v-if="state.open" class="prompt-mask" @mousedown.self="cancel">
    <div class="prompt">
      <div class="prompt__title">{{ state.title }}</div>
      <input
        ref="input"
        v-model="state.value"
        class="prompt__input"
        :placeholder="state.placeholder"
        @keydown.enter="onSubmit"
        @keydown.esc="cancel"
      />
      <div class="prompt__actions">
        <button class="btn" @click="cancel">取消</button>
        <button class="btn btn--primary" @click="onSubmit">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.prompt {
  width: 360px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.prompt__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.prompt__input {
  width: 100%;
  padding: 7px 9px;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-editor-bg);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  outline: none;
}
.prompt__input:focus {
  border-color: var(--color-accent);
}
.prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
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
