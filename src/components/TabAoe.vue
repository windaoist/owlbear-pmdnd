<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { damageCalcRaw, handleHP, showHP } from '../model/Damage'
import type { Creature } from '../model/Creature'
import {
  battleMemory,
  battleMemoryHeal,
  battleMemoryStatus,
  moveMemory,
  currentMove,
  currentPower,
  setCurrentMove,
  battleLv,
  spellTypeStab,
  spellModifier,
  spellAttack,
  spellTypeStabHeal,
  spellModifierHeal,
  spellAttackHeal,
  spellAttackHealShield,
  dicePct,
  envTypeMdfTotal,
  moveUseCharge,
} from '../stores/battleStore'
import { useCreatureStore } from '../stores/creatureStore'
import { d20, toMod, valueToColor } from '../utils'

interface TargetEntry {
  code: string
  damageMdfD: number
  diceroll: number
  dicerollD: number
  advantageDelta: number
  rollHistory: number[]
}

interface AttackResult {
  entry: TargetEntry
  creature: Creature
  roll: number
  rollPct: number
  bonus: number
  damage: number
  mdf: number
  defValue: number
}

interface HealResult {
  entry: TargetEntry
  creature: Creature
  roll: number
  rollPct: number
  bonus: number
  heal: number
  shield: number
  mdf: number
}

interface StatusResult {
  entry: TargetEntry
  creature: Creature
  roll: number
  rollPct: number
  bonus: number
  damage: number
  heal: number
  shield: number
  mdf: number
}

const { creatures, findByCode } = useCreatureStore()

const memory = battleMemory
const memoryHeal = battleMemoryHeal
const memoryStatus = battleMemoryStatus

const targets = ref<TargetEntry[]>([])
const healMode = ref<'heal' | 'shield'>('heal')
const statusMode = ref<'damage' | 'heal' | 'shield'>('damage')
const batchAdvantageDelta = ref(0)
const batchDicerollD = ref(0)

const attackerMoves = computed(() => memory.value.attacker?.getMoveList() ?? [])
const hasMultiplePowers = computed(() => currentMove().powerList.length > 1)
const selectedTargets = computed(() =>
  targets.value
    .map((target) => findByCode(target.code))
    .filter((creature): creature is Creature => creature != null),
)

const currentSpellName = computed(() => {
  if (memory.value.attackType == 2) return memoryHeal.value.spellName
  if (memory.value.attackType == 3) return memoryStatus.value.spellName
  if (memory.value.attackType == 0) return currentMove().name || '招式'
  return memory.value.spellName
})

const currentPPCost = computed(() => {
  if (memory.value.attackType == 2) return memoryHeal.value.costPP
  if (memory.value.attackType == 3) return memoryStatus.value.costPP
  if (memory.value.attackType == 0) return moveMemory.value.nullCostPP
  return memory.value.costPP
})

const attackResults = computed(() => targets.value.map(computeAttackResult).filter(notNull))
const healResults = computed(() => targets.value.map(computeHealResult).filter(notNull))
const statusResults = computed(() => targets.value.map(computeStatusResult).filter(notNull))

const activeResults = computed(() => {
  if (memory.value.attackType == 2) return healResults.value
  if (memory.value.attackType == 3) return statusResults.value
  if (memory.value.attackType == 1) return attackResults.value
  return []
})

function notNull<T>(value: T | null): value is T {
  return value != null
}

function baseMemory() {
  if (memory.value.attackType == 2) return memoryHeal.value
  if (memory.value.attackType == 3) return memoryStatus.value
  return memory.value
}

function targetCreature(entry: TargetEntry): Creature | null {
  return findByCode(entry.code)
}

function chooseCaster(code: string): void {
  memory.value.attacker = findByCode(code)
  memory.value.attacker?.shallowRefresh()
  if (memory.value.attacker) {
    memoryHeal.value.battleLvD = 100 - memory.value.attacker.battleLv()
  }
  targets.value = targets.value.filter((target) => target.code !== code)
  ensureDefender()
}

function ensureDefender(): void {
  const first = selectedTargets.value[0] ?? creatures.value.find((creature) => creature !== memory.value.attacker)
  memory.value.defender = first ?? null
}

function defaultTargetEntry(code: string): TargetEntry {
  const creature = findByCode(code)
  const mem = baseMemory()
  const autoCrit = memory.value.attackType == 1 && creature?.grandStatus().autoCrit
  return {
    code,
    damageMdfD: 0,
    diceroll: autoCrit ? 20 : mem.diceroll,
    dicerollD: mem.dicerollD,
    advantageDelta: mem.advantageDelta,
    rollHistory: [autoCrit ? 20 : mem.diceroll],
  }
}

function ensureTargets(): void {
  targets.value = targets.value
    .filter((target) => findByCode(target.code) && target.code !== memory.value.attacker?.code())
    .map((target) => ({ ...defaultTargetEntry(target.code), ...target }))
  ensureDefender()
}

function toggleTarget(code: string): void {
  const index = targets.value.findIndex((target) => target.code === code)
  if (index >= 0) {
    targets.value.splice(index, 1)
  } else {
    targets.value.push(defaultTargetEntry(code))
  }
  ensureTargets()
}

function selectMove(name: string): void {
  moveMemory.value.selectedMove = name
  moveMemory.value.selectedPowerIdx = currentMove().powerList.length > 1 ? 1 : 0
  ensureDefender()
  setCurrentMove()
  ensureTargets()
}

function scrollPowerIdx(delta: number): void {
  const len = currentMove().powerList.length
  if (len <= 0) return
  moveMemory.value.selectedPowerIdx = Math.min(Math.max(0, moveMemory.value.selectedPowerIdx + delta), len - 1)
  ensureDefender()
  setCurrentMove()
  ensureTargets()
}

function setAttackType(type: number): void {
  memory.value.attackType = type
  ensureTargets()
}

function rollEntry(entry: TargetEntry): void {
  const n = 1 + Math.abs(entry.advantageDelta)
  const rolls = Array.from({ length: n }, () => d20())
  entry.rollHistory = rolls
  entry.diceroll =
    entry.advantageDelta > 0
      ? Math.max(...rolls)
      : entry.advantageDelta < 0
        ? Math.min(...rolls)
        : rolls[0]
}

function modifyWorldline(entry: TargetEntry, value: number): void {
  const n = entry.rollHistory.length
  if (n <= 1) {
    entry.diceroll = value
    entry.rollHistory = [value]
    return
  }
  const rolls = Array.from({ length: n }, () => d20())
  rolls[Math.floor(Math.random() * n)] = value
  entry.rollHistory = rolls
  entry.diceroll = entry.advantageDelta > 0 ? Math.max(...rolls) : Math.min(...rolls)
}

function rollAll(): void {
  for (const target of targets.value) rollEntry(target)
}

function applyBatchModifiers(): void {
  for (const target of targets.value) {
    target.advantageDelta = batchAdvantageDelta.value
    target.dicerollD = batchDicerollD.value
  }
}

function attackBonus(defender: Creature, rawD20: number): number {
  const accuracy = memory.value.attacker
    ? memory.value.attacker.accuracy() - defender.evasion()
    : 0
  const accuracyPart =
    memory.value.enableAccuracyAdvance && rawD20 < memory.value.ctLimit
      ? accuracy
      : Math.max(0, accuracy)
  const statusPart =
    (memory.value.attacker?.getAttackAdvantageWithStatus(memory.value.spellMod) ?? 0) +
    defender.getUnderAttackAdvantageWithStatus()
  return accuracyPart + spellModifier() + statusPart
}

function computeAttackResult(entry: TargetEntry): AttackResult | null {
  const defender = targetCreature(entry)
  if (!memory.value.attacker || !defender) return null
  const defValue = Math.max(
    1,
    Math.floor(defender.getAttributeByName(memory.value.damageDefense) + memory.value.damageDefenseD),
  )
  const mdf =
    defender.typeMdf(memory.value.damageType) +
    defender.typeMdf(memory.value.damageAspect) +
    defender.grandStatus().grandMdf +
    envTypeMdfTotal([memory.value.damageType, memory.value.damageAspect], memory.value.attacker) +
    memory.value.damageMdfD +
    entry.damageMdfD
  const bonus = attackBonus(defender, entry.diceroll)
  const { roll, rollPct } = dicePct(
    entry.diceroll,
    entry.dicerollD,
    bonus,
    memory.value.enableCT,
    memory.value.ctLimit,
    memory.value.enableMiss,
  )
  return {
    entry,
    creature: defender,
    roll,
    rollPct,
    bonus,
    defValue,
    mdf,
    damage: damageCalcRaw(memory.value.effect, battleLv(), spellAttack(), defValue, spellTypeStab(), mdf, rollPct),
  }
}

function computeHealResult(entry: TargetEntry): HealResult | null {
  const creature = targetCreature(entry)
  if (!memory.value.attacker || !creature) return null
  const mdf =
    memoryHeal.value.damageMdfD +
    entry.damageMdfD +
    envTypeMdfTotal([memoryHeal.value.damageType, memoryHeal.value.damageAspect], memory.value.attacker)
  const bonus = spellModifierHeal()
  const { roll, rollPct } = dicePct(
    entry.diceroll,
    entry.dicerollD,
    bonus,
    memoryHeal.value.enableCT,
    memoryHeal.value.ctLimit,
    memoryHeal.value.enableMiss,
  )
  const cr = Math.max(1, Math.floor(memory.value.attacker.battleLv() + memoryHeal.value.battleLvD))
  return {
    entry,
    creature,
    roll,
    rollPct,
    bonus,
    mdf,
    heal: damageCalcRaw(memoryHeal.value.effect, cr, spellAttackHeal(), 200, spellTypeStabHeal(), mdf, rollPct),
    shield: damageCalcRaw(memoryHeal.value.effect, cr, spellAttackHealShield(), 200, spellTypeStabHeal(), mdf, rollPct),
  }
}

function computeStatusResult(entry: TargetEntry): StatusResult | null {
  const creature = targetCreature(entry)
  if (!creature) return null
  const bonus = 0
  const { roll, rollPct } = dicePct(
    entry.diceroll,
    entry.dicerollD,
    bonus,
    memoryStatus.value.enableCT,
    memoryStatus.value.ctLimit,
    memoryStatus.value.enableMiss,
  )
  const mdf =
    creature.typeMdf(memoryStatus.value.damageType) +
    creature.typeMdf(memoryStatus.value.damageAspect) +
    creature.grandStatus().grandMdf +
    envTypeMdfTotal([memoryStatus.value.damageType, memoryStatus.value.damageAspect], memory.value.attacker) +
    memoryStatus.value.damageMdfD +
    entry.damageMdfD

  if (memoryStatus.value.customDamage > 0) {
    const customValue = damageCalcRaw(memoryStatus.value.customDamage, 100, 1, 1, 0, mdf, 100)
    return { entry, creature, roll, rollPct, bonus, mdf, damage: customValue, heal: customValue, shield: customValue }
  }

  const cr = Math.max(1, Math.floor(creature.battleLv() + memoryStatus.value.battleLvD))
  const defValue = Math.max(
    1,
    Math.floor(creature.getAttackAttributeByName(memoryStatus.value.damageDefense) + memoryStatus.value.damageDefenseD),
  )
  const healMdf = memoryStatus.value.damageMdfD + entry.damageMdfD
  return {
    entry,
    creature,
    roll,
    rollPct,
    bonus,
    mdf,
    damage: damageCalcRaw(memoryStatus.value.effect, cr, cr * 2, defValue, 0, mdf, rollPct),
    heal: damageCalcRaw(memoryStatus.value.effect, cr, 1, 1, 0, healMdf, rollPct),
    shield: damageCalcRaw(memoryStatus.value.effect, cr, 1, 1, 0, healMdf, rollPct),
  }
}

function resultValue(result: AttackResult | HealResult | StatusResult): number {
  if ('damage' in result && memory.value.attackType == 1) return result.damage
  if ('heal' in result && memory.value.attackType == 2) {
    return healMode.value == 'heal' ? result.heal : result.shield
  }
  if ('damage' in result && 'heal' in result && memory.value.attackType == 3) {
    if (statusMode.value == 'heal') return result.heal
    if (statusMode.value == 'shield') return result.shield
    return result.damage
  }
  return 0
}

function diceLines(entry: TargetEntry, bonus: number, flags = baseMemory()): string {
  const casterName = memory.value.attacker?.name() ?? '效果'
  return entry.rollHistory
    .map((raw) => {
      const { roll, rollPct } = dicePct(raw, entry.dicerollD, bonus, flags.enableCT, flags.ctLimit, flags.enableMiss)
      return `【骰子】(${casterName}：${currentSpellName.value})[${rollPct}%]D20${toMod(roll - raw)}=${roll}`
    })
    .join('\n')
}

function previewLine(result: AttackResult | HealResult | StatusResult): string {
  const hp = [result.creature.currentHP, result.creature.tempHP]
  const value = resultValue(result)
  if (memory.value.attackType == 2) {
    if (healMode.value == 'shield') {
      return `${result.creature.name()}获得了 ${value} 护盾（HP ${showHP(hp)} -> ${showHP(handleHP(hp, result.creature.maxHP(), [0, value]))}）。`
    }
    return `${result.creature.name()}回复了 ${value} HP（HP ${showHP(hp)} -> ${showHP(handleHP(hp, result.creature.maxHP(), [value, 0]))}）。`
  }
  if (memory.value.attackType == 3 && statusMode.value != 'damage') {
    if (statusMode.value == 'shield') {
      return `${result.creature.name()}获得了 ${value} 护盾（HP ${showHP(hp)} -> ${showHP(handleHP(hp, result.creature.maxHP(), [0, value]))}）。`
    }
    return `${result.creature.name()}回复了 ${value} HP（HP ${showHP(hp)} -> ${showHP(handleHP(hp, result.creature.maxHP(), [value, 0]))}）。`
  }
  const status = memory.value.attackType == 3 ? memoryStatus.value : memory.value
  return `${result.creature.name()}受到了 ${value} ${status.damageType}${status.damageDef}${status.damageAspect == '无性相' ? '' : status.damageAspect}伤害（HP ${showHP(hp)} -> ${showHP(handleHP(hp, result.creature.maxHP(), [-value, 0]))}）。`
}

const logText = computed(() => {
  if (!memory.value.attacker) return ''
  const names = selectedTargets.value.map((creature) => creature.name()).join('、') || '多个目标'
  const ppLog =
    currentPPCost.value != 0
      ? `（PP ${memory.value.attacker.currentPP} -> ${memory.value.attacker.previewPP(-currentPPCost.value)}）`
      : ''
  const lines = [`${memory.value.attacker.name()}对${names}使用了${currentSpellName.value}${ppLog}。`]
  for (const result of activeResults.value) {
    lines.push(diceLines(result.entry, result.bonus), previewLine(result))
  }
  return lines.join('\n')
})

function applyCost(): void {
  if (!memory.value.attacker) return
  if (currentPPCost.value > 0) memory.value.attacker.takePP(-currentPPCost.value)
  if (memory.value.attackType == 1) memory.value.costPP = 0
  else if (memory.value.attackType == 2) memoryHeal.value.costPP = 0
  else if (memory.value.attackType == 3) memoryStatus.value.costPP = 0
  else moveMemory.value.nullCostPP = 0
  moveUseCharge()
}

function applyAll(): void {
  for (const result of activeResults.value) {
    const value = resultValue(result)
    if (memory.value.attackType == 2) {
      result.creature.takeHP(healMode.value == 'heal' ? [value, 0] : [0, value])
    } else if (memory.value.attackType == 3 && statusMode.value != 'damage') {
      result.creature.takeHP(statusMode.value == 'heal' ? [value, 0] : [0, value])
    } else {
      result.creature.takeHP([-value, 0])
    }
  }
  navigator.clipboard.writeText(logText.value)
  applyCost()
}

function copyLog(): void {
  navigator.clipboard.writeText(logText.value)
}

watch(
  () => [creatures.value.length, memory.value.attacker?.code(), memory.value.attackType],
  () => ensureTargets(),
)
</script>

<template>
  <div class="tab-aoe">
    <div class="sticky-bar">
      <div class="field">
        <label>攻击方</label>
        <select
          class="sel"
          :value="memory.attacker?.code() ?? ''"
          @change="chooseCaster(($event.target as HTMLSelectElement).value)"
        >
          <option value="">未选择</option>
          <option v-for="creature in creatures" :key="creature.code()" :value="creature.code()">
            {{ creature.name() }} {{ creature.code() }}
          </option>
        </select>

        <template v-if="memory.attacker && attackerMoves.length > 0">
          <label>招式</label>
          <select class="sel move-sel" :value="moveMemory.selectedMove" @change="selectMove(($event.target as HTMLSelectElement).value)">
            <option value="">（沿用/手动）</option>
            <option v-for="move in attackerMoves" :key="move" :value="move">{{ move }}</option>
          </select>
          <button v-if="hasMultiplePowers" class="bar-btn" @click="scrollPowerIdx(-1)">◀</button>
          <span class="power-info">{{ currentPower().message() }}</span>
          <button v-if="hasMultiplePowers" class="bar-btn" @click="scrollPowerIdx(1)">▶</button>
        </template>
      </div>

      <div class="bar-row">
        <button class="bar-btn third" :class="{ active: memory.attackType == 1 }" @click="setAttackType(1)">攻击</button>
        <button class="bar-btn third" :class="{ active: memory.attackType == 2 }" @click="setAttackType(2)">治疗/护盾</button>
        <button class="bar-btn third" :class="{ active: memory.attackType == 3 }" @click="setAttackType(3)">状态/自定义</button>
      </div>
    </div>

    <div class="aoe-body">
      <div v-if="!memory.attacker" class="empty">先选择攻击方，或回到战斗页选择攻击方后再使用 AOE。</div>

      <template v-else>
        <section class="section">
          <div class="section-title">目标</div>
          <div class="target-grid">
            <button
              v-for="creature in creatures.filter((item) => item.code() !== memory.attacker?.code())"
              :key="creature.code()"
              class="target-btn"
              :class="{ active: targets.some((target) => target.code === creature.code()) }"
              @click="toggleTarget(creature.code())"
            >
              <span>{{ creature.name() }}</span>
              <small>{{ creature.code() }} · HP {{ showHP(creature.hpSet()) }}/{{ creature.maxHP() }}</small>
            </button>
          </div>
        </section>

        <section class="section">
          <div class="section-title">批量设置</div>
          <div class="field">
            <span>{{ currentSpellName }}</span>
            <span>PP {{ currentPPCost }}</span>
            <template v-if="memory.attackType == 2">
              <button class="bar-btn" :class="{ active: healMode == 'heal' }" @click="healMode = 'heal'">治疗</button>
              <button class="bar-btn" :class="{ active: healMode == 'shield' }" @click="healMode = 'shield'">护盾</button>
            </template>
            <template v-if="memory.attackType == 3">
              <button class="bar-btn" :class="{ active: statusMode == 'damage' }" @click="statusMode = 'damage'">伤害</button>
              <button class="bar-btn" :class="{ active: statusMode == 'heal' }" @click="statusMode = 'heal'">治疗</button>
              <button class="bar-btn" :class="{ active: statusMode == 'shield' }" @click="statusMode = 'shield'">护盾</button>
            </template>
            <label>优势</label>
            <input v-model.number="batchAdvantageDelta" class="inp small" type="number" />
            <label>骰值调整</label>
            <input v-model.number="batchDicerollD" class="inp small" type="number" />
            <button class="bar-btn" @click="applyBatchModifiers">应用到全部</button>
            <button class="bar-btn btn-primary" @click="rollAll">全部掷骰</button>
          </div>
        </section>

        <section class="section">
          <div class="section-title">结果</div>
          <div v-if="targets.length == 0" class="empty">选择一个或多个目标后会在这里显示逐目标结果。</div>
          <table v-else class="result-table">
            <thead>
              <tr>
                <th>目标</th>
                <th>骰</th>
                <th>优势</th>
                <th>骰调</th>
                <th>修正</th>
                <th>命中%</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in activeResults" :key="result.entry.code">
                <td>{{ result.creature.name() }}</td>
                <td>
                  <button class="mini-btn" @click="rollEntry(result.entry)">掷</button>
                  <input
                    class="inp tiny"
                    type="number"
                    min="1"
                    max="20"
                    :value="result.entry.diceroll"
                    @change="modifyWorldline(result.entry, Number(($event.target as HTMLInputElement).value))"
                  />
                </td>
                <td><input v-model.number="result.entry.advantageDelta" class="inp tiny" type="number" /></td>
                <td><input v-model.number="result.entry.dicerollD" class="inp tiny" type="number" /></td>
                <td>
                  <input v-model.number="result.entry.damageMdfD" class="inp tiny" type="number" step="0.1" />
                  <span :style="{ color: valueToColor(-result.mdf) }">={{ result.mdf.toFixed(1) }}</span>
                </td>
                <td>{{ result.rollPct }}%</td>
                <td class="result-value">{{ resultValue(result) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <div class="field">
            <button class="bar-btn" @click="copyLog">复制</button>
            <button class="bar-btn btn-danger" :disabled="targets.length == 0" @click="applyAll">应用全部</button>
          </div>
          <textarea class="log-area" readonly :value="logText" />
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tab-aoe {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  color: #222;
}

.sticky-bar {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.bar-row,
.field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
}

.aoe-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.section {
  margin-bottom: 12px;
}

.section-title {
  margin-bottom: 6px;
  font-weight: 700;
  color: #4a6fa5;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}

.target-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  border: 1px solid #ccc;
  background: #f7f7f7;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.target-btn.active {
  background: #e8f0ff;
  border-color: #4a6fa5;
}

.target-btn small {
  color: #666;
}

.bar-btn {
  border: 1px solid #ccc;
  background: #f5f5f5;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.bar-btn:hover {
  background: #e5e5e5;
}

.bar-btn.active {
  background: #222;
  color: #fff;
}

.bar-btn.third {
  flex: 1;
}

.bar-btn.btn-primary {
  background: #2196f3;
  color: #fff;
  border-color: #1976d2;
}

.bar-btn.btn-danger {
  background: #e53935;
  color: #fff;
  border-color: #c62828;
}

.bar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mini-btn {
  border: 1px solid #ccc;
  background: #f5f5f5;
  padding: 2px 5px;
  cursor: pointer;
  font-size: 11px;
}

.sel,
.inp {
  border: 1px solid #ccc;
  padding: 3px 5px;
  font-size: 13px;
  background: #fff;
}

.move-sel {
  min-width: 120px;
  flex: 1;
}

.small {
  width: 60px;
}

.tiny {
  width: 48px;
}

.power-info {
  color: #666;
  font-size: 12px;
}

.empty {
  color: #888;
  padding: 12px 4px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.result-table th,
.result-table td {
  border: 1px solid #e0e0e0;
  padding: 4px;
  text-align: left;
}

.result-table th {
  background: #f5f5f5;
}

.result-value {
  font-weight: 700;
  font-size: 14px;
}

.log-area {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  border: 1px solid #e0e0e0;
  padding: 6px;
  background: #fafafa;
  font-size: 12px;
}
</style>
