import { ref } from 'vue'
import { Move, MovePower, damageTypeList, damageAttackList, modifierList } from '../model/DataType'
import { d20 } from '../utils'
import { damageCalcRaw, handleHP, showHP } from '../model/Damage'
import type { Creature } from '../model/Creature'

// ═══════════════════════════════════════════════════════════
// 天气 / 场地 stub — 暂时忽略环境系统，所有返回值归零
// TODO: 将来从 OBR metadata 中读取场地信息
// ═══════════════════════════════════════════════════════════

export interface EnvModifierContribution {
  name: string
  layers: number
  value: number
  source: '天气/气候' | '场地'
}

export function envTypeMdfTotal(_elements: string[], _creature: Creature | null = null): number {
  return 0
}

export function envTypeMdfContributions(
  _elements: string[],
  _creature: Creature | null = null
): EnvModifierContribution[] {
  return []
}

export function envEffectIntensity(_elemType: string, _creature: Creature | null = null): number {
  return 0
}

// ═══════════════════════════════════════════════════════════
// BattleMemory — 战斗/治疗/状态的运算上下文
// ═══════════════════════════════════════════════════════════

export class BattleMemory {
  attacker: Creature | null
  defender: Creature | null
  attackType: number

  spellName: string
  effect: number
  costPP: number

  battleLvD: number

  spellType: string
  spellTypeStabD: number
  spellAttack: string
  spellAttackD: number
  spellAttackShield: string
  spellAttackShieldD: number
  spellMod: string
  spellModD: number

  ctLimit: number

  damageType: string
  damageAspect: string
  damageDef: string
  damageDefense: string
  damageDefenseD: number

  damageMdfD: number
  diceroll: number
  dicerollD: number
  advantageDelta: number
  rollHistory: number[]

  enableCT: number
  enableMiss: number
  enableAccuracyAdvance: number

  customDamage: number

  constructor(type: number) {
    this.attacker = null
    this.defender = null
    this.attackType = 1

    this.battleLvD = 0
    this.ctLimit = 20

    if (type != 3) {
      this.spellName = '招式名字'
    } else {
      this.spellName = '状态名字'
    }
    this.effect = 50
    this.costPP = 0
    this.spellType = '无属性'
    this.spellTypeStabD = 0
    if (type != 2) {
      this.spellAttack = '特攻'
    } else {
      this.spellAttack = '特攻'
    }
    this.spellAttackD = 0
    if (type != 2) {
      this.spellAttackShield = '特攻'
    } else {
      this.spellAttackShield = '特攻'
    }
    this.spellAttackShieldD = 0
    if (type != 2) {
      this.spellMod = '无加成'
    } else {
      this.spellMod = '感知'
    }
    this.spellModD = 0

    this.damageType = '无属性'
    this.damageAspect = '无性相'
    this.damageDef = '物理'
    this.damageDefense = '物防'
    this.damageDefenseD = 0

    this.damageMdfD = 0
    this.diceroll = 10
    this.dicerollD = 0
    this.advantageDelta = 0
    this.rollHistory = [10]
    this.customDamage = 0

    if (type == 1) {
      this.enableCT = 1
      this.enableMiss = 1
      this.enableAccuracyAdvance = 1
    } else if (type == 2) {
      this.enableCT = 1
      this.enableMiss = 0
      this.enableAccuracyAdvance = 0
    } else {
      this.enableCT = 0
      this.enableMiss = 0
      this.enableAccuracyAdvance = 0
    }
  }
}

export const battleMemory = ref<BattleMemory>(new BattleMemory(1))
export const battleMemoryHeal = ref<BattleMemory>(new BattleMemory(2))
export const battleMemoryStatus = ref<BattleMemory>(new BattleMemory(3))

// ═══════════════════════════════════════════════════════════
// MainMemory — 面板页码
// ═══════════════════════════════════════════════════════════

export class MainMemory {
  pageNumber: number
  constructor() {
    this.pageNumber = 10
  }
}

export const mainMemory = ref<MainMemory>(new MainMemory())

// ═══════════════════════════════════════════════════════════
// MoveMemory — 当前招式选择
// ═══════════════════════════════════════════════════════════

export class MoveMemory {
  selectedMove: string
  selectedPowerIdx: number
  nullCostPP: number
  dcDelta: number
  lastMoveName: string

  constructor() {
    this.selectedMove = ''
    this.selectedPowerIdx = 0
    this.nullCostPP = 0
    this.dcDelta = 0
    this.lastMoveName = ''
  }
}

export const moveMemory = ref<MoveMemory>(new MoveMemory())

export function currentMove(): Move {
  return battleMemory.value.attacker?.getMove(moveMemory.value.selectedMove) ?? new Move()
}

export function moveUseCharge(): void {
  if (battleMemory.value.attacker != null && currentMove().maxCharge > 0) {
    currentMove().charge -= 1
  }
}

// ═══════════════════════════════════════════════════════════
// 招式选择 → 自动填充战斗参数
// ═══════════════════════════════════════════════════════════

export function currentPower(): MovePower {
  return currentMove().powerList[moveMemory.value.selectedPowerIdx] ?? new MovePower(0, 0, '无属性', '特殊', '无性相', false, '')
}

export function isNoPower(): boolean {
  return currentPower().power == 0
}

export function preferredPowerIndex(): number {
  const index = currentMove().powerList.findIndex((power) => power.power > 0)
  return index >= 0 ? index : 0
}

export function currentDC(): number {
  if (battleMemory.value.attacker == null) return 10 + moveMemory.value.dcDelta
  return battleMemory.value.attacker.getMoveDC(currentMove().name) + moveMemory.value.dcDelta
}

/** 根据选中的招式 + power 段，自动填充战斗面板参数 */
export function setCurrentMove(): void {
  const thisMoveName = (battleMemory.value.attacker?.name ?? '') + currentMove().name

  moveMemory.value.dcDelta = 0
  moveMemory.value.selectedPowerIdx = Math.min(
    Math.max(0, moveMemory.value.selectedPowerIdx),
    currentMove().powerList.length - 1,
  )
  if (
    moveMemory.value.selectedPowerIdx < 0 ||
    moveMemory.value.selectedPowerIdx >= currentMove().powerList.length
  ) {
    return
  }

  const mov = currentMove()
  const pwr = mov.powerList[moveMemory.value.selectedPowerIdx]

  // 从 extra 中解析 PP 覆盖
  let costPPOverride = mov.costPP
  const ppRgx = /([0-9]+)[Pp][Pp]/
  const ppRes = ppRgx.exec(pwr.extra)
  if (ppRes) costPPOverride = Number(ppRes[1])

  // 从 extra 中解析属性覆盖
  let elemTypeOverride = mov.elemType
  for (const i of damageTypeList) {
    if (pwr.extra.includes(i)) elemTypeOverride = i
  }

  // 从 extra 中解析攻击数值覆盖
  let spellAttackOverride = pwr.psType == '物理' ? '物攻' : '特攻'
  for (const i of damageAttackList) {
    if (pwr.extra.includes(i)) spellAttackOverride = i
  }

  // 从 extra 中解析加值覆盖
  let spellModOverride = mov.castAbility
  for (const i of modifierList) {
    if (pwr.extra.includes(i)) spellModOverride = i
  }

  // 优劣势
  let advantageOverride: number | null = null
  const advMatch = pwr.extra.match(/([0-9]+)\s*优势/)
  const disMatch = pwr.extra.match(/([0-9]+)\s*劣势/)
  if (advMatch) advantageOverride = Number(advMatch[1])
  else if (disMatch) advantageOverride = -Number(disMatch[1])

  const damageDefense = pwr.psType == '物理' ? '物防' : '特防'

  // 没有目标时只记录 PP；0 威力招式仍进入对应子页并按威力 0 计算。
  if (battleMemory.value.defender == null) {
    battleMemory.value.attackType = 0
    if (mov.name) {
      battleMemory.value.spellName = mov.name
      battleMemoryHeal.value.spellName = mov.name
      battleMemoryStatus.value.spellName = mov.name
    }
    moveMemory.value.nullCostPP = costPPOverride
    return
  }

  // ── 状态招式 → attackType = 3 ──
  if (pwr.isStatus && pwr.power > 0) {
    battleMemory.value.attackType = 3
    battleMemoryStatus.value.costPP = costPPOverride
    battleMemoryStatus.value.battleLvD = 0
    battleMemoryStatus.value.ctLimit = 20
    battleMemoryStatus.value.spellName = mov.name
    battleMemoryStatus.value.effect = pwr.power
    battleMemoryStatus.value.spellType = elemTypeOverride
    battleMemoryStatus.value.spellTypeStabD = 0
    battleMemoryStatus.value.spellAttack = spellAttackOverride
    battleMemoryStatus.value.spellAttackD = 0
    battleMemoryStatus.value.spellMod = spellModOverride
    battleMemoryStatus.value.spellModD = 0
    battleMemoryStatus.value.damageType = pwr.elemType
    battleMemoryStatus.value.damageAspect = pwr.aspect
    battleMemoryStatus.value.damageDef = pwr.psType
    battleMemoryStatus.value.damageDefense = damageDefense
    battleMemoryStatus.value.damageDefenseD = 0
    if (thisMoveName != moveMemory.value.lastMoveName) {
      battleMemoryStatus.value.damageMdfD = 0
      battleMemoryStatus.value.dicerollD = 0
      battleMemoryStatus.value.diceroll = 10
      battleMemoryStatus.value.advantageDelta = advantageOverride ?? 0
      battleMemoryStatus.value.rollHistory = [battleMemoryStatus.value.diceroll]
    }
    battleMemoryStatus.value.customDamage = 0
    battleMemoryStatus.value.enableCT = 0
    battleMemoryStatus.value.enableMiss = 0
    battleMemoryStatus.value.enableAccuracyAdvance = 0
  }
  // ── 伤害招式 → attackType = 1 ──
  else if (damageTypeList.includes(pwr.elemType) || pwr.power == 0) {
    if (battleMemory.value.attacker == null) return
    battleMemory.value.attackType = 1
    battleMemory.value.costPP = costPPOverride
    battleMemory.value.battleLvD = 0
    battleMemory.value.ctLimit = 20
    battleMemory.value.spellName = mov.name
    battleMemory.value.effect = pwr.power
    battleMemory.value.spellType = elemTypeOverride
    battleMemory.value.spellTypeStabD = 0
    battleMemory.value.spellAttack = spellAttackOverride
    battleMemory.value.spellAttackD = 0
    battleMemory.value.spellMod = spellModOverride
    battleMemory.value.spellModD = 0
    battleMemory.value.damageType = pwr.elemType
    battleMemory.value.damageAspect = pwr.aspect
    battleMemory.value.damageDef = pwr.psType
    battleMemory.value.damageDefense = damageDefense
    battleMemory.value.damageDefenseD = 0
    if (thisMoveName != moveMemory.value.lastMoveName) {
      battleMemory.value.damageMdfD = 0
      battleMemory.value.dicerollD = 0
      battleMemory.value.diceroll = battleMemory.value.defender?.grandStatus().autoCrit ? 20 : 10
      battleMemory.value.advantageDelta = advantageOverride ?? 0
      battleMemory.value.rollHistory = [battleMemory.value.diceroll]
    }
    battleMemory.value.customDamage = 0
    battleMemory.value.enableCT = 1
    battleMemory.value.enableMiss = 1
    battleMemory.value.enableAccuracyAdvance = 1
  }
  // ── 治疗/护盾招式 → attackType = 2 ──
  else {
    if (battleMemory.value.attacker == null) return
    battleMemory.value.attackType = 2
    battleMemoryHeal.value.costPP = costPPOverride
    battleMemoryHeal.value.battleLvD = 100 - battleMemory.value.attacker.battleLv()
    battleMemoryHeal.value.ctLimit = 20
    battleMemoryHeal.value.spellName = mov.name
    battleMemoryHeal.value.effect = pwr.power
    battleMemoryHeal.value.spellType = elemTypeOverride
    battleMemoryHeal.value.spellTypeStabD = 0
    battleMemoryHeal.value.spellAttack = '特攻'
    battleMemoryHeal.value.spellAttackShield = '特攻'
    for (const i of damageAttackList) {
      if (pwr.extra.includes(i)) {
        battleMemoryHeal.value.spellAttack = i
        battleMemoryHeal.value.spellAttackShield = i
      }
    }
    battleMemoryHeal.value.spellAttackD = 0
    battleMemoryHeal.value.spellAttackShieldD = 0
    battleMemoryHeal.value.spellMod = spellModOverride
    battleMemoryHeal.value.spellModD = 0
    battleMemoryHeal.value.damageType = pwr.elemType
    battleMemoryHeal.value.damageAspect = pwr.aspect
    battleMemoryHeal.value.damageDef = pwr.psType
    battleMemoryHeal.value.damageDefense = damageDefense
    battleMemoryHeal.value.damageDefenseD = 0
    if (thisMoveName != moveMemory.value.lastMoveName) {
      battleMemoryHeal.value.damageMdfD = 0
      battleMemoryHeal.value.dicerollD = 0
      battleMemoryHeal.value.diceroll = 10
      battleMemoryHeal.value.advantageDelta = advantageOverride ?? 0
      battleMemoryHeal.value.rollHistory = [battleMemoryHeal.value.diceroll]
    }
    battleMemoryHeal.value.customDamage = 0
    battleMemoryHeal.value.enableCT = 1
    battleMemoryHeal.value.enableMiss = 0
    battleMemoryHeal.value.enableAccuracyAdvance = 0
  }

  moveMemory.value.lastMoveName = thisMoveName
}

// ═══════════════════════════════════════════════════════════
// 选择角色
// ═══════════════════════════════════════════════════════════

export function onChangeSelectedCreature(
  creatures: Creature[],
  code: string
): void {
  const index = creatures.findIndex((creature) => creature.code() == code)
  if (index < 0) return

  if (battleMemory.value.attacker == null) {
    battleMemory.value.attacker = creatures[index]
    battleMemory.value.attacker.shallowRefresh()
    battleMemoryHeal.value.battleLvD = 100 - battleMemory.value.attacker.battleLv()
  } else {
    battleMemory.value.defender = creatures[index]
    battleMemory.value.defender.shallowRefresh()
    if (battleMemory.value.defender.grandStatus().autoCrit) {
      battleMemory.value.diceroll = 20
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 攻防类型切换
// ═══════════════════════════════════════════════════════════

export function removeAttacker(): void {
  battleMemory.value.attacker = null
}

export function removeDefender(): void {
  battleMemory.value.defender = null
}

export function toggleAttackType(value: number): void {
  battleMemory.value.attackType = value
  const moveName = currentMove().name
  if (!moveName) return
  if (value == 1) battleMemory.value.spellName = moveName
  else if (value == 2) battleMemoryHeal.value.spellName = moveName
  else if (value == 3) battleMemoryStatus.value.spellName = moveName
}

function toggleDamageDefGeneric(memory: BattleMemory): void {
  if (memory.damageDef == '物理') {
    memory.damageDef = '特殊'
    memory.damageDefense = '特防'
    if (memory.spellAttack) {
      memory.spellAttack = '特攻'
    }
  } else {
    memory.damageDef = '物理'
    memory.damageDefense = '物防'
    if (memory.spellAttack) {
      memory.spellAttack = '物攻'
    }
  }
  memory.spellType = memory.damageType
}

export function toggleDamageDef(): void {
  toggleDamageDefGeneric(battleMemory.value)
}

export function toggleStatusDamageDef(): void {
  toggleDamageDefGeneric(battleMemoryStatus.value)
}

// ═══════════════════════════════════════════════════════════
// flag 切换
// ═══════════════════════════════════════════════════════════

function toggleGenericFlag(memory: BattleMemory, flagName: keyof BattleMemory): void {
  const flags = memory as unknown as Record<string, number>
  flags[flagName] = 1 - flags[flagName]
}

export function toggleEnableCT(): void {
  toggleGenericFlag(battleMemory.value, 'enableCT')
}
export function toggleEnableMiss(): void {
  toggleGenericFlag(battleMemory.value, 'enableMiss')
}
export function toggleHealEnableCT(): void {
  toggleGenericFlag(battleMemoryHeal.value, 'enableCT')
}
export function toggleHealEnableMiss(): void {
  toggleGenericFlag(battleMemoryHeal.value, 'enableMiss')
}
export function toggleStatusEnableCT(): void {
  toggleGenericFlag(battleMemoryStatus.value, 'enableCT')
}
export function toggleStatusEnableMiss(): void {
  toggleGenericFlag(battleMemoryStatus.value, 'enableMiss')
}
export function toggleEnableAccuracyAdvance(): void {
  toggleGenericFlag(battleMemory.value, 'enableAccuracyAdvance')
}

// ═══════════════════════════════════════════════════════════
// 骰子
// ═══════════════════════════════════════════════════════════

function advRollMemory(memory: BattleMemory): void {
  const n = 1 + Math.abs(memory.advantageDelta)
  const rolls = Array.from({ length: n }, () => d20())
  memory.rollHistory = rolls
  memory.diceroll =
    memory.advantageDelta > 0
      ? Math.max(...rolls)
      : memory.advantageDelta < 0
        ? Math.min(...rolls)
        : rolls[0]
}

export function modifyWorldlineMemory(memory: BattleMemory, newValue: number): void {
  const n = memory.rollHistory.length
  if (n <= 1) {
    memory.diceroll = newValue
    memory.rollHistory = [newValue]
    return
  }
  const isAdv = memory.advantageDelta > 0
  const rolls: number[] = []
  for (let i = 0; i < n; i++) {
    rolls.push(
      isAdv
        ? Math.floor(Math.random() * newValue) + 1
        : Math.floor(Math.random() * (21 - newValue)) + newValue
    )
  }
  rolls[Math.floor(Math.random() * n)] = newValue
  memory.rollHistory = rolls
  memory.diceroll = isAdv ? Math.max(...rolls) : Math.min(...rolls)
}

export function rolld20(): void {
  advRollMemory(battleMemory.value)
}
export function rollHeald20(): void {
  advRollMemory(battleMemoryHeal.value)
}
export function rollStatusd20(): void {
  advRollMemory(battleMemoryStatus.value)
}

// ═══════════════════════════════════════════════════════════
// 伤害公式辅助计算
// ═══════════════════════════════════════════════════════════

function calculateBattleLvGeneric(memory: BattleMemory, character: Creature | null): number {
  if (!isFinite(memory.battleLvD)) memory.battleLvD = 0
  if (character != null) {
    return Math.max(1, Math.floor(character.battleLv() + memory.battleLvD))
  }
  return 0
}

export function battleLv(): number {
  return calculateBattleLvGeneric(battleMemory.value, battleMemory.value.attacker)
}
export function battleLvHeal(): number {
  return calculateBattleLvGeneric(battleMemoryHeal.value, battleMemory.value.attacker)
}
export function battleLvStatus(): number {
  return calculateBattleLvGeneric(battleMemoryStatus.value, battleMemory.value.defender)
}

function calculateGenericStab(memory: BattleMemory, attacker: Creature | null): number {
  if (!isFinite(memory.spellTypeStabD)) memory.spellTypeStabD = 0
  if (attacker != null) {
    return Math.floor(attacker.typeStab(memory.spellType) + memory.spellTypeStabD)
  }
  return 0
}

function calculateGenericMod(memory: BattleMemory, attacker: Creature | null): number {
  if (!isFinite(memory.spellModD)) memory.spellModD = 0
  if (attacker != null) {
    return Math.floor(attacker.getModifierByName(memory.spellMod) + memory.spellModD)
  }
  return 0
}

export function spellTypeStab(): number {
  return calculateGenericStab(battleMemory.value, battleMemory.value.attacker)
}
export function spellTypeStabHeal(): number {
  return calculateGenericStab(battleMemoryHeal.value, battleMemory.value.attacker)
}
export function spellModifier(): number {
  return calculateGenericMod(battleMemory.value, battleMemory.value.attacker)
}
export function spellModifierHeal(): number {
  return calculateGenericMod(battleMemoryHeal.value, battleMemory.value.attacker)
}

function calcSpellAttackValue(
  spellAttack: string,
  spellAttackD: number,
  attacker: Creature | null
): number {
  if (!isFinite(spellAttackD)) spellAttackD = 0
  if (attacker != null) {
    return Math.max(1, Math.floor(attacker.getAttackAttributeByName(spellAttack) + spellAttackD))
  }
  return 0
}

function calculateSpellAttackGeneric(memory: BattleMemory, attacker: Creature | null): number {
  return calcSpellAttackValue(memory.spellAttack, memory.spellAttackD, attacker)
}

export function spellAttack(): number {
  return calculateSpellAttackGeneric(battleMemory.value, battleMemory.value.attacker)
}
export function spellAttackHeal(): number {
  return calculateSpellAttackGeneric(battleMemoryHeal.value, battleMemory.value.attacker)
}
export function spellAttackHealShield(): number {
  return calcSpellAttackValue(
    battleMemoryHeal.value.spellAttackShield,
    battleMemoryHeal.value.spellAttackShieldD,
    battleMemory.value.attacker
  )
}

// ═══════════════════════════════════════════════════════════
// 伤害修正 / 防御计算
// ═══════════════════════════════════════════════════════════

function calculateDamageMdfGeneric(
  memory: BattleMemory,
  defender: Creature | null,
  attacker: Creature | null = battleMemory.value.attacker
): number {
  if (!isFinite(memory.damageMdfD)) memory.damageMdfD = 0
  if (defender != null) {
    return (
      defender.typeMdf(memory.damageType) +
      defender.typeMdf(memory.damageAspect) +
      defender.grandStatus().grandMdf +
      envTypeMdfTotal([memory.damageType, memory.damageAspect], attacker) +
      memory.damageMdfD
    )
  }
  return memory.damageMdfD + envTypeMdfTotal([memory.damageType, memory.damageAspect], attacker)
}

export function damageMdf(): number {
  return calculateDamageMdfGeneric(battleMemory.value, battleMemory.value.defender)
}
export function damageMdfStatus(): number {
  return calculateDamageMdfGeneric(battleMemoryStatus.value, battleMemory.value.defender)
}
export function damageMdfStatusHeal(): number {
  return calculateDamageMdfGeneric(battleMemoryStatus.value, null)
}
export function healMdf(): number {
  return calculateDamageMdfGeneric(battleMemoryHeal.value, null)
}

function calculateDamageDefenseGeneric(
  memory: BattleMemory,
  defender: Creature | null,
  equip: boolean = true
): number {
  if (!isFinite(memory.damageDefenseD)) memory.damageDefenseD = 0
  if (defender != null) {
    return Math.max(
      1,
      Math.floor(
        (equip
          ? defender.getAttributeByName(memory.damageDefense)
          : defender.getAttackAttributeByName(memory.damageDefense)) + memory.damageDefenseD
      )
    )
  }
  return 0
}

export function damageDefense(): number {
  return calculateDamageDefenseGeneric(battleMemory.value, battleMemory.value.defender)
}
export function damageDefenseStatus(): number {
  return calculateDamageDefenseGeneric(battleMemoryStatus.value, battleMemory.value.defender, false)
}

export function accuracyAdvance(): number {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    const v = battleMemory.value.attacker.accuracy() - battleMemory.value.defender.evasion()
    if (
      battleMemory.value.enableAccuracyAdvance &&
      battleMemory.value.diceroll < battleMemory.value.ctLimit
    ) {
      return v
    } else {
      return Math.max(0, v)
    }
  }
  return 0
}

// ═══════════════════════════════════════════════════════════
// 掷骰结果
// ═══════════════════════════════════════════════════════════

export function attackDiceroll(): number {
  if (!isFinite(battleMemory.value.dicerollD)) battleMemory.value.dicerollD = 0
  return (
    battleMemory.value.diceroll + battleMemory.value.dicerollD + accuracyAdvance() + spellModifier()
  )
}

export function healDiceroll(): number {
  if (!isFinite(battleMemoryHeal.value.dicerollD)) battleMemoryHeal.value.dicerollD = 0
  return battleMemoryHeal.value.diceroll + battleMemoryHeal.value.dicerollD + spellModifierHeal()
}

export function statusDiceroll(): number {
  if (!isFinite(battleMemoryStatus.value.dicerollD)) battleMemoryStatus.value.dicerollD = 0
  return battleMemoryStatus.value.diceroll + battleMemoryStatus.value.dicerollD
}

export function dicePct(
  diceroll: number,
  dicerollD: number,
  bonus: number,
  enableCT: number,
  ctLimit: number,
  enableMiss: number
): { roll: number; rollPct: number } {
  const roll = diceroll + dicerollD + bonus
  let rollPct = roll * 5
  if (enableCT && diceroll >= ctLimit) rollPct += 50
  if (enableMiss && diceroll <= 1) rollPct = 0
  return { roll, rollPct: Math.max(0, rollPct) }
}

function calculateDicerollPercentageGeneric(
  baseRollFunc: () => number,
  memory: BattleMemory
): number {
  const { rollPct } = dicePct(
    memory.diceroll,
    memory.dicerollD,
    baseRollFunc() - memory.diceroll - memory.dicerollD,
    memory.enableCT,
    memory.ctLimit,
    memory.enableMiss
  )
  return rollPct
}

export function attackDicerollPercentage(): number {
  return calculateDicerollPercentageGeneric(attackDiceroll, battleMemory.value)
}
export function healDicerollPercentage(): number {
  return calculateDicerollPercentageGeneric(healDiceroll, battleMemoryHeal.value)
}
export function statusDicerollPercentage(): number {
  return calculateDicerollPercentageGeneric(statusDiceroll, battleMemoryStatus.value)
}

// ═══════════════════════════════════════════════════════════
// 伤害 / 治疗 / 状态 计算
// ═══════════════════════════════════════════════════════════

export function damageCalc(): number {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    return damageCalcRaw(
      battleMemory.value.effect,
      battleLv(),
      spellAttack(),
      damageDefense(),
      spellTypeStab(),
      damageMdf(),
      attackDicerollPercentage()
    )
  }
  return 0
}

export function healCalc(): number {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    return damageCalcRaw(
      battleMemoryHeal.value.effect,
      battleLv() + battleMemoryHeal.value.battleLvD,
      spellAttackHeal(),
      200,
      spellTypeStabHeal(),
      healMdf(),
      healDicerollPercentage()
    )
  }
  return 0
}

export function healShieldCalc(): number {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    return damageCalcRaw(
      battleMemoryHeal.value.effect,
      battleLv() + battleMemoryHeal.value.battleLvD,
      spellAttackHealShield(),
      200,
      spellTypeStabHeal(),
      healMdf(),
      healDicerollPercentage()
    )
  }
  return 0
}

export function statusCalc(heal: boolean = false): number {
  if (!isFinite(battleMemoryStatus.value.customDamage)) battleMemoryStatus.value.customDamage = 0
  battleMemoryStatus.value.customDamage = Math.floor(battleMemoryStatus.value.customDamage)
  if (battleMemory.value.defender != null) {
    if (battleMemoryStatus.value.customDamage > 0) {
      return damageCalcRaw(
        battleMemoryStatus.value.customDamage,
        100,
        1,
        1,
        0,
        damageMdfStatus(),
        100
      )
    }
    if (heal) {
      return damageCalcRaw(
        battleMemoryStatus.value.effect,
        battleLvStatus(),
        1,
        1,
        0,
        damageMdfStatusHeal(),
        statusDicerollPercentage()
      )
    } else {
      return damageCalcRaw(
        battleMemoryStatus.value.effect,
        battleLvStatus(),
        battleLvStatus() * 2,
        damageDefenseStatus(),
        0,
        damageMdfStatus(),
        statusDicerollPercentage()
      )
    }
  }
  return 0
}

export function getAttackAdvantage(mod: string): number {
  let res = 0
  if (battleMemory.value.attacker != null) {
    res += battleMemory.value.attacker.getAttackAdvantageWithStatus(mod)
  }
  if (battleMemory.value.defender != null) {
    res += battleMemory.value.defender.getUnderAttackAdvantageWithStatus()
  }
  return res
}

// ═══════════════════════════════════════════════════════════
// 消息 / 剪贴板
// ═══════════════════════════════════════════════════════════

export function castMessage(spellName: string, ppCost: number): string {
  if (battleMemory.value.attacker != null) {
    const at = battleMemory.value.attacker.name()
    const df = battleMemory.value.defender ? battleMemory.value.defender.name() : '目标'
    const ppCostLog =
      ppCost != 0
        ? `（PP ${battleMemory.value.attacker.currentPP} -> ${battleMemory.value.attacker.currentPP - ppCost}）`
        : ''
    return `${at}对${df}使用了${spellName}${ppCostLog}。`
  }
  return ''
}

export function diceHistoryLines(
  memory: BattleMemory,
  attacker: string,
  spellName: string,
  bonus: number
): string {
  const lines: string[] = []
  for (const v of memory.rollHistory) {
    const { roll, rollPct } = dicePct(
      v,
      memory.dicerollD*0,//应Z要求
      bonus,
      memory.enableCT,
      memory.ctLimit,
      memory.enableMiss
    )
    lines.push(
      `【骰子】(${attacker}：${spellName})[${rollPct}%]D20${bonus > 0 ? '+' : ''}${bonus != 0 ? bonus : ''}=${roll}`
    )
  }
  return lines.join('\n')
}

export function damageMessage(
  damageType: string,
  damageDef: string,
  damageAspect: string,
  dmg: number
): string {
  if (battleMemory.value.defender != null) {
    const df = battleMemory.value.defender.name()
    if (dmg <= 0) {
      return `${df}没有受到伤害。`
    } else {
      const hp = [battleMemory.value.defender.currentHP, battleMemory.value.defender.tempHP]
      return `${df}受到了 ${dmg} ${damageType}${damageDef}${damageAspect == '无性相' ? '' : damageAspect}伤害（HP ${showHP(hp)} -> ${showHP(handleHP(hp, battleMemory.value.defender.maxHP(), [-dmg, 0]))}）。`
    }
  }
  return ''
}

export function attackMessage(): string {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    const bonus = attackDiceroll() - battleMemory.value.diceroll
    const hist = diceHistoryLines(
      battleMemory.value,
      battleMemory.value.attacker.name(),
      battleMemory.value.spellName,
      bonus
    )
    return (
      castMessage(battleMemory.value.spellName, battleMemory.value.costPP) +
      '\n' +
      hist +
      '\n' +
      damageMessage(
        battleMemory.value.damageType,
        battleMemory.value.damageDef,
        battleMemory.value.damageAspect,
        damageCalc()
      )
    )
  }
  return ''
}

export function healMessage(): string {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    const df = battleMemory.value.defender.name()
    const heal = healCalc()
    const hp = [battleMemory.value.defender.currentHP, battleMemory.value.defender.tempHP]
    const bonus = healDiceroll() - battleMemoryHeal.value.diceroll
    const hist = diceHistoryLines(
      battleMemoryHeal.value,
      battleMemory.value.attacker.name(),
      battleMemoryHeal.value.spellName,
      bonus
    )
    return (
      castMessage(battleMemoryHeal.value.spellName, battleMemoryHeal.value.costPP) +
      '\n' +
      hist +
      '\n' +
      `${df}回复了 ${heal} HP（HP ${showHP(hp)} -> ${showHP(handleHP(hp, battleMemory.value.defender.maxHP(), [heal, 0]))}）。`
    )
  }
  return ''
}

export function healShieldMessage(): string {
  if (battleMemory.value.attacker != null && battleMemory.value.defender != null) {
    const df = battleMemory.value.defender.name()
    const heal = healShieldCalc()
    const hp = [battleMemory.value.defender.currentHP, battleMemory.value.defender.tempHP]
    const bonus = healDiceroll() - battleMemoryHeal.value.diceroll
    const hist = diceHistoryLines(
      battleMemoryHeal.value,
      battleMemory.value.attacker.name(),
      battleMemoryHeal.value.spellName,
      bonus
    )
    return (
      castMessage(battleMemoryHeal.value.spellName, battleMemoryHeal.value.costPP) +
      '\n' +
      hist +
      '\n' +
      `${df}获得了 ${heal} 护盾（HP ${showHP(hp)} -> ${showHP(handleHP(hp, battleMemory.value.defender.maxHP(), [0, heal]))}）。`
    )
  }
  return ''
}

export function statusMessage(): string {
  if (battleMemory.value.defender != null) {
    const name = battleMemory.value.attacker?.name() ?? battleMemory.value.defender.name()
    const bonus = statusDiceroll() - battleMemoryStatus.value.diceroll
    const hist = diceHistoryLines(
      battleMemoryStatus.value,
      name,
      battleMemoryStatus.value.spellName,
      bonus
    )
    return (
      (battleMemory.value.attacker != null
        ? castMessage(battleMemoryStatus.value.spellName, battleMemoryStatus.value.costPP) + '\n'
        : '') +
      hist +
      '\n' +
      damageMessage(
        battleMemoryStatus.value.damageType,
        battleMemoryStatus.value.damageDef,
        battleMemoryStatus.value.damageAspect,
        statusCalc(false)
      )
    )
  }
  return ''
}

export function healStatusMessage(): string {
  if (battleMemory.value.defender != null) {
    const df = battleMemory.value.defender.name()
    const heal = statusCalc(true)
    const hp = [battleMemory.value.defender.currentHP, battleMemory.value.defender.tempHP]
    const name = battleMemory.value.attacker?.name() ?? df
    const bonus = statusDiceroll() - battleMemoryStatus.value.diceroll
    const hist = diceHistoryLines(
      battleMemoryStatus.value,
      name,
      battleMemoryStatus.value.spellName,
      bonus
    )
    return (
      (battleMemory.value.attacker != null
        ? castMessage(battleMemoryStatus.value.spellName, battleMemoryStatus.value.costPP) + '\n'
        : '') +
      hist +
      '\n' +
      `${df}回复了 ${heal} HP（HP ${showHP(hp)} -> ${showHP(handleHP(hp, battleMemory.value.defender.maxHP(), [heal, 0]))}）。`
    )
  }
  return ''
}

export function healShieldStatusMessage(): string {
  if (battleMemory.value.defender != null) {
    const df = battleMemory.value.defender.name()
    const heal = statusCalc(true)
    const hp = [battleMemory.value.defender.currentHP, battleMemory.value.defender.tempHP]
    const name = battleMemory.value.attacker?.name() ?? df
    const bonus = statusDiceroll() - battleMemoryStatus.value.diceroll
    const hist = diceHistoryLines(
      battleMemoryStatus.value,
      name,
      battleMemoryStatus.value.spellName,
      bonus
    )
    return (
      (battleMemory.value.attacker != null
        ? castMessage(battleMemoryStatus.value.spellName, battleMemoryStatus.value.costPP) + '\n'
        : '') +
      hist +
      '\n' +
      `${df}获得了 ${heal} 护盾（HP ${showHP(hp)} -> ${showHP(handleHP(hp, battleMemory.value.defender.maxHP(), [0, heal]))}）。`
    )
  }
  return ''
}

// ═══════════════════════════════════════════════════════════
// 剪贴板 / 应用结果
// ═══════════════════════════════════════════════════════════

export function copyAttackMessageToClipboard(): void {
  navigator.clipboard.writeText(attackMessage())
}
export function copyHealMessageToClipboard(): void {
  navigator.clipboard.writeText(healMessage())
}
export function copyHealShieldMessageToClipboard(): void {
  navigator.clipboard.writeText(healShieldMessage())
}
export function copyStatusMessageToClipboard(): void {
  navigator.clipboard.writeText(statusMessage())
}
export function copyHealStatusMessageToClipboard(): void {
  navigator.clipboard.writeText(healStatusMessage())
}
export function copyHealShieldStatusMessageToClipboard(): void {
  navigator.clipboard.writeText(healShieldStatusMessage())
}

export function applyAttackResult(): void {
  if (battleMemory.value.attacker == null || battleMemory.value.defender == null) return
  navigator.clipboard.writeText(attackMessage())
  battleMemory.value.attacker.takePP(-battleMemory.value.costPP)
  battleMemory.value.defender.takeHP([-damageCalc(), 0])
  moveUseCharge()
}

export function applyHealResult(): void {
  if (battleMemory.value.attacker == null || battleMemory.value.defender == null) return
  navigator.clipboard.writeText(healMessage())
  battleMemory.value.attacker.takePP(-battleMemoryHeal.value.costPP)
  battleMemory.value.defender.takeHP([healCalc(), 0])
  moveUseCharge()
}

export function applyHealShieldResult(): void {
  if (battleMemory.value.attacker == null || battleMemory.value.defender == null) return
  navigator.clipboard.writeText(healShieldMessage())
  battleMemory.value.attacker.takePP(-battleMemoryHeal.value.costPP)
  battleMemory.value.defender.takeHP([0, healShieldCalc()])
  moveUseCharge()
}

export function applyStatusResult(): void {
  if (battleMemory.value.defender == null) return
  navigator.clipboard.writeText(statusMessage())
  if (battleMemory.value.attacker != null) {
    battleMemory.value.attacker.takePP(-battleMemoryStatus.value.costPP)
  }
  battleMemory.value.defender.takeHP([-statusCalc(false), 0])
  moveUseCharge()
}

export function applyHealStatusResult(): void {
  if (battleMemory.value.defender == null) return
  navigator.clipboard.writeText(healStatusMessage())
  if (battleMemory.value.attacker != null) {
    battleMemory.value.attacker.takePP(-battleMemoryStatus.value.costPP)
  }
  battleMemory.value.defender.takeHP([statusCalc(true), 0])
  moveUseCharge()
}

export function applyHealShieldStatusResult(): void {
  if (battleMemory.value.defender == null) return
  navigator.clipboard.writeText(healShieldStatusMessage())
  if (battleMemory.value.attacker != null) {
    battleMemory.value.attacker.takePP(-battleMemoryStatus.value.costPP)
  }
  battleMemory.value.defender.takeHP([0, statusCalc(true)])
  moveUseCharge()
}
