<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import * as xlsx from 'xlsx'
import { readCardFromXlsx } from '../model/CardReader'
import { useCreatureStore } from '../stores/creatureStore'

const { addCreature } = useCreatureStore()
const props = withDefaults(defineProps<{
  variant?: 'toolbar' | 'panel'
  label?: string
}>(), {
  variant: 'toolbar',
  label: '导入角色卡 (.xlsx)',
})

const importing = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
let messageTimer: number | null = null

function clearMessageLater(): void {
  if (messageTimer != null) window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    successMsg.value = ''
    errorMsg.value = ''
    messageTimer = null
  }, 4000)
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errorMsg.value = ''
  successMsg.value = ''
  importing.value = true

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const creature = readCardFromXlsx(workbook)
      addCreature(creature)
      successMsg.value = `✅ 成功导入「${creature.name()}」（${creature.code()}，${creature.isEnemyCard() ? '敌怪卡' : 'PC卡'}）`
      clearMessageLater()
    } catch (err) {
      errorMsg.value = `❌ 导入失败：${String(err)}`
      clearMessageLater()
    } finally {
      importing.value = false
      // 重置 input，允许重复导入同一文件
      if (fileInput.value) fileInput.value.value = ''
    }
  }

  reader.onerror = () => {
    errorMsg.value = '❌ 文件读取失败'
    clearMessageLater()
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }

  reader.readAsArrayBuffer(file)
}

function triggerFileInput(): void {
  fileInput.value?.click()
}

onBeforeUnmount(() => {
  if (messageTimer != null) window.clearTimeout(messageTimer)
})
</script>

<template>
  <div class="import-area">
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx"
      style="display: none"
      @change="handleFileChange"
    />

    <button class="import-btn" :class="props.variant" :disabled="importing" @click="triggerFileInput">
      {{ importing ? '导入中...' : props.label }}
    </button>

    <div v-if="successMsg" class="msg success">{{ successMsg }}</div>
    <div v-if="errorMsg" class="msg error">{{ errorMsg }}</div>
  </div>
</template>

<style scoped>
.import-area {
  position: relative;
}

.import-btn {
  padding: 3px 10px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  transition: background 0.15s;
}

.import-btn.panel {
  border-color: #bbb;
  background: #fff;
  color: #222;
  padding: 8px 12px;
  font-size: 14px;
}

.import-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.28);
}

.import-btn.panel:hover:not(:disabled) {
  background: #f0f4ff;
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.msg {
  position: absolute;
  top: 110%;
  right: 0;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 3px;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.panel ~ .msg {
  left: 0;
  right: auto;
  white-space: normal;
  min-width: min(260px, 80vw);
}

.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.error {
  background: #ffebee;
  color: #c62828;
}
</style>
