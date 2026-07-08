import { computed, ref, watch } from 'vue'
import OBR from '@owlbear-rodeo/sdk'
import type { Creature } from '../model/Creature'
import { useCreatureStore } from './creatureStore'
import { reviveStatusManager } from './persistenceStore'
import { useObrSessionStore } from './obrSessionStore'

const RUNTIME_METADATA_KEY = 'owl-pm/runtime'
const SYNC_DEBOUNCE_MS = 600

interface CreatureRuntimeState {
  code: string
  name: string
  currentHP: number
  tempHP: number
  currentPP: number
  inRound: boolean
  status: unknown
  adjustments: {
    abilityBaseD: unknown
    abilitySaveD: unknown
    attributeDChange: unknown
    attributeChange: unknown
    attributeChangeBase: unknown
    battleAbilityDChange: unknown
    skillDChange: unknown
    skillAdvance: unknown
    typeChange: unknown
    typeMdfChange: unknown
  }
  updatedAt: number
  updatedBy: string
}

type RuntimeStateMap = Record<string, CreatureRuntimeState>

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
      status: toPlain(creature.status),
      adjustments: {
        abilityBaseD: toPlain(creature.abilityBaseD),
        abilitySaveD: toPlain(creature.abilitySaveD),
        attributeDChange: toPlain(creature.attributeDChange),
        attributeChange: toPlain(creature.attributeChange),
        attributeChangeBase: toPlain(creature.attributeChangeBase),
        battleAbilityDChange: toPlain(creature.battleAbilityDChange),
        skillDChange: toPlain(creature.skillDChange),
        skillAdvance: toPlain(creature.skillAdvance),
        typeChange: toPlain(creature.typeChange),
        typeMdfChange: toPlain(creature.typeMdfChange),
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
  creature.status = reviveStatusManager(state.status)

  assignPlain(creature.abilityBaseD, state.adjustments?.abilityBaseD)
  assignPlain(creature.abilitySaveD, state.adjustments?.abilitySaveD)
  assignPlain(creature.attributeDChange, state.adjustments?.attributeDChange)
  assignPlain(creature.attributeChange, state.adjustments?.attributeChange)
  assignPlain(creature.attributeChangeBase, state.adjustments?.attributeChangeBase)
  assignPlain(creature.battleAbilityDChange, state.adjustments?.battleAbilityDChange)
  assignPlain(creature.skillDChange, state.adjustments?.skillDChange)
  assignPlain(creature.skillAdvance, state.adjustments?.skillAdvance)
  assignPlain(creature.typeChange, state.adjustments?.typeChange)
  assignPlain(creature.typeMdfChange, state.adjustments?.typeMdfChange)

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

function assignPlain(target: object, source: unknown): void {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return
  Object.assign(target, toPlain(source))
}

function numberOr(fallback: number, value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
