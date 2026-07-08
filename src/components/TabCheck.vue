<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import VueNumberInput from '@chenfengyuan/vue-number-input'
import { skillCheckListDisplay, skillToModIndex } from '../model/DataType'
import type { Creature } from '../model/Creature'
import { useCreatureStore } from '../stores/creatureStore'
import { checkMemory, type RollMode } from '../stores/checkStore'
import { useRequestStore } from '../stores/requestStore'
import { d10, d20, dvalue, toMod } from '../utils'

const { creatures } = useCreatureStore()
const requestStore = useRequestStore()
const memory = checkMemory
const DM_CODE = 'DM'
const abilityNames = ['力量', '敏捷', '体质', '智力', '感知', '魅力'] as const
const lastRollText = ref('')

const selectedCodes = computed(() => Array.from(memory.value.chosen))
const selectedSummary = computed(() =>
  selectedCodes.value.length === 0 ? '无' : selectedCodes.value.map(actorLabel).join('、')
)
const checkActionLabel = computed(() => (memory.value.rollMode === 'save' ? '豁免' : '检定'))
const defaultAbilityLabel = computed(() => defaultAbilityName(memory.value.checkSkill))

function creatureByCode(code: string): Creature | undefined {
  return creatures.value.find((c) => c.code() === code)
}

function actorLabel(code: string): string {
  if (code === DM_CODE) return 'DM（暗骰）'
  const c = creatureByCode(code)
  return c ? `${c.name()} (${c.code()})` : code
}

function setRollMode(mode: RollMode): void {
  memory.value.rollMode = mode
}

function toggleSelectedCode(code: string): void {
  const c = code === DM_CODE ? undefined : creatureByCode(code)
  if (c) c.shallowRefresh()
  else if (code !== DM_CODE) return
  if (memory.value.chooseMode) {
    memory.value.chosen.clear()
    memory.value.chosen.add(code)
  } else if (memory.value.chosen.has(code)) {
    memory.value.chosen.delete(code)
  } else {
    memory.value.chosen.add(code)
  }
}

function selectFactions(factions: string[]): void {
  memory.value.chosen.clear()
  memory.value.chooseMode = 0
  for (const c of creatures.value) if (factions.includes(c.faction)) memory.value.chosen.add(c.code())
}

function appendLog(text: string): void {
  memory.value.logs += text.endsWith('\n') ? text : `${text}\n`
}

async function scrollLogToBottom(): Promise<void> {
  await nextTick()
  const textarea = document.getElementById('check-logs')
  if (textarea instanceof HTMLTextAreaElement) textarea.scrollTop = textarea.scrollHeight
}

function rollDiceSequence(sequence: string): { total: number; text: string } | null {
  const tokens = sequence
    .replace(/[^\ddDpPnNmMyYlL+\- ]/g, '')
    .replace(/-/g, ' - ')
    .split(/[ +]/g)
    .map((s) => s.trim())
    .filter(Boolean)
  let sum = 0
  let sign = 1
  const parts: string[] = []
  for (const token of tokens) {
    if (token === '-') {
      sign = -1
      continue
    }
    const signText = sign < 0 ? '- ' : ''
    if (/^\d+[dD]\d+$/.test(token)) {
      const [count, sides] = token.split(/[dD]/).map((v) => Number(v) || 1)
      let part = 0
      for (let i = 0; i < count; i++) part += dvalue(sides)
      sum += sign * part
      parts.push(`${signText}${count}d${sides} (${part})`)
    } else if (/^\d+[pPyY]\d+$/.test(token)) {
      const [count, sides] = token.split(/[pPyY]/).map((v) => Number(v) || 1)
      const rolls = Array.from({ length: count }, () => dvalue(sides))
      const part = Math.max(...rolls)
      sum += sign * part
      parts.push(`${signText}优势 ${count}d${sides} (${part} = ${rolls.join(', ')})`)
    } else if (/^\d+[nNmMlL]\d+$/.test(token)) {
      const [count, sides] = token.split(/[nNmMlL]/).map((v) => Number(v) || 1)
      const rolls = Array.from({ length: count }, () => dvalue(sides))
      const part = Math.min(...rolls)
      sum += sign * part
      parts.push(`${signText}劣势 ${count}d${sides} (${part} = ${rolls.join(', ')})`)
    } else if (/^\d+$/.test(token)) {
      const value = Number(token)
      sum += sign * value
      parts.push(`${signText}${value}`)
    }
    sign = 1
  }
  if (parts.length === 0) return null
  return { total: sum, text: parts.join(' + ').replace(/\+ -/g, '-') + ` = ${sum}` }
}

async function makeCustomDiceroll(): Promise<void> {
  const codes = selectedCodes.value
  const lines: string[] = []
  if (codes.length === 0) appendLog('没有选定掷骰对象。')
  for (const code of codes) {
    const roll = rollDiceSequence(memory.value.diceSequence)
    if (!roll) {
      appendLog('骰子指令为空或无法识别。')
      break
    }
    const line = `${actorLabel(code)}：${roll.text}`
    lines.push(line)
    appendLog(line)
  }
  lastRollText.value = lines.join('\n')
  await scrollLogToBottom()
}

function defaultAbilityName(skill: string): string {
  const idx = skillToModIndex(skill)
  return idx >= 0 ? abilityNames[idx] : '默认'
}

function isAbilityName(skill: string): boolean {
  return (abilityNames as readonly string[]).includes(skill)
}

function saveModifierByAbility(cur: Creature, ability: string): number {
  if (ability === '力量') return cur.strsave()
  if (ability === '敏捷') return cur.dexsave()
  if (ability === '体质') return cur.consave()
  if (ability === '智力') return cur.intsave()
  if (ability === '感知') return cur.wissave()
  if (ability === '魅力') return cur.chasave()
  return 0
}

function extraSkillBonus(cur: Creature, skill: string): number {
  return isAbilityName(skill) ? 0 : cur.skillModRaw(skill)
}

function rollBonus(cur: Creature, mode: 'check' | 'save'): number {
  const skill = memory.value.checkSkill
  const override = memory.value.abilityOverride
  if (!override) return mode === 'save' ? cur.skillSave(skill) : cur.skillMod(skill)
  const abilityPart = mode === 'save' ? saveModifierByAbility(cur, override) : cur.getModifierByName(override)
  return abilityPart + extraSkillBonus(cur, skill)
}

function rollAdvance(cur: Creature, mode: 'check' | 'save'): number {
  if (!memory.value.useCustomAdvance) return 0
  const statusSkill = memory.value.abilityOverride || memory.value.checkSkill
  const statusAdvance =
    mode === 'save' ? cur.skillSaveAdvanceStatus(statusSkill) : cur.skillCheckAdvanceStatus(statusSkill)
  return cur.skillAdvance.get(memory.value.checkSkill) + statusAdvance
}

function currentRollTitle(mode: 'check' | 'save'): string {
  const action = mode === 'save' ? '豁免' : '检定'
  if (!memory.value.abilityOverride) return `${memory.value.checkSkill}${action}`
  return `${memory.value.checkSkill}${action}（使用${memory.value.abilityOverride}${mode === 'save' ? '豁免' : '调整值'}）`
}

function advantageLabel(advance: number): string {
  if (advance > 0) return `${advance > 1 ? `+${advance} ` : ''}优势`
  return `${advance < -1 ? `${advance} ` : ''}劣势`
}

async function startCheck(): Promise<void> {
  const mode: 'check' | 'save' = memory.value.rollMode === 'save' ? 'save' : 'check'
  const lines: string[] = []
  const log = (text: string): void => {
    lines.push(text)
    appendLog(text)
  }
  let rolled = false
  for (const code of selectedCodes.value) {
    if (code === DM_CODE) continue
    const cur = creatureByCode(code)
    if (!cur) continue
    cur.shallowRefresh()
    rolled = true
    const title = currentRollTitle(mode)
    const advance = rollAdvance(cur, mode)
    if (advance !== 0) log(`${cur.name()}要进行一次${title}，具有${advantageLabel(advance)}。`)
    if (advance >= 99) {
      log(`${cur.name()}自动通过了本次${title}。`)
      continue
    }
    if (advance <= -99) {
      log(`${cur.name()}本次${title}自动失败。`)
      continue
    }
    const minRoll = memory.value.useCustomMin ? cur.skillMin.get(memory.value.checkSkill) : 0
    const diceCount = Math.abs(advance) + 1
    const prof = rollBonus(cur, mode) + memory.value.tempModifier
    let successCount = 0
    let finalRoll = advance > 0 ? -1e9 : 1e9
    for (let i = 0; i < diceCount; i++) {
      const natural = Math.min(20, Math.max(d20(), minRoll))
      const roll = natural + prof
      const success = (natural !== 1 && roll >= memory.value.difficulty) || natural === 20
      if (success) successCount += 1
      finalRoll = advance > 0 ? Math.max(finalRoll, roll) : Math.min(finalRoll, roll)
      if (memory.value.difficulty > 0) {
        const grade = natural === 20 ? '大成功' : natural === 1 ? '大失败' : success ? '成功' : '失败'
        log(`${cur.name()}${success ? '通过了' : '未能通过'}一次${title}：(${cur.name()}：${title})[${grade}]D20${toMod(prof)}=${roll}/${memory.value.difficulty}`)
      } else {
        log(`(${cur.name()}：${title})D20${toMod(prof)}=${roll}`)
      }
    }
    if (advance !== 0) {
      if (memory.value.difficulty > 0) {
        const ok = (successCount > 0 && advance > 0) || (successCount >= diceCount && advance < 0)
        log(`${cur.name()}${ok ? '通过了' : '未能通过'}本次${title}。`)
      } else {
        log(`最终结果：(${cur.name()}：${title})D20${toMod(prof)}=${finalRoll}`)
      }
    }
  }
  if (!rolled) appendLog(memory.value.chosen.has(DM_CODE) ? 'DM 不参与检定或豁免。' : '没有选定角色。')
  lastRollText.value = lines.join('\n')
  await scrollLogToBottom()
}

function makeInitiative(): void {
  for (const c of creatures.value) c.tempInitiative = d10()
  for (const c of creatures.value) appendLog(`${c.name()} (${c.code()}) 的先攻：${c.initiative()} + ${c.tempInitiative} = ${c.initiative() + c.tempInitiative}`)
}

function copyLog(): void {
  navigator.clipboard.writeText(memory.value.logs)
}

async function submitLastRoll(): Promise<void> {
  if (!lastRollText.value.trim()) return
  const firstCode = selectedCodes.value.find((code) => code !== DM_CODE) ?? selectedCodes.value[0] ?? ''
  const creature = firstCode ? creatureByCode(firstCode) : undefined
  const mode = memory.value.rollMode
  await requestStore.submitRollRequest({
    actorCode: creature?.code() ?? (firstCode || 'roll'),
    actorName: creature?.name() ?? actorLabel(firstCode || 'roll'),
    mode,
    title: mode === 'dice' ? `掷骰 ${memory.value.diceSequence}` : currentRollTitle(mode === 'save' ? 'save' : 'check'),
    formula: mode === 'dice' ? memory.value.diceSequence : undefined,
    text: lastRollText.value,
  })
  window.dispatchEvent(new CustomEvent('owl-pm-open-tab', { detail: 'requests' }))
}
</script>

<template>
  <div class="check-tab">
    <aside class="check-sidebar">
      <button class="actor-row" :class="{ selected: memory.chosen.has(DM_CODE) }" @click="toggleSelectedCode(DM_CODE)">DM（暗骰）</button>
      <button v-for="c in creatures" :key="c.code()" class="actor-row" :class="{ selected: memory.chosen.has(c.code()) }" @click="toggleSelectedCode(c.code())">
        <b>{{ c.name() }}</b><small>{{ c.code() }} · {{ c.faction }}</small>
      </button>
    </aside>
    <main class="check-main">
      <section class="card">
        <div class="mode-tabs">
          <button v-for="m in [{v:'dice',l:'单纯掷骰'},{v:'check',l:'检定'},{v:'save',l:'豁免'}]" :key="m.v" :class="{ active: memory.rollMode === m.v }" @click="setRollMode(m.v as RollMode)">{{ m.l }}</button>
          <span>已选 {{ selectedCodes.length }}</span>
        </div>
        <p class="summary">{{ selectedSummary }}</p>
        <div v-if="memory.rollMode === 'dice'" class="dice-controls">
          <input v-model="memory.diceSequence" placeholder="4d6 + 1d20 - 5 + 2p20 - 3n20" />
          <button class="primary" @click="makeCustomDiceroll">掷骰</button>
          <button :disabled="!lastRollText" @click="submitLastRoll">提交最近结果给 DM</button>
        </div>
        <div v-else class="check-controls">
          <label>DC <VueNumberInput v-model="memory.difficulty" size="small" inline center controls :min="0" :step="1" /></label>
          <label>项目 <select v-model="memory.checkSkill"><option v-for="name in skillCheckListDisplay" :key="name" :value="name" :disabled="name === '────'">{{ name }}</option></select></label>
          <label>{{ memory.rollMode === 'save' ? '覆盖豁免' : '覆盖调整' }} <select v-model="memory.abilityOverride"><option value="">默认（{{ defaultAbilityLabel }}）</option><option v-for="a in abilityNames" :key="a" :value="a">{{ a }}</option></select></label>
          <label>临时修正 <VueNumberInput v-model="memory.tempModifier" size="small" inline center controls :step="1" /></label>
          <button :class="{ active: !memory.useCustomAdvance }" @click="memory.useCustomAdvance = 1 - memory.useCustomAdvance">{{ memory.useCustomAdvance ? '启用优劣势' : '禁用优劣势' }}</button>
          <button :class="{ active: !memory.useCustomMin }" @click="memory.useCustomMin = 1 - memory.useCustomMin">{{ memory.useCustomMin ? '启用保底值' : '禁用保底值' }}</button>
          <button class="primary" @click="startCheck">开始{{ checkActionLabel }}</button>
          <button :disabled="!lastRollText" @click="submitLastRoll">提交最近结果给 DM</button>
        </div>
      </section>
      <section class="card actions">
        <button :class="{ active: memory.chooseMode }" @click="memory.chooseMode = 1 - memory.chooseMode">{{ memory.chooseMode ? '单选模式' : '多选模式' }}</button>
        <button @click="makeInitiative">生成先攻</button>
        <button @click="selectFactions(['玩家'])">全选玩家</button>
        <button @click="selectFactions(['玩家','友方'])">玩家+友方</button>
        <button @click="selectFactions(['敌方'])">全选敌方</button>
        <button @click="memory.chosen.clear()">清空选中</button>
      </section>
      <section class="card log-card">
        <div class="log-head"><b>日志</b><span /><button @click="copyLog">复制</button><button @click="memory.logs = ''">清空</button></div>
        <textarea id="check-logs" v-model="memory.logs" spellcheck="false" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.check-tab { height: 100%; display: flex; background: #f7f7f5; }
.check-sidebar { width: 14em; flex-shrink: 0; overflow-y: auto; border-right: 1px solid #ddd; background: #fafafa; }
.actor-row { width: 100%; display: grid; border: 0; border-bottom: 1px solid #eee; background: transparent; padding: 6px 8px; cursor: pointer; text-align: left; }
.actor-row.selected { background: #222; color: #fff; }
.actor-row small { color: #777; }
.actor-row.selected small { color: #ddd; }
.check-main { flex: 1; min-width: 0; overflow: auto; padding: 10px; display: grid; align-content: start; gap: 10px; }
.card { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
.mode-tabs, .actions, .check-controls, .dice-controls, .log-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
button { border: 1px solid #ccc; background: #f5f5f5; padding: 4px 9px; cursor: pointer; }
button.active, .mode-tabs button.active { background: #222; color: #fff; }
.primary { margin-left: auto; background: #222; color: #fff; }
input, select { border: 1px solid #ccc; padding: 4px 6px; font: inherit; }
.dice-controls input { flex: 1; min-width: 180px; }
.check-controls label { display: inline-flex; align-items: center; gap: 4px; }
.summary { margin: 8px 0 0; color: #555; font-size: 12px; overflow-wrap: anywhere; }
.log-head span { flex: 1; }
textarea { width: 100%; min-height: 240px; height: min(45vh, 34em); resize: vertical; box-sizing: border-box; border: 1px solid #ccc; padding: 8px; font-family: ui-monospace, Consolas, monospace; }
@media (max-width: 620px) { .check-tab { flex-direction: column; } .check-sidebar { width: 100%; max-height: 34%; border-right: 0; border-bottom: 1px solid #ddd; } .primary { margin-left: 0; } }
</style>
