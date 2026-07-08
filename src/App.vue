<script setup lang="ts">
import { ref, onMounted } from 'vue'
import OBR from '@owlbear-rodeo/sdk'
import TabBattle from './components/TabBattle.vue'
import TabAoe from './components/TabAoe.vue'
import TabStatus from './components/TabStatus.vue'
import TabCharacters from './components/TabCharacters.vue'
import TabCheck from './components/TabCheck.vue'
import TabInitiative from './components/TabInitiative.vue'
import CharacterImport from './components/CharacterImport.vue'
import { useCreatureStore } from './stores/creatureStore'
import manifest from '../public/manifest.json'

const { creatures } = useCreatureStore()
const appVersion = manifest.version
const githubUrl = manifest.github_url

const activeTab = ref<string>('battle')
const isReady = ref(false)

const tabs = [
  { key: 'battle', label: '⚔ 战斗' },
  { key: 'aoe', label: '☄ AOE' },
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
      <span class="toolbar-spacer" />
      <span class="toolbar-version">v{{ appVersion }}</span>
      <a class="github-link" :href="githubUrl" target="_blank" rel="noreferrer" title="GitHub">
        <svg viewBox="0 0 16 16" aria-hidden="true" class="github-icon">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.78.4.08.55-.18.55-.4 0-.2-.01-.86-.01-1.56-2.01.38-2.53-.5-2.69-.96-.09-.24-.48-.96-.82-1.16-.28-.16-.68-.55-.01-.56.63-.01 1.08.59 1.23.84.72 1.24 1.87.89 2.33.68.07-.53.28-.89.51-1.09-1.78-.21-3.64-.91-3.64-4.04 0-.89.31-1.62.82-2.19-.08-.21-.36-1.04.08-2.16 0 0 .67-.22 2.2.84A7.43 7.43 0 0 1 8 4c.68 0 1.36.09 2 .27 1.53-1.06 2.2-.84 2.2-.84.44 1.12.16 1.95.08 2.16.51.57.82 1.3.82 2.19 0 3.14-1.87 3.83-3.65 4.04.29.26.54.76.54 1.53 0 1.1-.01 1.99-.01 2.26 0 .22.15.48.55.4A8.1 8.1 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"
          />
        </svg>
      </a>
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
      <TabAoe v-else-if="activeTab === 'aoe'" />
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

.toolbar-spacer {
  flex: 1;
}

.toolbar-version {
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
}

.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
}

.github-link:hover {
  background: rgba(255, 255, 255, 0.14);
}

.github-icon {
  width: 16px;
  height: 16px;
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
