<script setup lang="ts">
import { ref } from 'vue'
import {
  exportSaveJson,
  importSaveJson,
} from '../stores/persistenceStore'

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

function showMessage(text: string): void {
  message.value = text
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    message.value = ''
  }, 3500)
}

function downloadJson(): void {
  const blob = new Blob([exportSaveJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `owl-pm-save-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('已导出 JSON 存档')
}

function triggerImport(): void {
  fileInput.value?.click()
}

function importFile(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      importSaveJson(String(reader.result ?? ''))
      showMessage('已导入 JSON 存档')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : String(error))
    }
  }
  reader.onerror = () => showMessage('读取文件失败')
  reader.readAsText(file)
}
</script>

<template>
  <div class="save-load">
    <button class="save-btn" @click="downloadJson">导出</button>
    <button class="save-btn" @click="triggerImport">导入</button>
    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden-input" @change="importFile" />
    <span v-if="message" class="save-message">{{ message }}</span>
  </div>
</template>

<style scoped>
.save-load {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.save-btn {
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 3px 7px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-message {
  max-width: 14em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  opacity: 0.95;
}

.hidden-input {
  display: none;
}
</style>
