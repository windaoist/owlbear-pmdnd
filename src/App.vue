<script setup lang="ts">
import { ref, onMounted } from 'vue'
import OBR from '@owlbear-rodeo/sdk'
import TabBattle from './components/TabBattle.vue'
import TabStatus from './components/TabStatus.vue'
import TabCharacters from './components/TabCharacters.vue'
import TabCheck from './components/TabCheck.vue'
import TabInitiative from './components/TabInitiative.vue'
import CharacterImport from './components/CharacterImport.vue'
import { useCreatureStore } from './stores/creatureStore'

const { creatures } = useCreatureStore()

const activeTab = ref<string>('battle')
const isReady = ref(false)

const tabs = [
  { key: 'battle', label: '⚔ 战斗' },
  { key: 'status', label: '📋 状态' },
  { key: 'characters', label: '👥 角色' },
  { key: 'check', label: '🎲 检定' },
  { key: 'initiative', label: '⏱ 先攻' },
]

onMounted(async () => {
  if (OBR.isAvailable) {
    OBR.onReady(() => {
      isReady.value = true
    })
    return
  }
  isReady.value = true
})
</script>

<template>
  <div class="app-root">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <span class="toolbar-title">PMDnD 计算器</span>
      <span class="toolbar-count">角色：{{ creatures.length }} 人</span>
      <CharacterImport />
    </header>

    <!-- Tab 导航栏 -->
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Tab 内容区 -->
    <div class="tab-content">
      <TabBattle v-if="activeTab === 'battle'" />
      <TabStatus v-else-if="activeTab === 'status'" />
      <TabCharacters v-else-if="activeTab === 'characters'" />
      <TabCheck v-else-if="activeTab === 'check'" />
      <TabInitiative v-else-if="activeTab === 'initiative'" />
    </div>
  </div>
</template>

<style>
/* ── 全局 reset ── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
}

.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

/* ── 顶部工具栏 ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: #4a6fa5;
  color: #fff;
  flex-shrink: 0;
}

.toolbar-title {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}

.toolbar-count {
  font-size: 12px;
  opacity: 0.85;
  white-space: nowrap;
}

/* ── Tab 导航 ── */
.tab-bar {
  display: flex;
  flex-shrink: 0;
  background: #e0e0e0;
  border-bottom: 1px solid #ccc;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  transition: background 0.15s, color 0.15s;
}

.tab-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tab-btn.active {
  background: #fff;
  color: #222;
  border-bottom: 2px solid #4a6fa5;
}

/* ── Tab 内容 ── */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 16px;
}
</style>
