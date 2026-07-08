<script setup lang="ts">
import { computed } from 'vue'
import { showHP } from '../model/Damage'
import type { Creature } from '../model/Creature'
import { useCreatureStore } from '../stores/creatureStore'
import { initiativeMemory } from '../stores/initiativeStore'
import { d10 } from '../utils'

const { creatures } = useCreatureStore()
const memory = initiativeMemory

const factionOrder: Record<string, number> = { 玩家: 0, 友方: 1, 中立: 2, 敌方: 3 }
const factionColor: Record<string, string> = {
  玩家: '#2196f3',
  友方: '#4caf50',
  中立: '#f9a825',
  敌方: '#e53935',
}

const initiativeList = computed<Creature[]>(() =>
  [...creatures.value].sort((a, b) => {
    const diff = b.initiative() + b.tempInitiative - (a.initiative() + a.tempInitiative)
    if (diff !== 0) return diff
    return (factionOrder[a.faction] ?? 9) - (factionOrder[b.faction] ?? 9)
  })
)

const current = computed(() => initiativeList.value.find((c) => c.inRound) ?? null)

function getGroup(c: Creature): Creature[] {
  if (memory.value.initMode !== 'grouped') return [c]
  const list = initiativeList.value
  const idx = list.indexOf(c)
  if (idx < 0) return [c]
  let start = idx
  while (start > 0 && list[start - 1].faction === c.faction) start--
  let end = idx
  while (end < list.length - 1 && list[end + 1].faction === c.faction) end++
  return list.slice(start, end + 1)
}

function selectCreature(code: string): void {
  const c = creatures.value.find((x) => x.code() === code)
  if (!c) return
  const group = getGroup(c)
  const active = new Set(group.map((x) => x.code()))
  for (const x of creatures.value) x.inRound = active.has(x.code())
  const idx = initiativeList.value.indexOf(c)
  if (idx >= 0) memory.value.currentInitiativeIdx = idx
}

function nextTurn(): void {
  if (initiativeList.value.length === 0) return
  const cur = current.value ?? initiativeList.value[memory.value.currentInitiativeIdx] ?? initiativeList.value[0]
  const group = getGroup(cur)
  const lastIdx = initiativeList.value.indexOf(group[group.length - 1])
  selectCreature(initiativeList.value[(lastIdx + 1) % initiativeList.value.length].code())
}

function prevTurn(): void {
  if (initiativeList.value.length === 0) return
  const cur = current.value ?? initiativeList.value[memory.value.currentInitiativeIdx] ?? initiativeList.value[0]
  const group = getGroup(cur)
  const firstIdx = initiativeList.value.indexOf(group[0])
  const prev = firstIdx <= 0 ? initiativeList.value.length - 1 : firstIdx - 1
  const prevGroup = getGroup(initiativeList.value[prev])
  selectCreature(prevGroup[0].code())
}

function newRound(): void {
  for (const c of creatures.value) c.newRound()
  if (initiativeList.value.length > 0) selectCreature(initiativeList.value[0].code())
}

function generateInitiative(): void {
  for (const c of creatures.value) c.tempInitiative = d10()
  if (initiativeList.value.length > 0) selectCreature(initiativeList.value[0].code())
}

function hpPercent(c: Creature): number {
  return Math.max(0, Math.min(100, (100 * c.currentHP) / c.maxHP()))
}
</script>

<template>
  <div class="initiative-tab">
    <header class="initiative-toolbar">
      <button @click="generateInitiative">生成先攻</button>
      <button @click="prevTurn">上一位</button>
      <button class="primary" @click="nextTurn">下一位</button>
      <button @click="newRound">新一轮</button>
      <button :class="{ active: memory.initMode === 'individual' }" @click="memory.initMode = 'individual'">分别</button>
      <button :class="{ active: memory.initMode === 'grouped' }" @click="memory.initMode = 'grouped'">同阵营合并</button>
      <span v-if="current">当前：{{ current.name() }}</span>
    </header>

    <div v-if="initiativeList.length > 0" class="initiative-track">
      <button
        v-for="c in initiativeList"
        :key="c.code()"
        class="initiative-card"
        :class="{ active: c.inRound }"
        :style="{ '--faction-color': factionColor[c.faction] ?? '#888' }"
        @click="selectCreature(c.code())"
      >
        <div class="card-head">{{ c.name() }}</div>
        <div class="card-body">
          <div class="score">{{ c.initiative() + c.tempInitiative }}</div>
          <div class="formula">{{ c.initiative() }} + {{ c.tempInitiative }}</div>
          <div class="hp-bar"><span :style="{ width: hpPercent(c) + '%' }" /></div>
          <div class="vitals">{{ showHP([c.currentHP, c.tempHP]) }}/{{ c.maxHP() }} · PP {{ c.currentPP }}</div>
        </div>
      </button>
    </div>
    <div v-else class="empty">暂无角色，请先导入角色卡。</div>

    <section class="initiative-table">
      <table>
        <thead><tr><th>顺位</th><th>角色</th><th>阵营</th><th>先攻</th><th>HP</th><th>PP</th><th>当前回合</th></tr></thead>
        <tbody>
          <tr v-for="(c, idx) in initiativeList" :key="c.code()" :class="{ active: c.inRound }" @click="selectCreature(c.code())">
            <td>{{ idx + 1 }}</td>
            <td>{{ c.name() }} <small>{{ c.code() }}</small></td>
            <td>{{ c.faction }}</td>
            <td>{{ c.initiative() + c.tempInitiative }} = {{ c.initiative() }} + <input v-model.number="c.tempInitiative" type="number" /></td>
            <td>{{ showHP([c.currentHP, c.tempHP]) }}/{{ c.maxHP() }}</td>
            <td>{{ c.currentPP }}/{{ c.maxPP() }}</td>
            <td>{{ c.inRound ? '是' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.initiative-tab { height: 100%; overflow: auto; background: #fff; padding: 10px; box-sizing: border-box; }
.initiative-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; }
button { border: 1px solid #ccc; background: #f5f5f5; padding: 5px 10px; cursor: pointer; font: inherit; }
button.active, .primary { background: #222; color: #fff; }
.initiative-track { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 10px; }
.initiative-card { flex: 0 0 110px; padding: 0; border: 2px solid var(--faction-color); border-radius: 6px; overflow: hidden; background: #fff; text-align: center; }
.initiative-card.active { border-color: #ffd700; box-shadow: 0 0 0 2px rgba(255, 215, 0, .35); transform: translateY(-1px); }
.card-head { background: var(--faction-color); color: #fff; font-weight: 700; padding: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-body { padding: 8px 6px; display: grid; gap: 4px; }
.score { font-size: 26px; font-weight: 800; line-height: 1; }
.formula, .vitals { color: #666; font-size: 11px; }
.hp-bar { height: 6px; background: #eee; border-radius: 999px; overflow: hidden; }
.hp-bar span { display: block; height: 100%; background: #4caf50; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border: 1px solid #e0e0e0; padding: 5px 7px; text-align: left; }
th { background: #f5f5f5; }
tr.active { background: #fff8d6; }
input { width: 3em; border: 1px solid #ccc; padding: 2px 4px; }
small { color: #777; }
.empty { display: grid; place-items: center; height: 60%; color: #999; }
</style>
