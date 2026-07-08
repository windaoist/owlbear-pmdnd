<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  damageTypeList,
  damageAspectList,
  modifierList,
  damageAttackList,
  damageDefenseList,
} from '../model/DataType'
import {
  battleMemory,
  battleMemoryHeal,
  battleMemoryStatus,
  moveMemory,
  currentMove,
  currentPower,
  currentDC,
  preferredPowerIndex,
  setCurrentMove,
  damageCalc,
  healCalc,
  healShieldCalc,
  statusCalc,
  battleLv,
  spellTypeStab,
  spellModifier,
  spellAttack,
  damageDefense,
  damageMdf,
  attackDiceroll,
  attackDicerollPercentage,
  accuracyAdvance,
  battleLvHeal,
  spellTypeStabHeal,
  spellModifierHeal,
  spellAttackHeal,
  spellAttackHealShield,
  healMdf,
  healDiceroll,
  healDicerollPercentage,
  battleLvStatus,
  damageDefenseStatus,
  damageMdfStatus,
  statusDiceroll,
  statusDicerollPercentage,
  attackMessage,
  healMessage,
  healShieldMessage,
  statusMessage,
  healStatusMessage,
  healShieldStatusMessage,
  copyAttackMessageToClipboard,
  copyHealMessageToClipboard,
  copyHealShieldMessageToClipboard,
  copyStatusMessageToClipboard,
  copyHealStatusMessageToClipboard,
  copyHealShieldStatusMessageToClipboard,
  applyAttackResult,
  applyHealResult,
  applyHealShieldResult,
  applyStatusResult,
  applyHealStatusResult,
  applyHealShieldStatusResult,
  removeAttacker,
  removeDefender,
  toggleAttackType,
  toggleDamageDef,
  toggleStatusDamageDef,
  toggleEnableCT,
  toggleEnableMiss,
  toggleEnableAccuracyAdvance,
  toggleHealEnableCT,
  toggleHealEnableMiss,
  toggleStatusEnableCT,
  toggleStatusEnableMiss,
  rolld20,
  rollHeald20,
  rollStatusd20,
  modifyWorldlineMemory,
  getAttackAdvantage,
  onChangeSelectedCreature,
} from '../stores/battleStore'
import { checkMemory } from '../stores/checkStore'
import { useCreatureStore } from '../stores/creatureStore'
import { toAdvantage, valueToColor } from '../utils'
import BattleCharacterSidebar from './BattleCharacterSidebar.vue'
import VueNumberInput from '@chenfengyuan/vue-number-input'

const { creatures } = useCreatureStore()

const memory = battleMemory
const memoryHeal = battleMemoryHeal
const memoryStatus = battleMemoryStatus
const showMoveDescription = ref(false)
const saveAbilities = ['力量', '敏捷', '体质', '智力', '感知', '魅力']

function handleSelectCreature(code: string): void {
  onChangeSelectedCreature(creatures.value, code)
  if (moveMemory.value.selectedMove) setCurrentMove()
}

// 滚轮切换下拉选项
function createWheelHandler<T>(
  getList: () => T[],
  getValue: () => T,
  setValue: (val: T) => void,
): (e: WheelEvent) => void {
  return (e: WheelEvent) => {
    const list = getList()
    const cur = getValue()
    let idx = list.indexOf(cur)
    if (e.deltaY < 0) idx = Math.max(idx - 1, 0)
    else if (e.deltaY > 0) idx = Math.min(idx + 1, list.length - 1)
    setValue(list[idx])
    e.preventDefault()
  }
}

const damageTypeWheel = createWheelHandler(
  () => damageTypeList,
  () => memory.value.damageType,
  (v) => (memory.value.damageType = v),
)
const damageAspectWheel = createWheelHandler(
  () => damageAspectList,
  () => memory.value.damageAspect,
  (v) => (memory.value.damageAspect = v),
)
const spellTypeWheel = createWheelHandler(
  () => damageTypeList,
  () => memory.value.spellType,
  (v) => (memory.value.spellType = v),
)
const spellHealTypeWheel = createWheelHandler(
  () => damageTypeList,
  () => memoryHeal.value.spellType,
  (v) => (memoryHeal.value.spellType = v),
)
const spellModWheel = createWheelHandler(
  () => modifierList,
  () => memory.value.spellMod,
  (v) => (memory.value.spellMod = v),
)
const spellHealModWheel = createWheelHandler(
  () => modifierList,
  () => memoryHeal.value.spellMod,
  (v) => (memoryHeal.value.spellMod = v),
)
const spellAttackWheel = createWheelHandler(
  () => damageAttackList,
  () => memory.value.spellAttack,
  (v) => (memory.value.spellAttack = v),
)
const spellHealAttackWheel = createWheelHandler(
  () => damageAttackList,
  () => memoryHeal.value.spellAttack,
  (v) => (memoryHeal.value.spellAttack = v),
)
const spellHealShieldAttackWheel = createWheelHandler(
  () => damageAttackList,
  () => memoryHeal.value.spellAttackShield,
  (v) => (memoryHeal.value.spellAttackShield = v),
)
const damageDefenseWheel = createWheelHandler(
  () => damageDefenseList,
  () => memory.value.damageDefense,
  (v) => (memory.value.damageDefense = v),
)
const damageStatusDefenseWheel = createWheelHandler(
  () => damageDefenseList,
  () => memoryStatus.value.damageDefense,
  (v) => (memoryStatus.value.damageDefense = v),
)
const damageStatusTypeWheel = createWheelHandler(
  () => damageTypeList,
  () => memoryStatus.value.damageType,
  (v) => (memoryStatus.value.damageType = v),
)
const damageStatusAspectWheel = createWheelHandler(
  () => damageAspectList,
  () => memoryStatus.value.damageAspect,
  (v) => (memoryStatus.value.damageAspect = v),
)

// 刷新 Creature 状态缓存
if (memory.value.attacker) memory.value.attacker.shallowRefresh()
if (memory.value.defender) memory.value.defender.shallowRefresh()

const damageResult = computed(() => damageCalc())
const healResult = computed(() => healCalc())
const healShieldResult = computed(() => healShieldCalc())
const statusDamageResult = computed(() => statusCalc(false))
const statusHealResult = computed(() => statusCalc(true))

// ── 招式选择 ──
const attackerMoves = computed(() => {
  if (!memory.value.attacker) return []
  return memory.value.attacker.getMoveList()
})

function selectMove(name: string): void {
  moveMemory.value.selectedMove = name
  moveMemory.value.selectedPowerIdx = preferredPowerIndex()
  setCurrentMove()
}

function scrollMove(delta: number): void {
  if (attackerMoves.value.length <= 0) return
  const index = attackerMoves.value.indexOf(moveMemory.value.selectedMove)
  const next = delta < 0
    ? attackerMoves.value[Math.max(0, index - 1)]
    : attackerMoves.value[Math.min(attackerMoves.value.length - 1, index + 1)]
  if (next) selectMove(next)
}

function scrollPowerIdx(delta: number): void {
  const len = currentMove().powerList.length
  if (len > 0) {
    moveMemory.value.selectedPowerIdx = Math.min(
      Math.max(0, moveMemory.value.selectedPowerIdx + delta),
      len - 1,
    )
    setCurrentMove()
  }
}

const currentSelectedPower = computed(() => currentPower())
const hasMultiplePowers = computed(() => currentMove().powerList.length > 2)

function openSaveCheck(skill: string): void {
  if (!memory.value.defender) return
  checkMemory.value.chosen.clear()
  checkMemory.value.chosen.add(memory.value.defender.code())
  checkMemory.value.rollMode = 'save'
  checkMemory.value.checkSkill = skill
  checkMemory.value.abilityOverride = ''
  checkMemory.value.difficulty = currentDC()
  window.dispatchEvent(new CustomEvent('owl-pm-open-tab', { detail: 'check' }))
}
</script>

<template>
  <div class="tab-battle">
    <BattleCharacterSidebar
      :on-select="handleSelectCreature"
      :selected-code="memory.attacker?.code() ?? memory.defender?.code() ?? ''"
    />

    <div class="battle-main">
      <!-- 顶部控制栏 -->
      <div class="sticky-bar">
        <div class="bar-row">
          <button
            class="bar-btn half"
            :class="{ active: memory.attacker != null }"
            @click="removeAttacker"
          >
            {{ memory.attacker == null ? '未选择攻击方' : `${memory.attacker.name()} ${memory.attacker.code()}` }}
          </button>
          <button
            class="bar-btn half"
            :class="{ active: memory.defender != null }"
            @click="removeDefender"
          >
            {{ memory.defender == null ? '未选择防御方' : `${memory.defender.name()} ${memory.defender.code()}` }}
          </button>
        </div>

        <!-- 招式选择（攻击方已选且有招式时显示） -->
        <div v-if="memory.attacker && attackerMoves.length > 0" class="move-selector">
          <div class="move-line">
            <label class="move-label">招式</label>
            <select
              class="sel move-sel"
              :value="moveMemory.selectedMove"
              @change="selectMove(($event.target as HTMLSelectElement).value)"
              @wheel.prevent="scrollMove($event.deltaY)"
            >
              <option value="">（手动输入）</option>
              <option v-for="m in attackerMoves" :key="m" :value="m">{{ m }}</option>
            </select>
            <template v-if="hasMultiplePowers">
              <span class="power-nav" @click="scrollPowerIdx(-1)">◀</span>
              <span class="power-info">{{ currentSelectedPower.message() }}</span>
              <span class="power-nav" @click="scrollPowerIdx(1)">▶</span>
            </template>
            <span v-else class="power-info">{{ currentSelectedPower.message() }}</span>
            <button class="bar-btn" @click="showMoveDescription = !showMoveDescription">
              {{ showMoveDescription ? '收起描述' : '展开描述' }}
            </button>
          </div>
          <div v-if="memory.defender" class="save-shortcuts">
            <span>快速豁免 DC {{ currentDC() }}</span>
            <button v-for="skill in saveAbilities" :key="skill" class="bar-btn" @click="openSaveCheck(skill)">
              {{ skill }} {{ currentDC() }}
            </button>
          </div>
          <textarea
            v-if="showMoveDescription"
            v-model="currentMove().description"
            class="move-description"
            spellcheck="false"
            placeholder="暂无招式描述"
          />
        </div>

        <div class="bar-row">
          <button
            class="bar-btn third"
            :class="{ active: memory.attackType == 1 }"
            @click="toggleAttackType(1)"
          >
            攻击
          </button>
          <button
            class="bar-btn third"
            :class="{ active: memory.attackType == 2 }"
            @click="toggleAttackType(2)"
          >
            治疗/护盾
          </button>
          <button
            class="bar-btn third"
            :class="{ active: memory.attackType == 3 }"
            @click="toggleAttackType(3)"
          >
            状态/自定义伤害
          </button>
        </div>
      </div>

      <!-- ═══ 子页：攻击 ═══ -->
      <div v-if="memory.attackType == 1 && memory.attacker != null && memory.defender != null" class="battle-body">

        <div class="field">
          招式 <input v-model="memory.spellName" class="inp" style="width:10em" />
          消耗 <VueNumberInput v-model="memory.costPP" size="small" :min="0" :step="15" inline center controls />
          PP
        </div>
        <div class="field">
          威力
          <VueNumberInput v-model="memory.effect" size="medium" :min="1" :step="5" inline center controls />
          <select v-model="memory.damageType" class="sel" style="width:5em" @wheel="damageTypeWheel">
            <option v-for="n in damageTypeList" :key="n" :value="n">{{ n }}</option>
          </select>
          <button class="bar-btn" :class="{ active: memory.damageDef == '特殊' }" @click="toggleDamageDef">
            {{ memory.damageDef }}
          </button>
          <select v-model="memory.damageAspect" class="sel" style="width:5em" @wheel="damageAspectWheel">
            <option v-for="n in damageAspectList" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <div class="field">
          攻击等级 {{ memory.attacker.battleLv() }} +
          <VueNumberInput v-model="memory.battleLvD" size="medium" :step="1" inline center controls />
          = <strong :style="{color:valueToColor(-memory.battleLvD)}">{{ battleLv() }}</strong>
        </div>
        <div class="field">
          招式属性
          <select v-model="memory.spellType" class="sel" style="width:5em" @wheel="spellTypeWheel">
            <option v-for="n in damageTypeList" :key="n" :value="n">{{ n }}</option>
          </select>
          STAB = {{ memory.attacker.typeStab(memory.spellType) }} +
          <VueNumberInput v-model="memory.spellTypeStabD" size="medium" :step="5" inline center controls />
          = <strong :style="{color:valueToColor(-spellTypeStab())}">{{ spellTypeStab() }}</strong>
        </div>
        <div class="field">
          加值
          <select v-model="memory.spellMod" class="sel" style="width:5em" @wheel="spellModWheel">
            <option v-for="n in modifierList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.attacker.getModifierByName(memory.spellMod) }} +
          <VueNumberInput v-model="memory.spellModD" size="medium" :step="1" inline center controls />
          = <strong :style="{color:valueToColor(-spellModifier())}">{{ spellModifier() }}</strong>
        </div>
        <div class="field">
          攻击数值
          <select v-model="memory.spellAttack" class="sel" style="width:5em" @wheel="spellAttackWheel">
            <option v-for="n in damageAttackList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.attacker.getAttackAttributeByName(memory.spellAttack) }} +
          <VueNumberInput v-model="memory.spellAttackD" size="medium" :step="1" inline center controls />
          = <strong :style="{color:valueToColor(-memory.spellAttackD)}">{{ spellAttack() }}</strong>
        </div>

        <div class="field">
          防御数值
          <select v-model="memory.damageDefense" class="sel" style="width:5em" @wheel="damageDefenseWheel">
            <option v-for="n in damageDefenseList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.defender.getAttributeByName(memory.damageDefense) }} +
          <VueNumberInput v-model="memory.damageDefenseD" size="medium" :step="1" inline center controls />
          = <strong :style="{color:valueToColor(-memory.damageDefenseD)}">{{ damageDefense() }}</strong>
        </div>
        <div class="field">
          伤害修正
          {{ (memory.defender.typeMdf(memory.damageType) + memory.defender.typeMdf(memory.damageAspect) + memory.defender.grandStatus().grandMdf).toFixed(1) }}
          +
          <VueNumberInput v-model="memory.damageMdfD" size="medium" :step="0.1" inline center controls />
          = <strong :style="{color:valueToColor(-damageMdf())}">{{ damageMdf().toFixed(1) }}</strong>
        </div>

        <div class="field flex-wrap">
          <button class="bar-btn" :class="{ active: !memory.enableCT }" @click="toggleEnableCT">
            {{ memory.enableCT ? '暴击✓' : '无暴击' }}
          </button>
          <VueNumberInput v-model="memory.ctLimit" size="medium" :min="1" :max="20" :step="1" inline center controls />
          <button class="bar-btn" :class="{ active: !memory.enableMiss }" @click="toggleEnableMiss">
            {{ memory.enableMiss ? '大失败✓' : '无大失败' }}
          </button>
          <button class="bar-btn" :class="{ active: !memory.enableAccuracyAdvance }" @click="toggleEnableAccuracyAdvance">
            {{ memory.enableAccuracyAdvance ? '命中减值✓' : '无视命中' }}
          </button>
          优势
          <VueNumberInput v-model="memory.advantageDelta" size="small" :step="1" inline center controls />
          <button
            class="bar-btn"
            :class="{ 'btn-danger': memory.defender?.grandStatus().autoCrit }"
            @click="rolld20"
          >
            {{ memory.defender?.grandStatus().autoCrit ? '自动暴击!' : '掷骰' }}
          </button>
          <span v-if="getAttackAdvantage(memory.spellMod) != 0" :style="{color:valueToColor(-getAttackAdvantage(memory.spellMod))}">
            {{ toAdvantage(getAttackAdvantage(memory.spellMod)) }}
          </span>
        </div>
        <div class="field">
          原始值
          <VueNumberInput :model-value="memory.diceroll" size="medium" :min="1" :max="20" :step="1" inline center controls
            @update:model-value="(v: number) => modifyWorldlineMemory(memory, v)" />
          + 加值 <strong :style="{color:valueToColor(-spellModifier())}">{{ spellModifier() }}</strong>
          + 命中 <strong :style="{color:valueToColor(-accuracyAdvance())}">{{ accuracyAdvance() }}</strong>
          + 调整 <VueNumberInput v-model="memory.dicerollD" size="medium" :step="1" inline center controls />
          = <strong :style="{color:valueToColor(-memory.dicerollD)}">{{ attackDiceroll() }} ({{ attackDicerollPercentage() }}%)</strong>
        </div>

        <div class="field" style="font-size:x-large">
          伤害：{{ damageResult }}
          <button class="bar-btn" @click="copyAttackMessageToClipboard">复制</button>
          <button class="bar-btn btn-primary" @click="applyAttackResult">应用</button>
        </div>
        <textarea
          class="log-area"
          readonly
          :value="attackMessage()"
        />
        <div class="field">
          专注豁免 DC = {{ memory.defender.concentrationSaveFromDamage(damageResult) }}
        </div>
      </div>

      <!-- ═══ 子页：治疗/护盾 ═══ -->
      <div v-if="memory.attackType == 2 && memory.attacker != null && memory.defender != null" class="battle-body">

        <div class="field">
          招式 <input v-model="memoryHeal.spellName" class="inp" style="width:10em" />
          消耗 <VueNumberInput v-model="memoryHeal.costPP" size="small" :min="0" :step="15" inline center controls />
          PP
        </div>
        <div class="field">
          威力
          <VueNumberInput v-model="memoryHeal.effect" size="medium" :min="1" :step="5" inline center controls />
        </div>
        <div class="field">
          治疗等级 {{ memory.attacker.battleLv() }} +
          <VueNumberInput v-model="memoryHeal.battleLvD" size="medium" :step="1" inline center controls />
          = <strong>{{ battleLvHeal() }}</strong>
        </div>
        <div class="field">
          属性
          <select v-model="memoryHeal.spellType" class="sel" style="width:5em" @wheel="spellHealTypeWheel">
            <option v-for="n in damageTypeList" :key="n" :value="n">{{ n }}</option>
          </select>
          STAB = {{ memory.attacker.typeStab(memoryHeal.spellType) }} +
          <VueNumberInput v-model="memoryHeal.spellTypeStabD" size="medium" :step="5" inline center controls />
          = <strong>{{ spellTypeStabHeal() }}</strong>
        </div>
        <div class="field">
          加值
          <select v-model="memoryHeal.spellMod" class="sel" style="width:5em" @wheel="spellHealModWheel">
            <option v-for="n in modifierList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.attacker.getModifierByName(memoryHeal.spellMod) }} +
          <VueNumberInput v-model="memoryHeal.spellModD" size="medium" :step="1" inline center controls />
          = <strong>{{ spellModifierHeal() }}</strong>
        </div>
        <div class="field">
          治疗数值
          <select v-model="memoryHeal.spellAttack" class="sel" style="width:5em" @wheel="spellHealAttackWheel">
            <option v-for="n in damageAttackList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.attacker.getAttackAttributeByName(memoryHeal.spellAttack) }} +
          <VueNumberInput v-model="memoryHeal.spellAttackD" size="medium" :step="1" inline center controls />
          = <strong>{{ spellAttackHeal() }}</strong>
        </div>
        <div class="field">
          护盾数值
          <select v-model="memoryHeal.spellAttackShield" class="sel" style="width:5em" @wheel="spellHealShieldAttackWheel">
            <option v-for="n in damageAttackList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.attacker.getAttackAttributeByName(memoryHeal.spellAttackShield) }} +
          <VueNumberInput v-model="memoryHeal.spellAttackShieldD" size="medium" :step="1" inline center controls />
          = <strong>{{ spellAttackHealShield() }}</strong>
        </div>
        <div class="field">
          治疗修正
          <VueNumberInput v-model="memoryHeal.damageMdfD" size="medium" :step="0.1" inline center controls />
          = <strong>{{ healMdf().toFixed(1) }}</strong>
        </div>

        <div class="field flex-wrap">
          <button class="bar-btn" :class="{ active: !memoryHeal.enableCT }" @click="toggleHealEnableCT">
            {{ memoryHeal.enableCT ? '暴击✓' : '无暴击' }}
          </button>
          <VueNumberInput v-model="memoryHeal.ctLimit" size="medium" :min="1" :max="20" :step="1" inline center controls />
          <button class="bar-btn" :class="{ active: !memoryHeal.enableMiss }" @click="toggleHealEnableMiss">
            {{ memoryHeal.enableMiss ? '大失败✓' : '无大失败' }}
          </button>
          优势
          <VueNumberInput v-model="memoryHeal.advantageDelta" size="small" :step="1" inline center controls />
          <button class="bar-btn" @click="rollHeald20">掷骰</button>
        </div>
        <div class="field">
          原始值
          <VueNumberInput :model-value="memoryHeal.diceroll" size="medium" :min="1" :max="20" :step="1" inline center controls
            @update:model-value="(v: number) => modifyWorldlineMemory(memoryHeal, v)" />
          + 加值 <strong>{{ spellModifierHeal() }}</strong>
          + 调整 <VueNumberInput v-model="memoryHeal.dicerollD" size="medium" :step="1" inline center controls />
          = <strong>{{ healDiceroll() }} ({{ healDicerollPercentage() }}%)</strong>
        </div>

        <div class="field" style="font-size:x-large">
          治疗：{{ healResult }}
          <button class="bar-btn" @click="copyHealMessageToClipboard">复制</button>
          <button class="bar-btn btn-primary" @click="applyHealResult">应用</button>
        </div>
        <textarea class="log-area" readonly :value="healMessage()" />

        <div class="field" style="font-size:x-large">
          护盾：{{ healShieldResult }}
          <button class="bar-btn" @click="copyHealShieldMessageToClipboard">复制</button>
          <button class="bar-btn btn-danger" @click="applyHealShieldResult">应用</button>
        </div>
        <textarea class="log-area" readonly :value="healShieldMessage()" />
      </div>

      <!-- ═══ 子页：状态/自定义伤害 ═══ -->
      <div v-if="memory.attackType == 3 && memory.defender != null" class="battle-body">

        <div class="field">
          {{ memory.defender.name() }} 受到来自
          <input v-model="memoryStatus.spellName" class="inp" style="width:10em" />的伤害
          消耗 <VueNumberInput v-model="memoryStatus.costPP" size="small" :min="0" :step="15" inline center controls />PP
        </div>
        <div class="field">
          威力
          <VueNumberInput v-model="memoryStatus.effect" size="medium" :min="1" :step="5" inline center controls />
          <select v-model="memoryStatus.damageType" class="sel" style="width:5em" @wheel="damageStatusTypeWheel">
            <option v-for="n in damageTypeList" :key="n" :value="n">{{ n }}</option>
          </select>
          <button class="bar-btn" :class="{ active: memoryStatus.damageDef == '特殊' }" @click="toggleStatusDamageDef">
            {{ memoryStatus.damageDef }}
          </button>
          <select v-model="memoryStatus.damageAspect" class="sel" style="width:5em" @wheel="damageStatusAspectWheel">
            <option v-for="n in damageAspectList" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="field">
          自定义数值
          <VueNumberInput v-model="memoryStatus.customDamage" size="medium" :min="0" :step="1" inline center controls />
          <button v-if="memoryStatus.customDamage > 0" class="bar-btn active" @click="memoryStatus.customDamage = 0">
            应用自定义数值中
          </button>
          <strong v-if="memoryStatus.customDamage > 0">= {{ memoryStatus.customDamage }}</strong>
        </div>
        <div class="field" v-if="memoryStatus.customDamage <= 0">
          状态等级 {{ memory.defender.battleLv() }} +
          <VueNumberInput v-model="memoryStatus.battleLvD" size="medium" :step="1" inline center controls />
          = <strong>{{ battleLvStatus() }}</strong>
        </div>
        <div class="field" v-if="memoryStatus.customDamage <= 0">
          防御数值（无装备）
          <select v-model="memoryStatus.damageDefense" class="sel" style="width:5em" @wheel="damageStatusDefenseWheel">
            <option v-for="n in damageDefenseList" :key="n" :value="n">{{ n }}</option>
          </select>
          {{ memory.defender.getAttackAttributeByName(memoryStatus.damageDefense) }} +
          <VueNumberInput v-model="memoryStatus.damageDefenseD" size="medium" :step="1" inline center controls />
          = <strong>{{ damageDefenseStatus() }}</strong>
        </div>
        <div class="field">
          伤害修正
          {{ (memory.defender.typeMdf(memoryStatus.damageType) + memory.defender.typeMdf(memoryStatus.damageAspect) + memory.defender.grandStatus().grandMdf).toFixed(1) }}
          +
          <VueNumberInput v-model="memoryStatus.damageMdfD" size="medium" :step="0.1" inline center controls />
          = <strong>{{ damageMdfStatus().toFixed(1) }}</strong>
        </div>

        <div class="field flex-wrap">
          <button class="bar-btn" :class="{ active: !memoryStatus.enableCT }" @click="toggleStatusEnableCT">
            {{ memoryStatus.enableCT ? '暴击✓' : '无暴击' }}
          </button>
          <VueNumberInput v-model="memoryStatus.ctLimit" size="medium" :min="1" :max="20" :step="1" inline center controls />
          <button class="bar-btn" :class="{ active: !memoryStatus.enableMiss }" @click="toggleStatusEnableMiss">
            {{ memoryStatus.enableMiss ? '大失败✓' : '无大失败' }}
          </button>
          优势
          <VueNumberInput v-model="memoryStatus.advantageDelta" size="small" :step="1" inline center controls />
          <button class="bar-btn" @click="rollStatusd20">掷骰</button>
        </div>
        <div class="field">
          原始值
          <VueNumberInput :model-value="memoryStatus.diceroll" size="medium" :min="1" :max="20" :step="1" inline center controls
            @update:model-value="(v: number) => modifyWorldlineMemory(memoryStatus, v)" />
          + 调整 <VueNumberInput v-model="memoryStatus.dicerollD" size="medium" :step="1" inline center controls />
          = <strong>{{ statusDiceroll() }} ({{ statusDicerollPercentage() }}%)</strong>
        </div>

        <div class="field" style="font-size:x-large">
          状态伤害：{{ statusDamageResult }}
          <button class="bar-btn" @click="copyStatusMessageToClipboard">复制</button>
          <button class="bar-btn btn-danger" @click="applyStatusResult">应用</button>
        </div>
        <textarea class="log-area" readonly :value="statusMessage()" />

        <div class="field">
          专注豁免 DC = {{ memory.defender.concentrationSaveFromDamage(statusDamageResult) }}
        </div>

        <div class="field" style="font-size:x-large">
          治疗：{{ statusHealResult }}
          <button class="bar-btn" @click="copyHealStatusMessageToClipboard">复制</button>
          <button class="bar-btn btn-danger" @click="applyHealStatusResult">应用</button>
        </div>
        <textarea class="log-area" readonly :value="healStatusMessage()" />

        <div class="field" style="font-size:x-large">
          护盾：{{ statusHealResult }}
          <button class="bar-btn" @click="copyHealShieldStatusMessageToClipboard">复制</button>
          <button class="bar-btn btn-danger" @click="applyHealShieldStatusResult">应用</button>
        </div>
        <textarea class="log-area" readonly :value="healShieldStatusMessage()" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-battle {
  height: 100%;
  display: flex;
  background: #fff;
  color: #222;
}

.battle-main {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  min-width: 0;
}

.sticky-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

.bar-row {
  display: flex;
}

.bar-btn {
  border: 1px solid #ccc;
  background: #f5f5f5;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.bar-btn:hover { background: #e5e5e5; }
.bar-btn.active { background: #222; color: #fff; }
.bar-btn.half { flex: 1; width: auto; }
.bar-btn.third { flex: 1; width: auto; }
.bar-btn.btn-primary { background: #2196f3; color: #fff; border-color: #1976d2; }
.bar-btn.btn-danger { background: #e53935; color: #fff; border-color: #c62828; }

.battle-body {
  padding: 0.5em;
}

.field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3em;
  margin: 4px 0;
  font-size: 13px;
}

.flex-wrap { flex-wrap: wrap; }

.inp {
  border: 1px solid #ccc;
  padding: 2px 6px;
  font-size: 13px;
}

.sel {
  border: 1px solid #ccc;
  padding: 2px 4px;
  font-size: 13px;
  background: #fff;
}

.log-area {
  width: 100%;
  height: 6em;
  resize: vertical;
  font-size: 12px;
  border: 1px solid #e0e0e0;
  padding: 4px;
  margin: 4px 0;
  background: #fafafa;
}

/* ── 招式选择器 ── */
.move-selector {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  padding: 5px 8px;
  background: #f0f4ff;
  border-bottom: 1px solid #dde;
  font-size: 13px;
}

.move-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.move-label {
  font-weight: 600;
  white-space: nowrap;
  color: #4a6fa5;
}

.move-sel {
  flex: 1;
  min-width: 0;
}

.power-nav {
  cursor: pointer;
  user-select: none;
  padding: 1px 6px;
  border-radius: 3px;
  background: #e0e0e0;
  font-size: 11px;
}

.power-nav:hover {
  background: #bdbdbd;
}

.power-info {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

.save-shortcuts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #555;
}

.move-description {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  border: 1px solid #d7dceb;
  padding: 6px;
  background: #fff;
  font-size: 12px;
  line-height: 1.45;
}
</style>
