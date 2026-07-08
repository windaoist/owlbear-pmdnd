import OBR from '@owlbear-rodeo/sdk'
import {
  Ability,
  Attribute,
  BattleAbility,
  ElemType,
  Equipment,
  ExtraResist,
  Feature,
  Item,
  Move,
  MovePower,
  Profile,
  Race,
  SizeAbility,
  Skill,
  Status,
  tagSet,
} from '../model/DataType'
import { Creature } from '../model/Creature'
import { ResistManager, StatusManager } from '../model/StatusManager'
import { battleMemory, battleMemoryHeal, battleMemoryStatus, BattleMemory, moveMemory, MoveMemory } from './battleStore'
import { checkMemory, CheckMemory } from './checkStore'
import { initiativeMemory, InitiativeMemory } from './initiativeStore'
import { useCreatureStore } from './creatureStore'

const ROOM_METADATA_KEY = 'top.iqimi.owl-pm/state'
const ROOM_METADATA_CHUNK_PREFIX = 'top.iqimi.owl-pm/state/chunk/'
const ROOM_METADATA_CHUNK_SIZE = 10_000
const SAVE_VERSION = 1

interface BattleMemorySave extends Omit<BattleMemory, 'attacker' | 'defender'> {
  attackerCode: string
  defenderCode: string
}

interface AppSaveData {
  version: number
  savedAt: string
  creatures: unknown[]
  battle: {
    attack: BattleMemorySave
    heal: BattleMemorySave
    status: BattleMemorySave
    move: MoveMemory
  }
  check: Omit<CheckMemory, 'chosen'> & { chosen: string[] }
  initiative: InitiativeMemory
}

function setProto<T extends object>(value: unknown, proto: new (...args: never[]) => T): T {
  const obj = (value && typeof value === 'object' ? value : {}) as T
  Object.setPrototypeOf(obj, proto.prototype)
  return obj
}

function reviveAttribute(value: unknown): Attribute {
  return setProto(value, Attribute)
}

function reviveAbility(value: unknown): Ability {
  return setProto(value, Ability)
}

function reviveBattleAbility(value: unknown): BattleAbility {
  return setProto(value, BattleAbility)
}

function reviveElemType(value: unknown): ElemType {
  return setProto(value, ElemType)
}

function reviveSkill(value: unknown): Skill {
  return setProto(value, Skill)
}

function reviveMovePower(value: unknown): MovePower {
  return setProto(value, MovePower)
}

function reviveStatus(value: unknown): Status {
  const status = setProto(value, Status)
  status.typeMdf = reviveElemType(status.typeMdf)
  status.attributeMdf = reviveAttribute(status.attributeMdf)
  status.abilityMdf = reviveAbility(status.abilityMdf)
  status.battleAbilityMdf = reviveBattleAbility(status.battleAbilityMdf)
  status.abilityMoveMdf = reviveAbility(status.abilityMoveMdf)
  status.abilityCheckMdf = reviveAbility(status.abilityCheckMdf)
  status.abilitySaveMdf = reviveAbility(status.abilitySaveMdf)
  status.damageOnTurn = Array.isArray(status.damageOnTurn) ? status.damageOnTurn.map(reviveMovePower) : []
  status.validate()
  return status
}

function reviveStatusManager(value: unknown): StatusManager {
  const manager = setProto(value, StatusManager)
  manager.status = Array.isArray(manager.status) ? manager.status.map(reviveStatus) : []
  return manager
}

function reviveExtraResist(value: unknown): ExtraResist {
  const resist = setProto(value, ExtraResist)
  resist.validate()
  return resist
}

function reviveResistManager(value: unknown): ResistManager {
  const manager = setProto(value, ResistManager)
  manager.resist = Array.isArray(manager.resist) ? manager.resist.map(reviveExtraResist) : []
  return manager
}

function reviveMove(value: unknown): Move {
  const move = setProto(value, Move)
  move.powerList = Array.isArray(move.powerList) ? move.powerList.map(reviveMovePower) : []
  move.validate()
  return move
}

function reviveFeature(value: unknown): Feature {
  return setProto(value, Feature)
}

function reviveEquipment(value: unknown): Equipment {
  const equipment = setProto(value, Equipment)
  equipment.tags = tagSet(equipment.tags)
  equipment.validate()
  return equipment
}

function reviveItem(value: unknown): Item {
  const item = setProto(value, Item)
  item.tags = tagSet(item.tags)
  item.validate()
  return item
}

function reviveRace(value: unknown): Race {
  const race = setProto(value, Race)
  race.attribute = reviveAttribute(race.attribute)
  race.validate()
  return race
}

export function reviveCreature(value: unknown): Creature {
  const creature = setProto(value, Creature)
  creature.profile = setProto(creature.profile, Profile)
  creature.races = Array.isArray(creature.races) ? creature.races.map(reviveRace) : []
  creature.attributeDBase = reviveAttribute(creature.attributeDBase)
  creature.attributeDEquip = reviveAttribute(creature.attributeDEquip)
  creature.attributeChange = reviveAttribute(creature.attributeChange)
  creature.attributeDChange = reviveAttribute(creature.attributeDChange)
  creature.attributeChangeBase = reviveAttribute(creature.attributeChangeBase)
  creature.abilityBase = reviveAbility(creature.abilityBase)
  creature.abilitySave = reviveAbility(creature.abilitySave)
  creature.abilityBaseD = reviveAbility(creature.abilityBaseD)
  creature.abilitySaveD = reviveAbility(creature.abilitySaveD)
  creature.battleAbilityDBase = reviveBattleAbility(creature.battleAbilityDBase)
  creature.battleAbilityDEquip = reviveBattleAbility(creature.battleAbilityDEquip)
  creature.battleAbilityDState = reviveBattleAbility(creature.battleAbilityDState)
  creature.battleAbilityDChange = reviveBattleAbility(creature.battleAbilityDChange)
  creature.sizeAbility = setProto(creature.sizeAbility, SizeAbility)
  creature.skillPro = reviveSkill(creature.skillPro)
  creature.skillRace = reviveSkill(creature.skillRace)
  creature.skillEquip = reviveSkill(creature.skillEquip)
  creature.skillState = reviveSkill(creature.skillState)
  creature.skillDChange = reviveSkill(creature.skillDChange)
  creature.skillAdvance = reviveSkill(creature.skillAdvance)
  creature.skillMin = reviveSkill(creature.skillMin)
  creature.typeRace = reviveElemType(creature.typeRace)
  creature.typeClasses = reviveElemType(creature.typeClasses)
  creature.typeAbility = reviveElemType(creature.typeAbility)
  creature.typeEquip = reviveElemType(creature.typeEquip)
  creature.typeState = reviveElemType(creature.typeState)
  creature.typeChange = reviveElemType(creature.typeChange)
  creature.typeMdfRace = reviveElemType(creature.typeMdfRace)
  creature.typeMdfClasses = reviveElemType(creature.typeMdfClasses)
  creature.typeMdfAbility = reviveElemType(creature.typeMdfAbility)
  creature.typeMdfEquip = reviveElemType(creature.typeMdfEquip)
  creature.typeMdfState = reviveElemType(creature.typeMdfState)
  creature.typeMdfChange = reviveElemType(creature.typeMdfChange)
  creature.moves = Array.isArray(creature.moves) ? creature.moves.map(reviveMove) : []
  creature.status = reviveStatusManager(creature.status)
  creature.resist = reviveResistManager(creature.resist)
  creature.classFeatures = Array.isArray(creature.classFeatures) ? creature.classFeatures.map(reviveFeature) : []
  creature.nonClassFeatures = Array.isArray(creature.nonClassFeatures) ? creature.nonClassFeatures.map(reviveFeature) : []
  creature.battleEquipment = Array.isArray(creature.battleEquipment) ? creature.battleEquipment.map(reviveEquipment) : []
  creature.appearanceEquipment = Array.isArray(creature.appearanceEquipment) ? creature.appearanceEquipment.map(reviveEquipment) : []
  creature.items = Array.isArray(creature.items) ? creature.items.map(reviveItem) : []
  creature.validate()
  return creature
}

function saveBattleMemory(memory: BattleMemory): BattleMemorySave {
  const { attacker, defender, ...rest } = memory
  return {
    ...rest,
    attackerCode: attacker?.code() ?? '',
    defenderCode: defender?.code() ?? '',
  }
}

function restoreBattleMemory(target: BattleMemory, source: BattleMemorySave | undefined, type: number): void {
  const { findByCode } = useCreatureStore()
  const fresh = new BattleMemory(type)
  Object.assign(target, fresh, source ?? {})
  target.attacker = source?.attackerCode ? findByCode(source.attackerCode) : null
  target.defender = source?.defenderCode ? findByCode(source.defenderCode) : null
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) return ['Set', Array.from(value)]
  return value
}

function parseSaveJson(text: string): AppSaveData {
  return JSON.parse(text) as AppSaveData
}

export function createSaveData(): AppSaveData {
  const { creatures } = useCreatureStore()
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    creatures: JSON.parse(JSON.stringify(creatures.value, replacer)),
    battle: {
      attack: saveBattleMemory(battleMemory.value),
      heal: saveBattleMemory(battleMemoryHeal.value),
      status: saveBattleMemory(battleMemoryStatus.value),
      move: { ...moveMemory.value },
    },
    check: {
      ...checkMemory.value,
      chosen: Array.from(checkMemory.value.chosen),
    },
    initiative: { ...initiativeMemory.value },
  }
}

export function exportSaveJson(): string {
  return JSON.stringify(createSaveData(), null, 2)
}

export function applySaveData(data: AppSaveData): void {
  if (!data || !Array.isArray(data.creatures)) {
    throw new Error('存档格式不正确')
  }

  const { creatures } = useCreatureStore()
  creatures.value = data.creatures.map(reviveCreature)

  restoreBattleMemory(battleMemory.value, data.battle?.attack, 1)
  restoreBattleMemory(battleMemoryHeal.value, data.battle?.heal, 2)
  restoreBattleMemory(battleMemoryStatus.value, data.battle?.status, 3)
  Object.assign(moveMemory.value, new MoveMemory(), data.battle?.move ?? {})

  Object.assign(checkMemory.value, new CheckMemory(), data.check ?? {})
  checkMemory.value.chosen = new Set(data.check?.chosen ?? [])

  Object.assign(initiativeMemory.value, new InitiativeMemory(), data.initiative ?? {})
}

export function importSaveJson(text: string): void {
  applySaveData(parseSaveJson(text))
}

export async function saveToRoom(): Promise<void> {
  if (!OBR.isAvailable) throw new Error('当前不在 Owlbear Rodeo 环境中')
  const json = exportSaveJson()
  const chunkCount = Math.ceil(json.length / ROOM_METADATA_CHUNK_SIZE)
  for (let i = 0; i < chunkCount; i++) {
    await OBR.room.setMetadata({
      [`${ROOM_METADATA_CHUNK_PREFIX}${i}`]: json.slice(
        i * ROOM_METADATA_CHUNK_SIZE,
        (i + 1) * ROOM_METADATA_CHUNK_SIZE
      ),
    })
  }
  await OBR.room.setMetadata({
    [ROOM_METADATA_KEY]: {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      chunkCount,
    },
  })
}

export async function loadFromRoom(): Promise<void> {
  if (!OBR.isAvailable) throw new Error('当前不在 Owlbear Rodeo 环境中')
  const metadata = await OBR.room.getMetadata()
  const data = metadata[ROOM_METADATA_KEY]
  if (!data) throw new Error('当前房间没有 PMDnD 存档')
  if (typeof data === 'string') {
    importSaveJson(data)
  } else if (
    typeof data === 'object' &&
    data != null &&
    'chunkCount' in data &&
    typeof data.chunkCount === 'number'
  ) {
    const chunks: string[] = []
    for (let i = 0; i < data.chunkCount; i++) {
      const chunk = metadata[`${ROOM_METADATA_CHUNK_PREFIX}${i}`]
      if (typeof chunk !== 'string') throw new Error(`房间存档缺少分片 ${i + 1}/${data.chunkCount}`)
      chunks.push(chunk)
    }
    importSaveJson(chunks.join(''))
  } else {
    applySaveData(data as AppSaveData)
  }
}
