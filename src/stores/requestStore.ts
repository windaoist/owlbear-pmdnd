import { computed, ref } from 'vue'
import OBR from '@owlbear-rodeo/sdk'
import { useObrSessionStore } from './obrSessionStore'

const REQUESTS_METADATA_KEY = 'owl-pm/requests'
const REQUEST_CHANNEL = 'owl-pm/request'
const RESULT_CHANNEL = 'owl-pm/request-result'

export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type RequestKind = 'move' | 'roll'

export interface RequestBase {
  id: string
  kind: RequestKind
  fromPlayerId: string
  fromPlayerName: string
  actorCode: string
  actorName: string
  text: string
  createdAt: number
  updatedAt: number
  status: RequestStatus
  dmNote?: string
}

export interface MoveRequest extends RequestBase {
  kind: 'move'
  targetCodes: string[]
  targetNames: string[]
  moveName: string
  actionLabel: string
  costPP: number
  payload?: Record<string, unknown>
}

export interface RollRequest extends RequestBase {
  kind: 'roll'
  mode: 'dice' | 'check' | 'save'
  title: string
  formula?: string
  total?: number
}

export type OpmRequest = MoveRequest | RollRequest
type GeneratedBaseFields = 'id' | 'kind' | 'fromPlayerId' | 'fromPlayerName' | 'createdAt' | 'updatedAt' | 'status'
export type MoveRequestInput = Omit<MoveRequest, GeneratedBaseFields>
export type RollRequestInput = Omit<RollRequest, GeneratedBaseFields>

type RequestMap = Record<string, OpmRequest>

const requests = ref<RequestMap>({})
const lastMessage = ref('')
let initialized = false
let unsubscribeMetadata: (() => void) | null = null
let unsubscribeRequest: (() => void) | null = null
let unsubscribeResult: (() => void) | null = null

export function useRequestStore() {
  const session = useObrSessionStore()

  async function init(): Promise<void> {
    await session.init()
    if (initialized) return
    initialized = true

    if (!OBR.isAvailable) return
    const metadata = await OBR.room.getMetadata()
    applyMetadata(metadata)

    unsubscribeMetadata = OBR.room.onMetadataChange(applyMetadata)
    unsubscribeRequest = OBR.broadcast.onMessage(REQUEST_CHANNEL, (event) => {
      const request = normalizeRequest(event.data)
      if (!request) return
      requests.value = { ...requests.value, [request.id]: request }
      if (session.role.value === 'GM') {
        OBR.notification.show(`收到 ${request.fromPlayerName} 的${request.kind === 'move' ? '招式' : '掷骰'}请求`, 'INFO')
      }
    })
    unsubscribeResult = OBR.broadcast.onMessage(RESULT_CHANNEL, (event) => {
      const request = normalizeRequest(event.data)
      if (!request) return
      requests.value = { ...requests.value, [request.id]: request }
      if (request.fromPlayerId === session.playerId.value) {
        const label = request.status === 'approved' ? '已批准' : '已拒绝'
        OBR.notification.show(`DM ${label}：${request.actorName}`, request.status === 'approved' ? 'SUCCESS' : 'WARNING')
      }
    })
  }

  function destroy(): void {
    unsubscribeMetadata?.()
    unsubscribeRequest?.()
    unsubscribeResult?.()
    unsubscribeMetadata = null
    unsubscribeRequest = null
    unsubscribeResult = null
    initialized = false
  }

  async function submitMoveRequest(input: MoveRequestInput): Promise<void> {
    await submitRequest({
      ...input,
      kind: 'move',
      ...baseFields(input.actorCode, input.actorName),
      status: 'pending',
    })
  }

  async function submitRollRequest(input: RollRequestInput): Promise<void> {
    await submitRequest({
      ...input,
      kind: 'roll',
      ...baseFields(input.actorCode, input.actorName),
      status: 'pending',
    })
  }

  async function approveRequest(id: string): Promise<void> {
    await setRequestStatus(id, 'approved')
  }

  async function rejectRequest(id: string): Promise<void> {
    await setRequestStatus(id, 'rejected')
  }

  async function removeRequest(id: string): Promise<void> {
    const next = { ...requests.value }
    delete next[id]
    requests.value = next
    await writeRequests(next)
  }

  return {
    requests,
    requestList: computed(() => Object.values(requests.value).sort((a, b) => b.createdAt - a.createdAt)),
    pendingRequests: computed(() =>
      Object.values(requests.value)
        .filter((request) => request.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt),
    ),
    pendingCount: computed(() => Object.values(requests.value).filter((request) => request.status === 'pending').length),
    lastMessage,
    init,
    destroy,
    submitMoveRequest,
    submitRollRequest,
    approveRequest,
    rejectRequest,
    removeRequest,
  }
}

function baseFields(actorCode: string, actorName: string): Pick<RequestBase, 'id' | 'fromPlayerId' | 'fromPlayerName' | 'actorCode' | 'actorName' | 'createdAt' | 'updatedAt'> {
  const session = useObrSessionStore()
  const now = Date.now()
  return {
    id: createRequestId(),
    fromPlayerId: session.playerId.value,
    fromPlayerName: session.playerName.value,
    actorCode,
    actorName,
    createdAt: now,
    updatedAt: now,
  }
}

async function submitRequest(request: OpmRequest): Promise<void> {
  requests.value = { ...requests.value, [request.id]: request }
  if (!OBR.isAvailable) {
    lastMessage.value = '本地模式：请求已保存到本地请求箱。'
    return
  }

  await writeRequests(requests.value)
  await OBR.broadcast.sendMessage(REQUEST_CHANNEL, request, { destination: 'REMOTE' })
  await OBR.notification.show('已提交给 DM。', 'SUCCESS')
  lastMessage.value = '已提交给 DM。'
}

async function setRequestStatus(id: string, status: RequestStatus): Promise<void> {
  const current = requests.value[id]
  if (!current) return
  const updated = { ...current, status, updatedAt: Date.now() } as OpmRequest
  requests.value = { ...requests.value, [id]: updated }
  await writeRequests(requests.value)
  if (OBR.isAvailable) {
    await OBR.broadcast.sendMessage(RESULT_CHANNEL, updated, { destination: 'REMOTE' })
  }
}

async function writeRequests(next: RequestMap): Promise<void> {
  if (!OBR.isAvailable) return
  await OBR.room.setMetadata({ [REQUESTS_METADATA_KEY]: next })
}

function applyMetadata(metadata: Record<string, unknown>): void {
  const value = metadata[REQUESTS_METADATA_KEY]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const next: RequestMap = {}
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const request = normalizeRequest(raw)
    if (request) next[id] = request
  }
  requests.value = next
}

function normalizeRequest(value: unknown): OpmRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const request = value as Partial<OpmRequest>
  if (typeof request.id !== 'string') return null
  if (request.kind !== 'move' && request.kind !== 'roll') return null
  if (request.status !== 'pending' && request.status !== 'approved' && request.status !== 'rejected') return null
  if (typeof request.text !== 'string') return null
  return request as OpmRequest
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
