import { computed, ref, watch } from 'vue'
import OBR from '@owlbear-rodeo/sdk'
import type { Creature } from '../model/Creature'
import { useCreatureStore } from './creatureStore'
import { useObrSessionStore } from './obrSessionStore'
import { S_Null, getStatus } from '../model/Status'
import { StatusManager } from '../model/StatusManager'
import type { Status } from '../model/DataType'

const RUNTIME_METADATA_KEY = 'owl-pm/runtime'
const SYNC_DEBOUNCE_MS = 600

interface CreatureRuntimeState {
  code: string
  name: string
  currentHP: number
  tempHP: number
  currentPP: number
  inRound: boolean
  status: CompactStatus[]
  adjustments: Record<string, CompactObject>
  updatedAt: number
  updatedBy: string
}

type RuntimeStateMap = Record<string, CreatureRuntimeState>
type CompactObject = Record<string, number> | { value: Array<[number, number]> }

interface CompactStatus {
  name: string
  stack: number
  type?: boolean
  lossOnTurn?: number
}

const remoteStates = ref<RuntimeStateMap>({})
const syncEnabled = ref(true)
const lastSyncAt = ref(0)
const lastAppliedAt = ref(0)
const lastError = ref('')

let initialized = false
let unsubscribeMetadata: (() => void) | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null
let applyingRemote = false

export function useRuntimeSyncStore() {
  const session = useObrSessionStore()
  const { creatures } = useCreatureStore()

  async function init(): Promise<void> {
    await session.init()
    if (initialized) return
    initialized = true

    if (!OBR.isAvailable) return
    const metadata = await OBR.room.getMetadata()
    applyMetadata(metadata)
    if (session.role.value === 'PLAYER') applyRemoteStatesToCreatures()

    unsubscribeMetadata = OBR.room.onMetadataChange((metadata) => {
      applyMetadata(metadata)
      if (session.role.value === 'PLAYER') applyRemoteStatesToCreatures()
    })

    if (session.role.value === 'GM') {
      watch(
        () => runtimeSignature(creatures.value),
        () => {
          if (!syncEnabled.value || applyingRemote) return
          scheduleWrite()
        },
      )
    } else if (session.role.value === 'PLAYER') {
      watch(
        () => creatures.value.map((creature) => creature.code()).join('|'),
        () => {
          if (!syncEnabled.value) return
          applyRemoteStatesToCreatures()
        },
      )
    }
  }

  function destroy(): void {
    unsubscribeMetadata?.()
    unsubscribeMetadata = null
    initialized = false
    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = null
  }

  async function pushNow(): Promise<void> {
    if (!OBR.isAvailable || session.role.value !== 'GM') return
    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = null
    await writeRuntimeStates()
  }

  function applyNow(): void {
    applyRemoteStatesToCreatures()
  }

  return {
    syncEnabled,
    remoteStates,
    lastSyncAt,
    lastAppliedAt,
    lastError,
    remoteCount: computed(() => Object.keys(remoteStates.value).length),
    canPush: computed(() => OBR.isAvailable && session.role.value === 'GM'),
    canApply: computed(() => OBR.isAvailable && session.role.value === 'PLAYER'),
    init,
    destroy,
    pushNow,
    applyNow,
  }
}

function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    writeRuntimeStates()
  }, SYNC_DEBOUNCE_MS)
}

async function writeRuntimeStates(): Promise<void> {
  if (!OBR.isAvailable) return
  try {
    const { creatures } = useCreatureStore()
    const next = createRuntimeStateMap(creatures.value)
    remoteStates.value = next
    await OBR.room.setMetadata({ [RUNTIME_METADATA_KEY]: toPlain(next) })
    lastSyncAt.value = Date.now()
    lastError.value = ''
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error)
  }
}

function createRuntimeStateMap(creatures: Creature[]): RuntimeStateMap {
  const session = useObrSessionStore()
  const now = Date.now()
  const next: RuntimeStateMap = {}
  for (const creature of creatures) {
    const code = creature.code()
    if (!code) continue
    next[code] = {
      code,
      name: creature.name(),
      currentHP: creature.currentHP,
      tempHP: creature.tempHP,
      currentPP: creature.currentPP,
      inRound: creature.inRound,
      status: compactStatuses(creature),
      adjustments: {
        abilityBaseD: compactObject(creature.abilityBaseD),
        abilitySaveD: compactObject(creature.abilitySaveD),
        attributeDChange: compactObject(creature.attributeDChange),
        attributeChange: compactObject(creature.attributeChange),
        attributeChangeBase: compactObject(creature.attributeChangeBase),
        battleAbilityDChange: compactObject(creature.battleAbilityDChange),
        skillDChange: compactObject(creature.skillDChange),
        skillAdvance: compactObject(creature.skillAdvance),
        typeChange: compactObject(creature.typeChange),
        typeMdfChange: compactObject(creature.typeMdfChange),
      },
      updatedAt: now,
      updatedBy: session.playerId.value,
    }
  }
  return next
}

function applyRemoteStatesToCreatures(): void {
  const { creatures } = useCreatureStore()
  if (creatures.value.length === 0) return
  applyingRemote = true
  try {
    for (const creature of creatures.value) {
      const state = remoteStates.value[creature.code()]
      if (!state) continue
      applyRuntimeState(creature, state)
    }
    lastAppliedAt.value = Date.now()
    lastError.value = ''
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error)
  } finally {
    applyingRemote = false
  }
}

function applyRuntimeState(creature: Creature, state: CreatureRuntimeState): void {
  creature.currentHP = numberOr(creature.currentHP, state.currentHP)
  creature.tempHP = Math.max(0, numberOr(creature.tempHP, state.tempHP))
  creature.currentPP = numberOr(creature.currentPP, state.currentPP)
  creature.inRound = Boolean(state.inRound)
  creature.status = new StatusManager(reviveCompactStatuses(state.status))

  applyCompactObject(creature.abilityBaseD, state.adjustments?.abilityBaseD)
  applyCompactObject(creature.abilitySaveD, state.adjustments?.abilitySaveD)
  applyCompactObject(creature.attributeDChange, state.adjustments?.attributeDChange)
  applyCompactObject(creature.attributeChange, state.adjustments?.attributeChange)
  applyCompactObject(creature.attributeChangeBase, state.adjustments?.attributeChangeBase)
  applyCompactObject(creature.battleAbilityDChange, state.adjustments?.battleAbilityDChange)
  applyCompactObject(creature.skillDChange, state.adjustments?.skillDChange)
  applyCompactObject(creature.skillAdvance, state.adjustments?.skillAdvance)
  applyCompactObject(creature.typeChange, state.adjustments?.typeChange)
  applyCompactObject(creature.typeMdfChange, state.adjustments?.typeMdfChange)

  creature.validate()
}

function applyMetadata(metadata: Record<string, unknown>): void {
  const raw = metadata[RUNTIME_METADATA_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return
  const next: RuntimeStateMap = {}
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const state = normalizeRuntimeState(value)
    if (state) next[code] = state
  }
  remoteStates.value = next
}

function normalizeRuntimeState(value: unknown): CreatureRuntimeState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const state = value as Partial<CreatureRuntimeState>
  if (typeof state.code !== 'string') return null
  if (!state.adjustments || typeof state.adjustments !== 'object') return null
  return state as CreatureRuntimeState
}

function runtimeSignature(creatures: Creature[]): string {
  return JSON.stringify(createRuntimeStateMap(creatures))
}

function numberOr(fallback: number, value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function compactStatuses(creature: Creature): CompactStatus[] {
  return creature.status.status
    .filter((status) => status.stack > 0)
    .map((status) => ({
      name: status.name,
      stack: status.stack,
      type: status.type,
      lossOnTurn: status.lossOnTurn,
    }))
}

function reviveCompactStatuses(statuses: unknown): Status[] {
  if (!Array.isArray(statuses)) return []
  const result: Status[] = []
  for (const entry of statuses) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const compact = entry as Partial<CompactStatus>
    if (!compact.name || typeof compact.name !== 'string') continue
    const status = getStatus(compact.name)?.duplicate() ?? S_Null.duplicate()
    status.name = compact.name
    status.stack = numberOr(0, compact.stack)
    status.type = Boolean(compact.type)
    status.lossOnTurn = numberOr(status.lossOnTurn, compact.lossOnTurn)
    result.push(status)
  }
  return result
}

function compactObject(source: unknown): CompactObject {
  const value = toPlain(source) as Record<string, unknown>
  if (Array.isArray(value.value)) {
    const entries: Array<[number, number]> = []
    value.value.forEach((raw, index) => {
      const n = Number(raw)
      if (Number.isFinite(n) && n !== 0) entries.push([index, n])
    })
    return { value: entries }
  }

  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    const n = Number(raw)
    if (Number.isFinite(n) && n !== 0) result[key] = n
  }
  return result
}

function applyCompactObject(target: unknown, source: unknown): void {
  if (!target || typeof target !== 'object' || !source || typeof source !== 'object' || Array.isArray(source)) return
  const targetRecord = target as Record<string, unknown>
  for (const [key, value] of Object.entries(targetRecord)) {
    if (typeof value === 'number') targetRecord[key] = 0
  }

  const compact = source as CompactObject
  if ('value' in compact && Array.isArray(compact.value) && Array.isArray(targetRecord.value)) {
    const targetValue = targetRecord.value as number[]
    targetRecord.value = targetValue.map(() => 0)
    const nextValue = targetRecord.value as number[]
    for (const [index, value] of compact.value) {
      if (index >= 0 && index < nextValue.length) nextValue[index] = value
    }
    return
  }

  for (const [key, value] of Object.entries(compact)) {
    if (key in targetRecord && typeof value === 'number') targetRecord[key] = value
  }
}
