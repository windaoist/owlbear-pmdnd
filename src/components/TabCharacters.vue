<script setup lang="ts">
import { computed, ref } from 'vue'
import { showHP } from '../model/Damage'
import { ElemType, Skill, sizeString, tagList } from '../model/DataType'
import type { Ability, Status } from '../model/DataType'
import type { Creature } from '../model/Creature'
import { S_Null } from '../model/Status'
import { useCreatureStore } from '../stores/creatureStore'
import { toMod, valueToColor, valueToColorBinary } from '../utils'

const { creatures, removeCreature } = useCreatureStore()

const selectedCode = ref('')
const page = ref('summary')
const sortBy = ref<'name' | 'code' | 'faction' | 'initiative'>('name')
const filterFaction = ref('全部')
const featureKeyword = ref('')
const equipmentKeyword = ref('')
const selectedMove = ref('')

const factionOrder: Record<string, number> = { 玩家: 0, 友方: 1, 中立: 2, 敌方: 3 }
const factionColor: Record<string, string> = {
  玩家: '#2196f3',
  友方: '#4caf50',
  中立: '#f9a825',
  敌方: '#e53935',
}

const abilityAdjustRows = [
  { label: '力量', key: 'str', index: 0 },
  { label: '敏捷', key: 'dex', index: 1 },
  { label: '体质', key: 'con', index: 2 },
  { label: '智力', key: 'int', index: 3 },
  { label: '感知', key: 'wis', index: 4 },
  { label: '魅力', key: 'cha', index: 5 },
] as const

const attributeAdjustRows = [
  { label: 'HP上限', key: 'hp', index: 0 },
  { label: '物攻', key: 'patk', index: 1 },
  { label: '物防', key: 'pdef', index: 2 },
  { label: '特攻', key: 'satk', index: 3 },
  { label: '特防', key: 'sdef', index: 4 },
  { label: '速度', key: 'spd', index: 5 },
  { label: 'PP上限', key: 'pp', index: 6 },
] as const

const battleAbilityAdjustRows = [
  { label: '先攻', key: 'initiative', index: 0 },
  { label: '命中', key: 'acc', index: 1 },
  { label: '闪避', key: 'eva', index: 2 },
  { label: '效果强度', key: 'pwr', index: 3 },
] as const

const DM_ADJUST_STATUS = 'DM临时调整'
type AbilityAdvanceField = 'abilityMoveMdf' | 'abilityCheckMdf' | 'abilitySaveMdf'
type AbilityKey = keyof Pick<Ability, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'>

const current = computed<Creature | null>(() => {
  if (!selectedCode.value && creatures.value.length > 0) selectedCode.value = creatures.value[0].code()
  return creatures.value.find((c) => c.code() === selectedCode.value) ?? null
})

const sortedCreatures = computed(() => {
  let list = [...creatures.value]
  if (filterFaction.value !== '全部') list = list.filter((c) => c.faction === filterFaction.value)
  list.sort((a, b) => {
    if (sortBy.value === 'code') return a.code().localeCompare(b.code(), 'en-US')
    if (sortBy.value === 'faction') return (factionOrder[a.faction] ?? 9) - (factionOrder[b.faction] ?? 9)
    if (sortBy.value === 'initiative') return b.initiative() + b.tempInitiative - (a.initiative() + a.tempInitiative)
    return a.name().localeCompare(b.name(), 'zh-CN')
  })
  return list
})

const activeStatuses = computed(() => current.value?.status.status.filter((s) => s.stack > 0) ?? [])
const features = computed(() => {
  const cur = current.value
  if (!cur) return []
  const key = featureKeyword.value.trim().toLowerCase()
  return [...cur.classFeatures, ...cur.nonClassFeatures].filter((f) =>
    !key ||
    f.name.toLowerCase().includes(key) ||
    f.source.toLowerCase().includes(key) ||
    f.description.toLowerCase().includes(key)
  )
})
const equipmentRows = computed(() => {
  const cur = current.value
  if (!cur) return []
  const key = equipmentKeyword.value.trim().toLowerCase()
  return [...cur.battleEquipment, ...cur.appearanceEquipment, ...cur.items].filter((x) => {
    const text = JSON.stringify(x).toLowerCase()
    return !key || text.includes(key)
  })
})
const currentMove = computed(() => current.value?.getMove(selectedMove.value) ?? null)

function selectCreature(code: string): void {
  selectedCode.value = code
  selectedMove.value = ''
  current.value?.shallowRefresh()
}

function hpPercent(c: Creature): number {
  return Math.max(0, Math.min(100, (100 * c.currentHP) / c.maxHP()))
}

function abilityRows(c: Creature) {
  return ['力量', '敏捷', '体质', '智力', '感知', '魅力'].map((name, idx) => ({
    name,
    value: c.ability(idx),
    mod: c.modifier(idx),
    save: c.save(idx),
  }))
}

function battleRows(c: Creature) {
  return [
    ['HP', c.currentHP, c.maxHP()],
    ['PP', c.currentPP, c.maxPP()],
    ['物攻', c.patk(), c.attributeChange.get(1) + c.attributeDChange.get(1) + c.grandStatus().attributeMdf.get(1)],
    ['物防', c.pdef(), c.attributeChange.get(2) + c.attributeDChange.get(2) + c.grandStatus().attributeMdf.get(2)],
    ['特攻', c.satk(), c.attributeChange.get(3) + c.attributeDChange.get(3) + c.grandStatus().attributeMdf.get(3)],
    ['特防', c.sdef(), c.attributeChange.get(4) + c.attributeDChange.get(4) + c.grandStatus().attributeMdf.get(4)],
    ['速度', c.spd(), c.attributeChange.get(5) + c.attributeDChange.get(5) + c.grandStatus().attributeMdf.get(5)],
    ['先攻', c.initiative() + c.tempInitiative, c.tempInitiative],
    ['命中', c.accuracy(), c.getBattleAbilityD(1)],
    ['闪避', c.evasion(), c.getBattleAbilityD(2)],
  ]
}

function totalWeight(c: Creature): number {
  return [...c.battleEquipment, ...c.appearanceEquipment].reduce((sum, e) => sum + e.weight, 0) +
    c.items.reduce((sum, i) => sum + i.unitWeight * i.quantity, 0)
}

function deleteCurrent(): void {
  const cur = current.value
  if (!cur || !window.confirm(`确定删除角色“${cur.name()}”（${cur.code()}）吗？`)) return
  removeCreature(cur.code())
  selectedCode.value = creatures.value[0]?.code() ?? ''
}

function refreshCurrent(): void {
  current.value?.validate()
}

function dmAdjustmentStatus(c: Creature): Status {
  let status = c.status.status.find((s) => s.name === DM_ADJUST_STATUS)
  if (!status) {
    status = S_Null.duplicate()
    status.name = DM_ADJUST_STATUS
    status.stack = 1
    status.lossOnTurn = 0
    c.status.status.push(status)
  }
  return status
}

function dmAbilityAdvance(c: Creature, field: AbilityAdvanceField, key: AbilityKey): number {
  return dmAdjustmentStatus(c)[field][key]
}

function setDmAbilityAdvance(c: Creature, field: AbilityAdvanceField, key: AbilityKey, value: number): void {
  dmAdjustmentStatus(c)[field][key] = Number(value) || 0
  c.shallowRefresh()
}

function resetAdjustments(c: Creature): void {
  if (!window.confirm(`清空“${c.name()}”的 DM 临时调整吗？`)) return
  for (const row of abilityAdjustRows) c.abilityBaseD[row.key] = 0
  for (const row of attributeAdjustRows) {
    c.attributeDChange[row.key] = 0
    c.attributeChange[row.key] = 0
  }
  for (const row of battleAbilityAdjustRows) c.battleAbilityDChange[row.key] = 0
  for (let i = 0; i < c.skillAdvance.value.length; i++) c.skillAdvance.value[i] = 0
  for (let i = 0; i < c.typeChange.value.length; i++) {
    c.typeChange.value[i] = 0
    c.typeMdfChange.value[i] = 0
  }
  c.status.status = c.status.status.filter((s) => s.name !== DM_ADJUST_STATUS)
  c.validate()
}
</script>

<template>
  <div class="characters-tab">
    <aside class="character-list">
      <div class="list-controls">
        <select v-model="sortBy"><option value="name">名字</option><option value="code">代号</option><option value="faction">阵营</option><option value="initiative">先攻</option></select>
        <select v-model="filterFaction"><option>全部</option><option>玩家</option><option>友方</option><option>中立</option><option>敌方</option></select>
      </div>
      <button
        v-for="c in sortedCreatures"
        :key="c.code()"
        class="character-row"
        :class="{ selected: current?.code() === c.code() }"
        @click="selectCreature(c.code())"
      >
        <span class="hp-fill" :style="{ width: hpPercent(c) + '%', background: factionColor[c.faction] ?? '#999' }" />
        <span class="row-main"><b>{{ c.name() }}</b><small>{{ c.code() }} · {{ c.faction }}</small></span>
        <span class="row-vitals">{{ showHP([c.currentHP, c.tempHP]) }}/{{ c.maxHP() }}<br />PP {{ c.currentPP }}</span>
      </button>
      <div v-if="creatures.length === 0" class="empty">暂无角色，请先导入角色卡。</div>
    </aside>

    <main v-if="current" class="character-detail">
      <header class="detail-header">
        <div>
          <h2>{{ current.name() }} <small>{{ current.code() }}</small></h2>
          <p>{{ current.profile.gender }}性{{ current.profile.species }}（{{ current.profile.pronoun }}），年龄 {{ current.profile.age }}</p>
        </div>
        <button class="danger" @click="deleteCurrent">删除</button>
      </header>

      <nav class="sub-tabs">
        <button v-for="p in ['summary','ability','adjust','type','feature','equipment','move','class']" :key="p" :class="{ active: page === p }" @click="page = p">
          {{ ({summary:'概要', ability:'能力', adjust:'调整', type:'属性抗性', feature:'特性', equipment:'装备道具', move:'招式', class:'种族职业'} as Record<string,string>)[p] }}
        </button>
      </nav>

      <section v-if="page === 'summary'" class="detail-section">
        <div class="resource-grid">
          <label>HP <input v-model.number="current.currentHP" type="number" /> / {{ current.maxHP() }}</label>
          <label>护盾 <input v-model.number="current.tempHP" type="number" /></label>
          <label>PP <input v-model.number="current.currentPP" type="number" /> / {{ current.maxPP() }}</label>
          <label>阵营 <select v-model="current.faction"><option>玩家</option><option>友方</option><option>中立</option><option>敌方</option></select></label>
        </div>
        <div class="chip-row">
          <span>PLV {{ current.characterLv() }}</span><span>CR {{ current.battleLv() }}</span><span>施法 {{ current.castLv() }}</span><span>{{ sizeString(current.sizeAbility.size) }}</span><span>移动 {{ current.sizeAbility.mov }}m</span><span>负重 {{ totalWeight(current).toFixed(2) }}</span>
        </div>
        <h3>当前状态</h3>
        <div class="chip-row"><span v-for="s in activeStatuses" :key="s.name">{{ s.name }} {{ s.stack }}</span><span v-if="activeStatuses.length === 0">无</span></div>
        <h3>战斗数值</h3>
        <table><tbody><tr v-for="row in battleRows(current)" :key="row[0]"><th>{{ row[0] }}</th><td>{{ row[1] }}</td><td :style="{ color: valueToColor(-(Number(row[2]) || 0)) }">{{ row[2] }}</td></tr></tbody></table>
      </section>

      <section v-else-if="page === 'ability'" class="detail-section">
        <h3>六维</h3>
        <table><thead><tr><th>能力</th><th>值</th><th>调整值</th><th>豁免</th></tr></thead><tbody><tr v-for="r in abilityRows(current)" :key="r.name"><td>{{ r.name }}</td><td>{{ r.value }}</td><td>{{ r.mod }}</td><td>{{ r.save }}</td></tr></tbody></table>
        <h3>技能</h3>
        <table><tbody><tr v-for="s in Skill.nameList" :key="s"><td>{{ s }}</td><td>{{ current.skillMod(s) }}</td><td>豁免 {{ current.skillSave(s) }}</td><td>优劣势 {{ current.skillAdvance.get(s) }}</td></tr></tbody></table>
      </section>

      <section v-else-if="page === 'adjust'" class="detail-section">
        <div class="adjust-header">
          <div>
            <h3>DM 临时调整</h3>
            <p class="hint">这里修改的是角色模型上的临时字段，会直接影响战斗、AOE、检定和先攻。</p>
          </div>
          <button class="danger" @click="resetAdjustments(current)">清空临时调整</button>
        </div>

        <h3>战斗属性修正</h3>
        <table>
          <thead><tr><th>项目</th><th>当前值</th><th>常驻</th><th>装备</th><th>临时%</th><th>状态%</th></tr></thead>
          <tbody>
            <tr v-for="row in attributeAdjustRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ current.attribute(row.index) }}</td>
              <td><input v-model.number="current.attributeDBase[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input v-model.number="current.attributeDEquip[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input v-model.number="current.attributeDChange[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td :style="{ color: valueToColor(-current.grandStatus().attributeMdf.get(row.index)) }">{{ toMod(current.grandStatus().attributeMdf.get(row.index)) }}</td>
            </tr>
          </tbody>
        </table>

        <h3>六维临时修正与优劣势</h3>
        <table>
          <thead><tr><th>能力</th><th>当前值</th><th>调整值</th><th>豁免</th><th>临时修正</th><th>攻击优劣势</th><th>检定优劣势</th><th>豁免优劣势</th><th>状态修正</th></tr></thead>
          <tbody>
            <tr v-for="row in abilityAdjustRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ current.ability(row.index) }}</td>
              <td>{{ current.modifier(row.index) }}</td>
              <td>{{ current.save(row.index) }}</td>
              <td><input v-model.number="current.abilityBaseD[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input class="num-inp" type="number" :value="dmAbilityAdvance(current, 'abilityMoveMdf', row.key)" @input="setDmAbilityAdvance(current, 'abilityMoveMdf', row.key, Number(($event.target as HTMLInputElement).value))" /></td>
              <td><input class="num-inp" type="number" :value="dmAbilityAdvance(current, 'abilityCheckMdf', row.key)" @input="setDmAbilityAdvance(current, 'abilityCheckMdf', row.key, Number(($event.target as HTMLInputElement).value))" /></td>
              <td><input class="num-inp" type="number" :value="dmAbilityAdvance(current, 'abilitySaveMdf', row.key)" @input="setDmAbilityAdvance(current, 'abilitySaveMdf', row.key, Number(($event.target as HTMLInputElement).value))" /></td>
              <td :style="{ color: valueToColor(-current.grandStatus().abilityMdf.get(row.index)) }">{{ toMod(current.grandStatus().abilityMdf.get(row.index)) }}</td>
            </tr>
          </tbody>
        </table>

        <h3>战斗能力修正</h3>
        <table>
          <thead><tr><th>项目</th><th>当前值</th><th>基础</th><th>装备</th><th>状态栏</th><th>临时</th><th>状态效果</th></tr></thead>
          <tbody>
            <tr v-for="row in battleAbilityAdjustRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ current.getBattleAbilityD(row.index) + (row.key === 'initiative' ? current.initiativeRaw() : row.key === 'acc' ? current.accuracyRaw() : row.key === 'eva' ? current.evasionRaw() : current.effectPowerRaw()) }}</td>
              <td><input v-model.number="current.battleAbilityDBase[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input v-model.number="current.battleAbilityDEquip[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input v-model.number="current.battleAbilityDState[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td><input v-model.number="current.battleAbilityDChange[row.key]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td :style="{ color: valueToColor(-current.grandStatus().battleAbilityMdf.get(row.index)) }">{{ toMod(current.grandStatus().battleAbilityMdf.get(row.index)) }}</td>
            </tr>
          </tbody>
        </table>

        <h3>技能检定/豁免优劣势</h3>
        <table>
          <thead><tr><th>技能</th><th>检定</th><th>豁免</th><th>DM优劣势</th><th>检定状态</th><th>豁免状态</th></tr></thead>
          <tbody>
            <tr v-for="(skill, index) in Skill.nameList" :key="skill">
              <td>{{ skill }}</td>
              <td>{{ current.skillMod(skill) }}</td>
              <td>{{ current.skillSave(skill) }}</td>
              <td><input v-model.number="current.skillAdvance.value[index]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td :style="{ color: valueToColor(-current.skillCheckAdvanceStatus(skill)) }">{{ toMod(current.skillCheckAdvanceStatus(skill)) }}</td>
              <td :style="{ color: valueToColor(-current.skillSaveAdvanceStatus(skill)) }">{{ toMod(current.skillSaveAdvanceStatus(skill)) }}</td>
            </tr>
          </tbody>
        </table>

        <h3>属性一致临时修正</h3>
        <table>
          <thead><tr><th>属性</th><th>当前属性一致</th><th>DM修正</th><th>当前伤害修正</th><th>DM抗性修正</th></tr></thead>
          <tbody>
            <tr v-for="(elem, index) in ElemType.nameList" :key="elem">
              <td>{{ elem }}</td>
              <td>{{ current.typeStab(elem) }}</td>
              <td><input v-model.number="current.typeChange.value[index]" class="num-inp" type="number" @change="refreshCurrent" /></td>
              <td>{{ current.typeMdf(elem) }}</td>
              <td><input v-model.number="current.typeMdfChange.value[index]" class="num-inp" type="number" @change="refreshCurrent" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="page === 'type'" class="detail-section">
        <table><thead><tr><th>属性</th><th>属性一致</th><th>伤害修正</th></tr></thead><tbody><tr v-for="e in ElemType.nameList" :key="e" :style="{ color: valueToColorBinary(current.typeStab(e) + current.typeMdf(e)) }"><td>{{ e }}</td><td>{{ current.typeStab(e) }}</td><td>{{ current.typeMdf(e) }}</td></tr></tbody></table>
      </section>

      <section v-else-if="page === 'feature'" class="detail-section">
        <input v-model="featureKeyword" class="search" placeholder="搜索特性" />
        <article v-for="f in features" :key="`${f.source}-${f.name}`" class="info-block"><h3>{{ f.name }} <small>{{ f.source }} {{ f.sourceLevel }}</small></h3><p>{{ f.description || '无描述' }}</p></article>
      </section>

      <section v-else-if="page === 'equipment'" class="detail-section">
        <input v-model="equipmentKeyword" class="search" placeholder="搜索装备或道具" />
        <article v-for="x in equipmentRows" :key="JSON.stringify(x)" class="info-block">
          <h3>{{ 'quantity' in x ? x.name : x.name }} <small>{{ 'slot' in x ? x.slot : x.type }}</small></h3>
          <p>{{ 'performance' in x ? x.performance : x.effect }}</p>
          <p>{{ x.description }}</p>
          <div class="chip-row"><span v-for="t in tagList(x.tags)" :key="t">{{ t }}</span></div>
        </article>
      </section>

      <section v-else-if="page === 'move'" class="detail-section">
        <select v-model="selectedMove"><option value="">选择招式</option><option v-for="m in current.moves" :key="m.name" :value="m.name">{{ m.name }}</option></select>
        <article v-if="currentMove" class="info-block">
          <h3>{{ currentMove.name }} <small>{{ currentMove.ring }}环 {{ currentMove.elemType }}</small></h3>
          <p>消耗：{{ currentMove.costs() }}；射程：{{ currentMove.castRange || '无' }}；持续：{{ currentMove.duration || '瞬时' }}；材料：{{ currentMove.components() }}</p>
          <p>威力：{{ currentMove.powerList.map((p) => p.message()).join(' / ') }}</p>
          <p>{{ currentMove.description }}</p>
        </article>
      </section>

      <section v-else class="detail-section">
        <table><thead><tr><th>类型</th><th>名称</th><th>等级</th><th>CR倍率</th><th>施法倍率</th><th>属性</th></tr></thead><tbody><tr v-for="r in current.races" :key="`${r.type}-${r.name}`"><td>{{ r.type }}</td><td>{{ r.name }}</td><td>{{ r.lv }}</td><td>{{ r.battleScale }}</td><td>{{ r.castScale }}</td><td>{{ r.attribute.hp }}/{{ r.attribute.patk }}/{{ r.attribute.pdef }}/{{ r.attribute.satk }}/{{ r.attribute.sdef }}/{{ r.attribute.spd }}/{{ r.attribute.pp }}</td></tr></tbody></table>
      </section>
    </main>
  </div>
</template>

<style scoped>
.characters-tab { height: 100%; display: flex; min-width: 0; background: #fff; }
.character-list { width: 15em; flex-shrink: 0; overflow-y: auto; border-right: 1px solid #ddd; background: #fafafa; }
.list-controls { display: flex; gap: 4px; padding: 6px; position: sticky; top: 0; background: #fafafa; z-index: 2; }
.list-controls select { min-width: 0; flex: 1; font-size: 12px; }
.character-row { position: relative; display: flex; width: 100%; gap: 6px; align-items: center; border: 0; border-bottom: 1px solid #eee; background: transparent; padding: 6px 8px; cursor: pointer; text-align: left; overflow: hidden; }
.character-row.selected { background: #222; color: #fff; }
.hp-fill { position: absolute; inset: 0 auto 0 0; opacity: .22; }
.row-main, .row-vitals { position: relative; z-index: 1; }
.row-main { flex: 1; min-width: 0; display: grid; }
.row-main b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-main small, h2 small { color: #777; font-weight: 400; }
.selected .row-main small { color: #ddd; }
.row-vitals { font-size: 11px; text-align: right; white-space: nowrap; }
.character-detail { flex: 1; min-width: 0; overflow: auto; padding: 10px; }
.detail-header { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
h2 { margin: 0; font-size: 20px; }
h3 { margin: 10px 0 5px; font-size: 14px; }
p { margin: 4px 0; white-space: pre-line; }
.sub-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
button, select, input { font: inherit; }
.sub-tabs button, .danger { border: 1px solid #ccc; background: #f5f5f5; padding: 4px 8px; cursor: pointer; }
.sub-tabs button.active { background: #222; color: #fff; }
.danger { color: #fff; background: #d32f2f; border-color: #b71c1c; }
.resource-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.resource-grid label { display: flex; align-items: center; gap: 4px; }
.resource-grid input { width: 5em; }
.chip-row { display: flex; flex-wrap: wrap; gap: 5px; }
.chip-row span { border: 1px solid #ddd; background: #f6f6f6; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border: 1px solid #e0e0e0; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #f5f5f5; }
.search { width: 100%; box-sizing: border-box; padding: 5px 8px; margin-bottom: 8px; border: 1px solid #ccc; }
.info-block { border: 1px solid #e0e0e0; padding: 8px; margin-bottom: 8px; border-radius: 4px; }
.empty { padding: 1em; color: #999; text-align: center; }
@media (max-width: 620px) { .characters-tab { flex-direction: column; } .character-list { width: 100%; max-height: 38%; border-right: 0; border-bottom: 1px solid #ddd; } }
</style>
