<script setup lang="ts">
import { computed } from 'vue'
import { showHP } from '../model/Damage'
import { canRoleSeeCreature, canRoleSeeCreatureVitals, useCreatureStore } from '../stores/creatureStore'
import { useObrSessionStore } from '../stores/obrSessionStore'

const { creatures } = useCreatureStore()
const session = useObrSessionStore()

const props = defineProps<{
  onSelect: (code: string) => void
  selectedCode?: string
}>()

const selectedSet = computed(() => new Set(props.selectedCode ? [props.selectedCode] : []))
const visibleCreatures = computed(() => creatures.value.filter((creature) => canRoleSeeCreature(session.role.value, creature)))

function isSelected(code: string): boolean {
  return selectedSet.value.has(code)
}

function hpPercent(currentHP: number, maxHP: number): number {
  return Math.max(0, Math.min(100, (100 * currentHP) / maxHP))
}
</script>

<template>
  <div class="sidebar">
    <div
      v-for="creature in visibleCreatures"
      :key="creature.code()"
      class="sidebar-row"
      :class="{ selected: isSelected(creature.code()) }"
      @click="props.onSelect(creature.code())"
    >
      <div
        class="sidebar-hp-fill"
        :style="{ width: canRoleSeeCreatureVitals(session.role.value, creature) ? hpPercent(creature.currentHP, creature.maxHP()) + '%' : '0%' }"
      />
      <div class="sidebar-row-inner">
        <span class="sidebar-name">{{ creature.name() }}</span>
        <span v-if="canRoleSeeCreatureVitals(session.role.value, creature)" class="sidebar-vitals">
          <span
            :style="{
              color: `hsl(${Math.max(0, Math.min(120, (120 * creature.currentHP) / creature.maxHP()))}, ${creature.currentHP > 0 ? '70%' : '100%'}, ${creature.currentHP > 0 ? '40%' : '50%'})`,
            }"
          >
            {{ showHP([creature.currentHP, creature.tempHP]) }}/{{ creature.maxHP() }}
          </span>
          <span class="sidebar-pp">{{ creature.currentPP }}</span>
        </span>
        <span v-else class="sidebar-vitals hidden-vitals">HP ?</span>
      </div>
    </div>
    <div v-if="visibleCreatures.length === 0" style="padding: 1em; color: #999; text-align: center">
      暂无角色
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 14em;
  flex-shrink: 0;
  overflow-y: auto;
  min-height: 0;
  border-right: 1px solid #e0e0e0;
  font-size: 13px;
  background: #fafafa;
}

.sidebar-row {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.sidebar-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.sidebar-row.selected {
  background: #222;
  color: #fff;
}

.sidebar-hp-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: #9e9e9e;
  opacity: 0.35;
}

.sidebar-row-inner {
  position: relative;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.sidebar-vitals {
  flex-shrink: 0;
  font-size: 11px;
  white-space: nowrap;
}

.sidebar-pp {
  margin-left: 0.3em;
  color: steelblue;
}

.hidden-vitals {
  color: #777;
}
</style>
