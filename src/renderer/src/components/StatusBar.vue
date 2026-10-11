<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@renderer/api'
import { useSettingsStore } from '@renderer/stores/settings'

const settings = useSettingsStore()
const version = ref<string>('…')

onMounted(async () => {
  try {
    version.value = await api.getVersion()
  } catch (e) {
    version.value = 'IPC 错误'
    console.error('app:getVersion 调用失败', e)
  }
})
</script>

<template>
  <footer class="statusbar">
    <span class="statusbar__item">就绪</span>
    <span class="statusbar__spacer" />
    <button class="statusbar__btn" title="切换主题" @click="settings.cycleTheme()">
      主题：{{ settings.themeLabel() }}
    </button>
    <span class="statusbar__item">v{{ version }}</span>
  </footer>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 24px;
  padding: 0 12px;
  font-size: 12px;
  color: #fff;
  background: var(--color-accent);
}
.statusbar__spacer {
  flex: 1;
}
.statusbar__item {
  opacity: 0.95;
}
.statusbar__btn {
  font-size: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 3px;
  padding: 1px 8px;
  cursor: pointer;
}
.statusbar__btn:hover {
  background: rgba(255, 255, 255, 0.28);
}
</style>
