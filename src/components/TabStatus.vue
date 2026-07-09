<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCreatureStore } from '../stores/creatureStore'
import { canRoleSeeCreature, canRoleSeeCreatureFull, canRoleSeeCreatureVitals } from '../stores/creatureStore'
import { useObrSessionStore } from '../stores/obrSessionStore'
import { Creature } from '../model/Creature'
import { damageCalcRaw, handleHP, showHP } from '../model/Damage'
import { S_Null, StatusList } from '../model/Status'
import type { Status } from '../model/DataType'
import type { MovePower } from '../model/DataType'
import { toMod, valueToColor, valueToColorBinary } from '../utils'

const { creatures } = useCreatureStore()
const session = useObrSessionStore()

const selectedCode = ref('')
const pageNumber = ref(1)
const newStatus = ref<Status>(S_Null.duplicate())
newStatus.value.lossOnTurn = 1

const curCreature = computed<Creature | null>(() => {
  if (!selectedCode.value) return null
  return visibleCreatures.value.find((c) => c.code() === selectedCode.value) ?? null
})
const visibleCreatures = computed(() => creatures.value.filter((creature) => canRoleSeeCreature(session.role.value, creature)))
const canSeeCurrentFull = computed(() => curCreature.value == null || canRoleSeeCreatureFull(session.role.value, curCreature.value))

function selectCreature(code: string): void {
  selectedCode.value = code
}

function goPage(n: number): void {
  if (curCreature.value) curCreature.value.shallowRefresh()
  pageNumber.value = n
}

// ── 状态伤害计算（仅状态来源，不含天气/场地） ──
interface StatusDamageEntry {
  pwr: MovePower
  amount: number
  kind: 'damage' | 'heal'
  key: string
}

const statusDamageEntries = computed<StatusDamageEntry[]>(() => {
  const cur = curCreature.value
  if (!cur) return []
  const cr = cur.battleLv()
  const powers = cur.status.grandStatus().damageOnTurn.filter((p) => p.power > 0)
  return powers.map((p, idx) => {
    const isHeal = p.elemType == '治疗'
    if (isHeal) {
      return { pwr: p, amount: damageCalcRaw(p.power, cr, 1, 1, 0, 0, 100), kind: 'heal' as const, key: `status-${idx}` }
    }
    const defName = p.psType == '物理' ? '物防' : '特防'
    const defValue = Math.max(1, cur.getAttackAttributeByName(defName))
    const mdf = cur.typeMdf(p.elemType) + cur.typeMdf(p.aspect) + cur.grandStatus().grandMdf
    return { pwr: p, amount: damageCalcRaw(p.power, cr, cr * 2, defValue, 0, mdf, 50), kind: 'damage' as const, key: `status-${idx}` }
  })
})

const statusDamageLog = computed<string>(() => {
  const cur = curCreature.value
  if (!cur || statusDamageEntries.value.length === 0) return ''
  const name = cur.name()
  const lines: string[] = []
  let hp = [cur.currentHP, cur.tempHP]
  for (const e of statusDamageEntries.value) {
    const dt = `${e.pwr.elemType}${e.pwr.psType}${e.pwr.aspect == '无性相' ? '' : e.pwr.aspect}`
    const src = e.pwr.extra.substring(1, e.pwr.extra.length - 1) || '状态'
    const preview = handleHP([...hp], cur.maxHP(), [e.kind == 'heal' ? e.amount : -e.amount, 0])
    if (e.kind == 'heal') {
      lines.push(`${name}受到了来自${src}的 ${e.amount} HP治疗（HP ${showHP(hp)} -> ${showHP(preview)}）。`)
    } else {
      lines.push(`${name}受到了来自${src}的 ${e.amount} ${dt}伤害（HP ${showHP(hp)} -> ${showHP(preview)}）。`)
    }
    hp = preview
  }
  return lines.join('\n')
})

function copyStatusLog(): void { navigator.clipboard.writeText(statusDamageLog.value) }

function applyAllStatusDamage(): void {
  const cur = curCreature.value
  if (!cur) return
  navigator.clipboard.writeText(statusDamageLog.value)
  for (const e of statusDamageEntries.value) {
    if (e.kind == 'heal') cur.takeHP([e.amount, 0])
    else cur.takeHP([-e.amount, 0])
  }
  cur.refreshGrandStatus()
}

function addNewStatus(): void {
  if (!curCreature.value) return
  if (StatusList.some((s) => s.name == newStatus.value.name)) return
  curCreature.value.status.status.push(newStatus.value.duplicate())
  curCreature.value.shallowRefresh()
  newStatus.value = S_Null.duplicate()
  newStatus.value.lossOnTurn = 1
}

function statusMessage(): string {
  if (!curCreature.value) return ''
  return curCreature.value.name() + '：' + curCreature.value.attributeChangeString() + '；' + curCreature.value.status.toString()
}

// ── 状态转换 ──
function canConvertToParentStatus(s: Status): boolean {
  const cur = curCreature.value
  return cur != null && s.parentName.length > 0 && s.stack > 0 && cur.status.stackOfStatus(s.parentName) <= 0
}

function convertToParentStatus(s: Status): void {
  const cur = curCreature.value
  if (!cur) return
  cur.status.upgradeStatus(s.name, !cur.inRound)
  cur.shallowRefresh()
}
</script>

<template>
  <div class="tab-status">
    <!-- 顶部工具栏 -->
    <div class="status-toolbar">
      <label class="toolbar-label">角色</label>
      <select class="creature-sel" :value="selectedCode" @change="selectCreature(($event.target as HTMLSelectElement).value)">
        <option value="">（选择角色）</option>
        <option v-for="c in visibleCreatures" :key="c.code()" :value="c.code()">{{ c.name() }} {{ c.code() }}</option>
      </select>

      <div class="page-tabs">
        <button class="page-btn" :class="{ active: pageNumber == 1 }" :disabled="!curCreature" @click="goPage(1)">
          当前状态
        </button>
        <button class="page-btn" :class="{ active: pageNumber == 2 }" :disabled="!curCreature" @click="goPage(2)">
          状态一览
        </button>
      </div>
    </div>

    <div v-if="curCreature && !canSeeCurrentFull" class="status-body limited-status">
      <h3>{{ curCreature.name() }} <small>{{ curCreature.code() }}</small></h3>
      <p v-if="canRoleSeeCreatureVitals(session.role.value, curCreature)">
        HP {{ showHP([curCreature.currentHP, curCreature.tempHP]) }}/{{ curCreature.maxHP() }} · PP {{ curCreature.currentPP }}/{{ curCreature.maxPP() }}
      </p>
      <p v-else>此卡当前仅名称可见。</p>
    </div>

    <div v-else-if="curCreature" class="status-body">
      <!-- 回合操作 -->
      <div class="round-row">
        <span class="round-badge" :class="{ active: curCreature.inRound }">
          {{ curCreature.inRound ? '🟢' : '⚪' }} {{ curCreature.inRound ? '现在是' : '不是' }}{{ curCreature.name() }}的回合
        </span>
        <button class="btn" @click="curCreature.newRound()">{{ curCreature.name() }}回合开始 / 状态流逝</button>
      </div>

      <!-- ═══ 页面 1：当前状态 ═══ -->
      <div v-if="pageNumber == 1">
        <table class="status-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>状态名</th>
              <th>剩余</th>
              <th>修正</th>
              <th>状态转换</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in curCreature.status.status.filter((x) => x.stack > 0)" :key="s.name">
              <td>{{ s.type ? '累积' : '持续' }}</td>
              <td>{{ s.name }}</td>
              <td>
                <input
                  type="number"
                  class="stack-inp"
                  :value="s.stack"
                  @input="s.stack = Math.max(0, Number(($event.target as HTMLInputElement).value) || 0)"
                />
                {{ s.type || s.name == '刚毅' ? '层' : '回合' }}
              </td>
              <td>
                <span :style="{ color: valueToColor(curCreature.getStatusMdf(s)) }">
                  {{ toMod(curCreature.getStatusMdf(s)) }}
                </span>
              </td>
              <td>
                <button
                  v-if="canConvertToParentStatus(s)"
                  class="btn btn-red"
                  @click="convertToParentStatus(s)"
                >
                  {{ s.stack >= 20 ? `转为${s.parentName}` : `手动转${s.parentName}` }}
                </button>
                <button
                  v-if="s.childName.length > 0 && s.stack >= 1"
                  class="btn btn-red"
                  @click="curCreature.status.degradeStatus(s.name)"
                >
                  10 层{{ s.childName }}
                </button>
              </td>
            </tr>
            <tr v-if="curCreature.status.status.filter((x) => x.stack > 0).length === 0">
              <td colspan="5" style="color:#999">无状态</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">状态结算</div>
        <div v-if="statusDamageEntries.length > 0">
          <table class="status-table">
            <thead>
              <tr><th>威力</th><th>属性</th><th>类型</th><th>伤害 / 治疗</th></tr>
            </thead>
            <tbody>
              <tr v-for="e in statusDamageEntries" :key="e.key">
                <td>{{ e.pwr.power }}</td>
                <td>{{ e.pwr.elemType }}{{ e.pwr.psType }}{{ e.pwr.aspect == '无性相' ? '' : e.pwr.aspect }}</td>
                <td>{{ e.pwr.extra }}</td>
                <td :style="{ color: e.kind == 'heal' ? '#2e7d32' : '#e53935', fontWeight: 'bold' }">
                  {{ e.kind == 'heal' ? '+' : '-' }}{{ e.amount }}
                </td>
              </tr>
            </tbody>
          </table>
          <button class="btn btn-red" style="margin:4px 4px 0 0" @click="applyAllStatusDamage">全部结算</button>
          <button v-if="statusDamageLog" class="btn" style="margin:4px 4px 0 0" @click="copyStatusLog">复制到剪贴板</button>
          <textarea v-if="statusDamageLog" class="log-area" readonly :value="statusDamageLog" />
        </div>
        <div v-else class="dim-text">无状态伤害</div>

        <!-- 自定义状态添加 -->
        <div class="section-title">自定义状态</div>
        <div class="custom-status-row">
          <button class="btn" :class="{ active: newStatus.type }" @click="newStatus.type = !newStatus.type">
            {{ newStatus.type ? '累积型' : '持续型' }}
          </button>
          名字 <input v-model="newStatus.name" class="inp" style="width:10em" />
          层/回合 <input type="number" class="stack-inp" v-model.number="newStatus.stack" min="1" />
          每回合减 <input type="number" class="stack-inp" v-model.number="newStatus.lossOnTurn" min="0" />
          <button class="btn" @click="addNewStatus">添加状态</button>
        </div>
        <textarea class="log-area" readonly :value="statusMessage()" />
      </div>

      <!-- ═══ 页面 2：状态一览 ═══ -->
      <div v-if="pageNumber == 2">
        <table class="status-table dense">
          <thead>
            <tr>
              <th>类型</th><th>状态名</th><th>层/回合</th><th>修正</th><th>回合</th><th>相关状态</th><th>标签</th><th>移除</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in curCreature.status.status" :key="s.name" :style="{ color: valueToColorBinary(s.stack) }">
              <td>{{ s.type ? '累积' : '持续' }}</td>
              <td><span :style="{ color: valueToColor(s.stack) }">{{ s.name }}</span></td>
              <td>
                <input type="number" class="stack-inp" :value="s.stack"
                  @input="s.stack = Math.max(0, Number(($event.target as HTMLInputElement).value) || 0)" />
              </td>
              <td><span :style="{ color: valueToColor(curCreature.getStatusMdf(s)) }">{{ toMod(curCreature.getStatusMdf(s)) }}</span></td>
              <td><span :style="{ color: s.stack > 0 ? valueToColor(s.lossOnTurn) : valueToColorBinary(s.stack) }">{{ s.lossOnTurn }}</span></td>
              <td :style="{ fontWeight: s.type && s.stack >= 20 ? 'bold' : 'inherit', color: s.type && s.stack >= 20 ? 'crimson' : 'inherit' }">
                {{ s.parentName.length > 0 ? `${s.parentStack} 回合` : '' }}{{ s.parentName }}{{ s.parentName.length > 0 ? '，20层可转化' : '' }}
                {{ s.childName }}{{ s.oppositeName.length > 0 ? '/' + s.oppositeName : '' }}
              </td>
              <td>
                <template v-if="s.autoCrit">自动暴击 </template>
                <template v-if="s.cannotMove">无法移动 </template>
                <template v-if="s.incapacitated">命中减值无效</template>
              </td>
              <td :style="{ color: s.stack > 0 && s.removeAt == 2 ? 'crimson' : 'inherit' }">
                {{ ['协助', '初等复原术', '高等复原术'][s.removeAt] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="empty-hint">请先从上方下拉框选择一个角色</div>
  </div>
</template>

<style scoped>
.tab-status {
  height: 100%;
  overflow-y: auto;
  padding: 0.5em;
  background: #fff;
}

.status-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-weight: 650;
  font-size: 13px;
  color: #555;
}

.creature-sel {
  flex: 1;
  min-width: 160px;
  max-width: 300px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 13px;
  background: #fff;
}

.page-tabs {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.page-btn {
  padding: 5px 12px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #555;
}

.page-btn:hover { background: #f0f0f0; }
.page-btn.active { background: #222; color: #fff; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-btn + .page-btn { border-left: 1px solid #ddd; }

.status-body { font-size: 13px; }
.limited-status { border: 1px dashed #bbb; border-radius: 6px; padding: 10px; background: #fcfcfc; }

.round-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.round-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  background: #f5f5f5;
}
.round-badge.active { background: #e8f5e9; color: #2e7d32; }

.btn {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
  color: #333;
}

.btn:hover { background: #e5e5e5; }
.btn.active { background: #222; color: #fff; }
.btn-red { background: #e53935; color: #fff; border-color: #c62828; }
.btn-red:hover { background: #c62828; }

.status-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 4px 0;
}

.status-table th,
.status-table td {
  border: 1px solid #e0e0e0;
  padding: 4px 6px;
  text-align: center;
}

.status-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.dense td { padding: 2px 4px; }

.stack-inp {
  width: 50px;
  padding: 2px 4px;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 12px;
  text-align: center;
}

.inp {
  border: 1px solid #ccc;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 2px;
}

.log-area {
  width: 100%;
  height: 4em;
  resize: vertical;
  font-size: 11px;
  border: 1px solid #e0e0e0;
  padding: 4px;
  margin: 4px 0;
  background: #fafafa;
}

.section-title {
  font-weight: 700;
  margin: 10px 0 4px;
  font-size: 13px;
  color: #333;
}

.custom-status-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 12px;
}

.dim-text { color: #999; }

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60%;
  color: #999;
  font-size: 15px;
}
</style>
