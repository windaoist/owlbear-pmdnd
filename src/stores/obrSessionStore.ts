import { computed, ref } from 'vue'
import OBR from '@owlbear-rodeo/sdk'

export type ObrRole = 'GM' | 'PLAYER' | 'LOCAL'

const ready = ref(false)
const available = ref(false)
const role = ref<ObrRole>('LOCAL')
const playerId = ref('local')
const playerName = ref('本地用户')

let initPromise: Promise<void> | null = null

export function useObrSessionStore() {
  async function init(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = initSession()
    return initPromise
  }

  return {
    ready,
    available,
    role,
    playerId,
    playerName,
    isGm: computed(() => role.value === 'GM' || role.value === 'LOCAL'),
    isPlayer: computed(() => role.value === 'PLAYER'),
    init,
  }
}

async function initSession(): Promise<void> {
  available.value = OBR.isAvailable
  if (!OBR.isAvailable) {
    ready.value = true
    return
  }

  role.value = await OBR.player.getRole()
  playerId.value = await OBR.player.getId()
  playerName.value = await OBR.player.getName()
  ready.value = true
}
