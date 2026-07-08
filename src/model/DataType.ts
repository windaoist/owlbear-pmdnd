export class Profile {
  name: string
  code: string
  species: string
  gender: string
  pronoun: string
  age: string
  constructor(
    name: string,
    code: string,
    species: string,
    gender_name: string,
    gender: string,
    age: string
  ) {
    this.name = name
    this.code = code
    this.species = species
    this.gender = gender_name
    this.pronoun = gender
    this.age = age
  }
}

export class Relative {
  name: string
  relationship: string
  description: string
  constructor(name: string, relationship: string, description: string) {
    this.name = name
    this.relationship = relationship
    this.description = description
  }
}

export class Ability {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
  constructor(
    str: number = 0,
    dex: number = 0,
    con: number = 0,
    int: number = 0,
    wis: number = 0,
    cha: number = 0
  ) {
    this.str = str
    this.dex = dex
    this.con = con
    this.int = int
    this.wis = wis
    this.cha = cha
    this.validate()
  }

  get(index: number): number {
    if (index < 0 || index > 5) {
      return 0
    }
    return [this.str, this.dex, this.con, this.int, this.wis, this.cha][index]
  }

  add(x: Ability): void {
    this.str += x.str
    this.dex += x.dex
    this.con += x.con
    this.int += x.int
    this.wis += x.wis
    this.cha += x.cha
    this.validate()
  }

  trim(): void {
    this.str = Math.min(Math.max(-99, this.str), 99)
    this.dex = Math.min(Math.max(-99, this.dex), 99)
    this.con = Math.min(Math.max(-99, this.con), 99)
    this.int = Math.min(Math.max(-99, this.int), 99)
    this.wis = Math.min(Math.max(-99, this.wis), 99)
    this.cha = Math.min(Math.max(-99, this.cha), 99)
  }

  validate(): void {
    this.str = Number(this.str) || 0
    this.dex = Number(this.dex) || 0
    this.con = Number(this.con) || 0
    this.int = Number(this.int) || 0
    this.wis = Number(this.wis) || 0
    this.cha = Number(this.cha) || 0
    this.str = isFinite(this.str) ? this.str : 0
    this.dex = isFinite(this.dex) ? this.dex : 0
    this.con = isFinite(this.con) ? this.con : 0
    this.int = isFinite(this.int) ? this.int : 0
    this.wis = isFinite(this.wis) ? this.wis : 0
    this.cha = isFinite(this.cha) ? this.cha : 0
  }
}

export class BattleAbility {
  initiative: number
  acc: number
  eva: number
  pwr: number
  constructor(initiative: number = 0, acc: number = 0, eva: number = 0, pwr: number = 0) {
    this.initiative = initiative
    this.acc = acc
    this.eva = eva
    this.pwr = pwr
    this.validate()
  }

  get(index: number): number {
    return [this.initiative, this.acc, this.eva, this.pwr][index]
  }

  add(x: BattleAbility): void {
    this.initiative += x.initiative
    this.acc += x.acc
    this.eva += x.eva
    this.pwr += x.pwr
    this.validate()
  }

  validate(): void {
    this.initiative = Number(this.initiative) || 0
    this.acc = Number(this.acc) || 0
    this.eva = Number(this.eva) || 0
    this.pwr = Number(this.pwr) || 0
    this.initiative = isFinite(this.initiative) ? this.initiative : 0
    this.acc = isFinite(this.acc) ? this.acc : 0
    this.eva = isFinite(this.eva) ? this.eva : 0
    this.pwr = isFinite(this.pwr) ? this.pwr : 0
  }
}

export class SizeAbility {
  height: number
  weight: number
  size: number
  originalSize: string
  reach: number
  mov: number
  constructor(
    height: number,
    weight: number,
    size: number,
    reach: number,
    mov: number,
    originalSize: string = ''
  ) {
    this.height = height
    this.weight = weight
    this.size = size
    this.originalSize = originalSize
    this.reach = reach
    this.mov = mov
    this.validate()
  }

  get(index: number): number {
    return [this.height, this.weight, this.size, this.reach, this.mov][index]
  }

  validate(): void {
    this.height = Number(this.height) || 0
    this.weight = Number(this.weight) || 0
    this.size = Number(this.size) || 1
    this.reach = Number(this.reach) || 0
    this.mov = Number(this.mov) || 0
    this.height = isFinite(this.height) ? this.height : 0
    this.weight = isFinite(this.weight) ? this.weight : 0
    this.size = isFinite(this.size) && this.size >= 0.5 ? this.size : 1
    this.reach = isFinite(this.reach) ? this.reach : 0
    this.mov = isFinite(this.mov) ? this.mov : 0
  }
}

export function sizeString(footprint: number): string {
  if (footprint < 1) return '微型'
  if (footprint < 2) return '小型/中型'
  return '大型'
}

export class Attribute {
  hp: number
  patk: number
  pdef: number
  satk: number
  sdef: number
  spd: number
  pp: number
  constructor(
    hp: number = 0,
    patk: number = 0,
    pdef: number = 0,
    satk: number = 0,
    sdef: number = 0,
    spd: number = 0,
    pp: number = 0
  ) {
    this.hp = hp
    this.patk = patk
    this.pdef = pdef
    this.satk = satk
    this.sdef = sdef
    this.spd = spd
    this.pp = pp
    this.validate()
  }

  get(index: number): number {
    return [this.hp, this.patk, this.pdef, this.satk, this.sdef, this.spd, this.pp][index]
  }

  sum(): number {
    return Math.max(1, this.hp + this.patk + this.pdef + this.satk + this.sdef + this.spd)
  }

  add(x: Attribute): void {
    this.hp += x.hp
    this.patk += x.patk
    this.pdef += x.pdef
    this.satk += x.satk
    this.sdef += x.sdef
    this.spd += x.spd
    this.pp += x.pp
    this.validate()
  }

  getWithLv(index: number, lv: number): number {
    if (index == 6) {
      return this.get(index) * lv
    }
    return (6 * this.get(index) * lv) / this.sum()
  }

  validate(): void {
    this.hp = Number(this.hp) || 0
    this.patk = Number(this.patk) || 0
    this.pdef = Number(this.pdef) || 0
    this.satk = Number(this.satk) || 0
    this.sdef = Number(this.sdef) || 0
    this.spd = Number(this.spd) || 0
    this.pp = Number(this.pp) || 0
    this.hp = isFinite(this.hp) ? this.hp : 0
    this.patk = isFinite(this.patk) ? this.patk : 0
    this.pdef = isFinite(this.pdef) ? this.pdef : 0
    this.satk = isFinite(this.satk) ? this.satk : 0
    this.sdef = isFinite(this.sdef) ? this.sdef : 0
    this.spd = isFinite(this.spd) ? this.spd : 0
    this.pp = isFinite(this.pp) ? this.pp : 0
  }
}

export class Race {
  type: string
  name: string
  lv: number
  battleScale: number
  castScale: number
  attribute: Attribute
  cantripCount: number
  constructor(
    type: string,
    name: string,
    lv: number,
    battleScale: number,
    castScale: number,
    attribute: Attribute,
    cantripCount: number
  ) {
    this.type = type
    this.name = name
    this.lv = lv
    this.battleScale = battleScale
    this.castScale = castScale
    this.attribute = attribute
    this.cantripCount = cantripCount
    this.validate()
  }

  battleLv(): number {
    return this.lv * this.battleScale
  }

  castLv(): number {
    return this.battleLv() * this.castScale
  }

  spellCount(): number {
    if (this.type == '种族') {
      return Math.floor(this.lv / 50)
    }
    return Math.floor(this.castLv() / 10)
  }

  getAttribute(index: number): number {
    return this.attribute.getWithLv(index, this.battleLv())
  }

  validate(): void {
    this.lv = Number(this.lv) || 0
    this.battleScale = Number(this.battleScale) || 0
    this.castScale = Number(this.castScale) || 0
    this.cantripCount = Number(this.cantripCount) || 0
    this.lv = isFinite(this.lv) ? this.lv : 0
    this.battleScale = isFinite(this.battleScale) ? this.battleScale : 0
    this.castScale = isFinite(this.castScale) ? this.castScale : 0
    this.cantripCount = isFinite(this.cantripCount) ? this.cantripCount : 0
    this.attribute.validate()
  }
}

export class MovePower {
  idx: number
  power: number
  elemType: string
  psType: string
  aspect: string
  isStatus: boolean
  extra: string

  constructor(
    idx: number,
    power: number,
    elemType: string,
    psType: string,
    aspect: string,
    isStatus: boolean,
    extra: string
  ) {
    this.idx = idx
    this.power = power
    this.elemType = elemType
    this.psType = psType
    this.aspect = aspect
    this.isStatus = isStatus
    this.extra = extra
    this.validate()
  }

  message(): string {
    if (this.power == 0) {
      return '无威力'
    }
    return (
      `${this.power} ${this.elemType}` +
      (damageTypeList.includes(this.elemType)
        ? `${this.psType}` + (this.aspect == '无性相' ? '' : this.aspect)
        : '') +
      (this.isStatus ? '状态' : '') +
      this.extra
    )
  }

  validate(): void {
    this.power = Number(this.power) || 0
    this.power = isFinite(this.power) ? this.power : 0

    if (!damageTypeList.concat(['治疗', '护盾']).includes(this.elemType)) {
      this.elemType = '无属性'
    }
    if (damageTypeList.includes(this.elemType)) {
      if (this.psType != '物理' && this.psType != '特殊') {
        this.psType = '物理'
      }
    } else {
      this.psType = '特殊'
    }
    if (!damageAspectList.includes(this.aspect)) {
      this.aspect = '无性相'
    }

    if (this.power == 0) {
      this.isStatus = true
    }
  }
}

export class Move {
  inMemory: string
  ring: number

  name: string
  elemType: string
  castAbility: string

  powerList: MovePower[]

  costAction: string
  costBonusAction: string
  costReaction: string
  costMove: string
  costPP: number
  costOther: string

  castRange: string
  duration: string
  concentration: string

  charge: number
  maxCharge: number
  chargeAt: string

  cooldown: string

  V: string
  S: string
  M: string

  description: string

  constructor(
    inMemory: string = '',
    ring: number = 1,
    name: string = '',
    elemType: string = '无属性',
    castAbility: string = '无加成',
    powerList: MovePower[] = [],
    costAction: string = '',
    costBonusAction: string = '',
    costReaction: string = '',
    costMove: string = '',
    costPP: number = 0,
    costOther: string = '',
    castRange: string = '',
    duration: string = '',
    concentration: string = '',
    charge: number = 0,
    maxCharge: number = 0,
    chargeAt: string = '',
    cooldown: string = '',
    V: string = '',
    S: string = '',
    M: string = '',
    description: string = ''
  ) {
    this.inMemory = inMemory
    this.ring = ring

    this.name = name
    this.elemType = elemType
    this.castAbility = castAbility

    this.powerList = powerList

    this.costAction = costAction
    this.costBonusAction = costBonusAction
    this.costReaction = costReaction
    this.costMove = costMove
    this.costPP = costPP
    this.costOther = costOther

    this.castRange = castRange
    this.duration = duration
    this.concentration = concentration

    this.charge = charge
    this.maxCharge = maxCharge
    this.chargeAt = chargeAt

    this.cooldown = cooldown

    this.V = V
    this.S = S
    this.M = M

    this.description = description

    this.validate()
  }

  costs(): string {
    const s: string[] = []
    s.push(`${this.costPP} PP`)
    if (this.costAction.length > 0) {
      s.push(
        `${this.costAction} ${this.costAction.includes('*') ? '攻击' : ''}动作${this.costAction.includes('x') ? '每回合' : ''}`
      )

      if (
        this.costAction.includes('?') &&
        (this.costBonusAction.length > 0 || this.costReaction.length > 0)
      ) {
        s.push('或')
      }
    }
    if (this.costBonusAction.length > 0) {
      s.push(
        `${this.costBonusAction} 附赠动作${this.costBonusAction.includes('x') ? '每回合' : ''}`
      )

      if (this.costBonusAction.includes('?') && this.costReaction.length > 0) {
        s.push('或')
      }
    }
    if (this.costReaction.length > 0) {
      s.push(`${this.costReaction} 反应${this.costReaction.includes('x') ? '每回合' : ''}`)
    }
    if (this.costMove.length > 0) {
      s.push(`${this.costMove}m 移动力${this.costMove.includes('x') ? '每回合' : ''}`)
    }
    if (this.costOther.length > 0) {
      s.push(this.costOther)
    }
    return s.join('，')
  }

  components(): string {
    const s: string[] = []
    if (this.V.length > 0) {
      s.push('V')
    }
    if (this.S.length > 0) {
      s.push('S')
    }
    if (this.M.length > 0) {
      s.push(`M（${this.M}）`)
    }
    if (s.length <= 0) {
      return '无'
    }
    return s.join('，')
  }

  validate(): void {
    this.inMemory = String(this.inMemory || '')
    this.ring = Number(this.ring) || 0

    this.name = String(this.name || '')
    if (!damageTypeList.includes(this.elemType)) {
      this.elemType = '无属性'
    }
    this.castAbility = String(this.castAbility || '无加成')

    if (!Array.isArray(this.powerList)) {
      this.powerList = []
    }
    for (let i = 0; i < this.powerList.length; i++) {
      this.powerList[i].validate()
    }

    this.costAction = String(this.costAction || '')
    this.costBonusAction = String(this.costBonusAction || '')
    this.costReaction = String(this.costReaction || '')
    this.costMove = String(this.costMove || '')
    this.costOther = String(this.costOther || '')
    this.costPP = Math.max(0, Number(this.costPP) || 0)

    this.castRange = String(this.castRange || '')
    this.duration = String(this.duration || '')
    this.concentration = String(this.concentration || '')

    this.charge = Math.max(0, Number(this.charge) || 0)
    this.maxCharge = Math.max(0, Number(this.maxCharge) || 0)
    this.chargeAt = String(this.chargeAt || '')

    this.cooldown = String(this.cooldown || '')

    this.V = String(this.V || '')
    this.S = String(this.S || '')
    this.M = String(this.M || '')

    this.description = String(this.description || '')
  }
}

export class Skill {
  value: number[]
  static nameList: string[] = [
    '运动',
    '体操',
    '巧手',
    '隐匿',
    '专注',
    '调查',
    '奥秘',
    '历史',
    '自然',
    '宗教',
    '察觉',
    '洞悉',
    '医药',
    '求生',
    '游说',
    '欺瞒',
    '威吓',
    '表演'
  ]
  constructor(value: number[]) {
    this.value = value
    this.validate()
  }

  get(name: string): number {
    const index: number = Skill.nameList.findIndex((v) => v == name)
    if (index < 0) {
      return 0
    }
    return this.value[index]
  }

  validate(): void {
    for (let i = 0; i < this.value.length; i++) {
      this.value[i] = Number(this.value[i]) || 0
      this.value[i] = isFinite(this.value[i]) ? this.value[i] : 0
    }
  }
}

export class ElemType {
  value: number[]
  static nameList: string[] = [
    '一般', // 0
    '力场', // 1
    '格斗', // 2
    '飞行', // 3
    '毒', // 4
    '酸', // 5
    '地面', // 6
    '岩石', // 7
    '虫', // 8
    '幽灵', // 9
    '钢', // 10
    '火', // 11
    '水', // 12
    '草', // 13
    '电', // 14
    '超能力', // 15
    '冰', // 16
    '龙', // 17
    '恶', // 18
    '妖精', // 19
    '光耀', // 20
    '黯蚀', // 21
    '钝击', // 22
    '挥砍', // 23
    '穿刺' // 24
  ]
  constructor(
    value: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ) {
    this.value = value
    this.validate()
  }

  get(name: string): number {
    const index: number = ElemType.nameList.findIndex((v) => v == name)
    if (index < 0) {
      return 0
    }
    return this.value[index]
  }

  validate(): void {
    this.value.length = ElemType.nameList.length
    for (let i = 0; i < this.value.length; i++) {
      this.value[i] = Number(this.value[i]) || 0
      this.value[i] = isFinite(this.value[i]) ? this.value[i] : 0
    }
  }
}

export class Status {
  type: boolean // false: 持续型状态；true: 累积型状态
  name: string
  stack: number

  parentName: string
  parentSave: string
  parentStack: number
  childName: string
  oppositeName: string

  grandMdf: number
  typeMdf: ElemType

  lossOnTurn: number
  lossOnHit: number
  lossOnHeal: number

  attributeMdf: Attribute
  abilityMdf: Ability
  battleAbilityMdf: BattleAbility

  abilityMoveMdf: Ability
  abilityCheckMdf: Ability
  abilitySaveMdf: Ability
  onAttackMdf: number
  underAttackMdf: number

  actionMdf: number
  bonusActionMdf: number
  reactionMdf: number
  movMdf: number

  incapacitated: boolean // 命中减值无效
  damageOnTurn: MovePower[]

  removeAt: number // 1: 初等复原术；2: 高等复原术
  cannotMove: boolean = false
  autoCrit: boolean = false

  constructor(
    type: boolean,
    name: string,
    stack: number,
    parentName: string,
    parentSave: string,
    parentStack: number,
    childName: string,
    oppositeName: string,
    grandMdf: number,
    typeMdf: ElemType,
    lossOnTurn: number,
    lossOnHit: number,
    lossOnHeal: number,
    attributeMdf: Attribute,
    abilityMdf: Ability,
    battleAbilityMdf: BattleAbility,
    abilityMoveMdf: Ability,
    abilityCheckMdf: Ability,
    abilitySaveMdf: Ability,
    onAttackMdf: number,
    underAttackMdf: number,
    actionMdf: number,
    bonusActionMdf: number,
    reactionMdf: number,
    movMdf: number,
    incapacitated: boolean,
    damageOnTurn: MovePower[],
    removeAt: number,
    cannotMove: boolean = false,
    autoCrit: boolean = false
  ) {
    this.type = type
    this.name = name
    this.stack = stack

    this.parentName = parentName
    this.parentSave = parentSave
    this.parentStack = parentStack
    this.childName = childName
    this.oppositeName = oppositeName
    this.grandMdf = grandMdf
    this.typeMdf = typeMdf
    this.lossOnTurn = lossOnTurn
    this.lossOnHit = lossOnHit
    this.lossOnHeal = lossOnHeal
    this.attributeMdf = attributeMdf
    this.abilityMdf = abilityMdf
    this.battleAbilityMdf = battleAbilityMdf
    this.abilityMoveMdf = abilityMoveMdf
    this.abilityCheckMdf = abilityCheckMdf
    this.abilitySaveMdf = abilitySaveMdf
    this.onAttackMdf = onAttackMdf
    this.underAttackMdf = underAttackMdf

    this.actionMdf = actionMdf
    this.bonusActionMdf = bonusActionMdf
    this.reactionMdf = reactionMdf
    this.movMdf = movMdf
    this.incapacitated = incapacitated
    this.damageOnTurn = damageOnTurn
    this.removeAt = removeAt
    this.cannotMove = cannotMove
    this.autoCrit = autoCrit
    this.validate()
  }
  validate(): void {
    this.stack = Math.max(0, Math.floor(this.stack) || 0)
    this.grandMdf = Number(this.grandMdf) || 0
    this.parentStack = Math.max(0, Math.floor(this.parentStack) || 0)
    this.lossOnTurn = Math.max(0, Math.floor(this.lossOnTurn) || 0)
    this.lossOnHit = Math.max(0, Math.floor(this.lossOnHit) || 0)
    this.attributeMdf.validate()
    this.abilityMdf.validate()
    this.battleAbilityMdf.validate()
    this.abilityMoveMdf.validate()
    this.abilityCheckMdf.validate()
    this.abilitySaveMdf.validate()
    this.onAttackMdf = Math.floor(this.onAttackMdf) || 0
    this.underAttackMdf = Math.floor(this.underAttackMdf) || 0
    this.actionMdf = Math.floor(this.actionMdf) || 0
    this.bonusActionMdf = Math.floor(this.bonusActionMdf) || 0
    this.reactionMdf = Math.floor(this.reactionMdf) || 0
    this.movMdf = Math.floor(this.movMdf) || 0
    this.removeAt = Math.floor(this.removeAt) || 0
    this.damageOnTurn.forEach((v) => {
      v.validate()
    })
  }

  duplicate(): Status {
    return new Status(
      this.type,
      this.name,
      this.stack,
      this.parentName,
      this.parentSave,
      this.parentStack,
      this.childName,
      this.oppositeName,
      this.grandMdf,
      this.typeMdf,
      this.lossOnTurn,
      this.lossOnHit,
      this.lossOnHeal,
      this.attributeMdf,
      this.abilityMdf,
      this.battleAbilityMdf,
      this.abilityMoveMdf,
      this.abilityCheckMdf,
      this.abilitySaveMdf,
      this.onAttackMdf,
      this.underAttackMdf,
      this.actionMdf,
      this.bonusActionMdf,
      this.reactionMdf,
      this.movMdf,
      this.incapacitated,
      this.damageOnTurn,
      this.removeAt,
      this.cannotMove,
      this.autoCrit
    )
  }
}

export class ExtraResist {
  name: string
  race: number
  classes: number
  ability: number
  equip: number
  state: number
  change: number
  constructor(
    name: string,
    race: number,
    classes: number,
    ability: number,
    equip: number,
    state: number,
    change: number
  ) {
    this.name = name
    this.race = race
    this.classes = classes
    this.ability = ability
    this.equip = equip
    this.state = state
    this.change = change
    this.validate()
  }

  get(index: number): number {
    return [this.race, this.classes, this.ability, this.equip, this.state, this.change][index]
  }

  sum(): number {
    return this.race + this.classes + this.ability + this.equip + this.state + this.change
  }

  validate(): void {
    this.race = Number(this.race) || 0
    this.classes = Number(this.classes) || 0
    this.ability = Number(this.ability) || 0
    this.equip = Number(this.equip) || 0
    this.state = Number(this.state) || 0
    this.change = Number(this.change) || 0
    this.race = isFinite(this.race) ? this.race : 0
    this.classes = isFinite(this.classes) ? this.classes : 0
    this.ability = isFinite(this.ability) ? this.ability : 0
    this.equip = isFinite(this.equip) ? this.equip : 0
    this.state = isFinite(this.state) ? this.state : 0
    this.change = isFinite(this.change) ? this.change : 0
  }
}

export class Feature {
  name: string // 特性名
  innate: boolean // 是否为该角色固有
  known: boolean // 是否已知
  source: string // 来源
  sourceLevel: string // 来源等级
  description: string // 描述

  constructor(
    name: string = '',
    innate: boolean = false,
    known: boolean = false,
    source: string = '',
    sourceLevel: string = '',
    description: string = ''
  ) {
    this.name = name
    this.innate = innate
    this.known = known
    this.source = source
    this.sourceLevel = sourceLevel
    this.description = description
    this.validate()
  }

  validate(): void {
    this.name = String(this.name || '')
    this.innate = Boolean(this.innate)
    this.known = Boolean(this.known)
    this.source = String(this.source || '')
    this.sourceLevel = String(this.sourceLevel || '')
    this.description = String(this.description || '')
  }
}

const TAG_SEPARATOR_RE = /[、,，;；\n\r|]+/g

export function tagList(tags: unknown): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  const add = (raw: unknown): void => {
    if (raw == null) return
    if (raw instanceof Set) {
      raw.forEach(add)
      return
    }
    if (Array.isArray(raw)) {
      if (raw.length == 2 && raw[0] == 'Set' && Array.isArray(raw[1])) {
        raw[1].forEach(add)
        return
      }
      raw.forEach(add)
      return
    }

    String(raw)
      .split(TAG_SEPARATOR_RE)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .forEach((tag) => {
        if (!seen.has(tag)) {
          seen.add(tag)
          result.push(tag)
        }
      })
  }

  add(tags)
  return result
}

export function tagSet(tags: unknown): Set<string> {
  return new Set(tagList(tags))
}

export class Equipment {
  slot: string // 部位
  usableTypes: string // 可用类型
  name: string // 装备名
  category: string // 装备种类
  performance: string // 装备性能
  tags: Set<string> // 标签
  description: string // 描述
  weight: number // 重量

  constructor(
    slot: string = '',
    usableTypes: string = '',
    name: string = '',
    category: string = '',
    performance: string = '',
    tags: Set<string> = new Set<string>(),
    description: string = '',
    weight: number = 0.0
  ) {
    this.slot = slot
    this.usableTypes = usableTypes
    this.name = name
    this.category = category
    this.performance = performance
    this.tags = tags
    this.description = description
    this.weight = weight
    this.validate()
  }

  validate(): void {
    this.slot = String(this.slot || '')
    this.usableTypes = String(this.usableTypes || '')
    this.name = String(this.name || '')
    this.category = String(this.category || '')
    this.performance = String(this.performance || '')

    this.tags = tagSet(this.tags)

    this.description = String(this.description || '')

    this.weight = Number(this.weight) || 0.0
    this.weight = parseFloat(this.weight.toFixed(2)) // 保留两位小数
  }
}

export class Item {
  type: string // 道具类型
  quantity: number // 数量
  name: string // 道具名
  unitWeight: number // 单位重量
  effect: string // 道具效果
  tags: Set<string> // 标签
  description: string // 描述

  constructor(
    type: string = '',
    quantity: number = 1,
    name: string = '',
    unitWeight: number = 0.0,
    effect: string = '',
    tags: Set<string> = new Set<string>(),
    description: string = ''
  ) {
    this.type = type
    this.quantity = quantity
    this.name = name
    this.unitWeight = unitWeight
    this.effect = effect
    this.tags = tags
    this.description = description
    this.validate()
  }

  validate(): void {
    this.type = String(this.type || '')
    this.quantity = Number(this.quantity) || 1
    this.quantity = isFinite(this.quantity) ? this.quantity : 1
    this.name = String(this.name || '')
    this.unitWeight = Number(this.unitWeight) || 0.0
    this.unitWeight = parseFloat(this.unitWeight.toFixed(2))
    this.effect = String(this.effect || '')

    this.tags = tagSet(this.tags)

    this.description = String(this.description || '')
  }
}

export const damageTypeList = ['无属性'].concat(ElemType.nameList.slice(0, 22))
export const damageAspectList = ['无性相'].concat(ElemType.nameList.slice(22, 25))
export const modifierList = ['无加成', '力量', '敏捷', '体质', '智力', '感知', '魅力']
export const attributeList = ['物攻', '物防', '特攻', '特防', '速度', '自定义']
export const damageAttackList = ['物攻', '特攻', '速度', '物防', '特防', '自定义']
export const damageDefenseList = ['物防', '特防', '速度', '物攻', '特攻', '自定义']
export const skillCheckList = ['力量', '敏捷', '体质', '智力', '感知', '魅力'].concat(
  Skill.nameList
)
export const skillCheckListDisplay = skillCheckList
  .slice(0, 6)
  .concat(['────'])
  .concat(skillCheckList.slice(6, 7))
  .concat(['────'])
  .concat(skillCheckList.slice(7, 10))
  .concat(['────'])
  .concat(skillCheckList.slice(10, 11))
  .concat(['────'])
  .concat(skillCheckList.slice(11, 16))
  .concat(['────'])
  .concat(skillCheckList.slice(16, 20))
  .concat(['────'])
  .concat(skillCheckList.slice(20, 24))

export function skillToModIndex(skill: string): number {
  if (skill == '力量') {
    return 0
  } else if (skill == '敏捷') {
    return 1
  } else if (skill == '体质') {
    return 2
  } else if (skill == '智力') {
    return 3
  } else if (skill == '感知') {
    return 4
  } else if (skill == '魅力') {
    return 5
  } else if (['运动'].includes(skill)) {
    return 0
  } else if (['体操', '巧手', '隐匿'].includes(skill)) {
    return 1
  } else if (['专注'].includes(skill)) {
    return 2
  } else if (['调查', '奥秘', '历史', '自然', '宗教'].includes(skill)) {
    return 3
  } else if (['察觉', '洞悉', '医药', '求生'].includes(skill)) {
    return 4
  } else if (['游说', '欺瞒', '威吓', '表演'].includes(skill)) {
    return 5
  } else {
    return -1
  }
}
