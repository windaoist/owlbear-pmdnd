<script setup lang="ts">
import { computed } from 'vue'
import { useObrSessionStore } from '../stores/obrSessionStore'
import { useRequestStore, type OpmRequest } from '../stores/requestStore'

const session = useObrSessionStore()
const requestStore = useRequestStore()

const requests = requestStore.requestList
const isGm = session.isGm
const visibleRequests = computed(() => {
  if (isGm.value) return requests.value
  return requests.value.filter((request) => request.fromPlayerId === session.playerId.value)
})

function statusLabel(status: OpmRequest['status']): string {
  if (status === 'approved') return '已批准'
  if (status === 'rejected') return '已拒绝'
  return '待处理'
}

function kindLabel(request: OpmRequest): string {
  if (request.kind === 'move') return '招式'
  if (request.mode === 'save') return '豁免'
  if (request.mode === 'check') return '检定'
  return '掷骰'
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function copyText(text: string): void {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="request-inbox">
    <header class="inbox-header">
      <div>
        <h2>{{ isGm ? 'DM 请求箱' : '我的提交' }}</h2>
        <p>{{ isGm ? '批准后再用现有战斗面板结算。第一版不会自动修改角色数据。' : '这里显示你提交给 DM 的请求状态。' }}</p>
      </div>
      <span class="role-pill">{{ session.role }}</span>
    </header>

    <div v-if="visibleRequests.length === 0" class="empty">
      暂无请求。
    </div>

    <article v-for="request in visibleRequests" :key="request.id" class="request-card" :class="request.status">
      <div class="request-top">
        <div>
          <strong>{{ kindLabel(request) }} · {{ request.actorName }}</strong>
          <small>{{ request.fromPlayerName }} · {{ timeLabel(request.createdAt) }}</small>
        </div>
        <span class="status">{{ statusLabel(request.status) }}</span>
      </div>

      <div v-if="request.kind === 'move'" class="meta">
        {{ request.moveName }} → {{ request.targetNames.length > 0 ? request.targetNames.join('、') : '未指定目标' }}
      </div>
      <div v-else class="meta">
        {{ request.title }}
      </div>

      <textarea class="request-text" readonly :value="request.text" />

      <div class="actions">
        <button @click="copyText(request.text)">复制文本</button>
        <template v-if="isGm && request.status === 'pending'">
          <button class="approve" @click="requestStore.approveRequest(request.id)">批准</button>
          <button class="reject" @click="requestStore.rejectRequest(request.id)">拒绝</button>
        </template>
        <button v-if="isGm && request.status !== 'pending'" @click="requestStore.removeRequest(request.id)">移除</button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.request-inbox {
  height: 100%;
  overflow: auto;
  padding: 12px;
  background: #f7f7f5;
}

.inbox-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.role-pill,
.status {
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 2px 8px;
  background: #fff;
  font-size: 12px;
  white-space: nowrap;
}

.empty {
  display: grid;
  place-items: center;
  min-height: 160px;
  color: #888;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.request-card {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-left: 4px solid #4a6fa5;
  border-radius: 6px;
  background: #fff;
}

.request-card.approved {
  border-left-color: #2e7d32;
}

.request-card.rejected {
  border-left-color: #c62828;
}

.request-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.request-top strong,
.request-top small {
  display: block;
}

.request-top small,
.meta {
  color: #666;
  font-size: 12px;
}

.meta {
  margin-bottom: 6px;
}

.request-text {
  width: 100%;
  min-height: 110px;
  resize: vertical;
  border: 1px solid #ddd;
  padding: 8px;
  background: #fafafa;
  font-size: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

button {
  border: 1px solid #ccc;
  background: #f5f5f5;
  padding: 4px 9px;
  cursor: pointer;
}

.approve {
  border-color: #2e7d32;
  background: #2e7d32;
  color: #fff;
}

.reject {
  border-color: #c62828;
  background: #c62828;
  color: #fff;
}
</style>
