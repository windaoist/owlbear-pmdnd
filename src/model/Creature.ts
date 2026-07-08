import { handleHP } from './Damage'
import {
  Profile,
  Race,
  Attribute,
  Ability,
  BattleAbility,
  SizeAbility,
  Skill,
  ElemType,
  Move,
  Status,
  skillToModIndex,
  attributeList,
  Feature,
  Equipment,
  Item
} from './DataType'
import { ResistManager, StatusManager } from './StatusManager'
import { S_Null } from './Status'
import { toMod } from '../utils'

export class Creature {
  profile: Profile
  races: Race[]
  attributeDBase: Attribute
  attributeDEquip: Attribute
  attributeChange: Attribute
  attributeDChange: Attribute
  attributeChangeBase: Attribute
  abilityBase: Ability
  abilitySave: Ability
  abilityBaseD: Ability
  abilitySaveD: Ability
  battleAbilityDBase: BattleAbility
  battleAbilityDEquip: BattleAbility
  battleAbilityDState: BattleAbility
  battleAbilityDChange: BattleAbility
  sizeAbility: SizeAbility
  skillPro: Skill
  skillRace: Skill
  skillEquip: Skill
  skillState: Skill
  skillAdvance: Skill
  skillMin: Skill
  typeRace: ElemType
  typeClasses: ElemType
  typeAbility: ElemType
  typeEquip: ElemType
  typeState: ElemType
  typeChange: ElemType
  typeMdfRace: ElemType
  typeMdfClasses: ElemType
  typeMdfAbility: ElemType
  typeMdfEquip: ElemType
  typeMdfState: ElemType
  typeMdfChange: ElemType
  legendaryModifier: number
  difficultyModifier: number
  faction: string
  action: number
  bonusAction: number
  reaction: number
  currentHP: number
  tempHP: number
  currentPP: number
  skillCountType: string
  tempInitiative: number
  tempCharacterLv: number
  tempBattleLv: number

  currentAction: number
  currentBonusAction: number
  currentReaction: number
  currentMov: number

  currentLoadCapacity: number

  moves: Move[]

  status: StatusManager
  resist: ResistManager

  classFeatures: Feature[]
  nonClassFeatures: Feature[]

  battleEquipment: Equipment[]
  appearanceEquipment: Equipment[]
  items: Item[]

  constructor(
    profile: Profile,
    races: Race[],
    attributeDBase: Attribute,
    attributeDEquip: Attribute,
    attributeDChange: Attribute,
    attributeChangeBase: Attribute,
    abilityBase: Ability,
    abilitySave: Ability,
    abilityBaseD: Ability,
    abilitySaveD: Ability,
    battleAbilityDBase: BattleAbility,
    battleAbilityDEquip: BattleAbility,
    battleAbilityDState: BattleAbility,
    battleAbilityDChange: BattleAbility,
    sizeAbility: SizeAbility,
    skillPro: Skill,
    skillRace: Skill,
    skillEquip: Skill,
    skillState: Skill,
    skillAdvance: Skill,
    skillMin: Skill,
    typeRace: ElemType,
    typeClasses: ElemType,
    typeAbility: ElemType,
    typeEquip: ElemType,
    typeState: ElemType,
    typeChange: ElemType,
    typeMdfRace: ElemType,
    typeMdfClasses: ElemType,
    typeMdfAbility: ElemType,
    typeMdfEquip: ElemType,
    typeMdfState: ElemType,
    typeMdfChange: ElemType,
    legendaryModifier: number,
    difficultyModifier: number,
    faction: string,
    currentHP: number,
    tempHP: number,
    currentPP: number,
    action: number,
    bonusAction: number,
    reaction: number,
    skillCountType: string,
    moves: Move[],
    status: StatusManager = new StatusManager([]),
    resist: ResistManager = new ResistManager([]),
    currentLoadCapacity: number,
    classFeatures: Feature[] = [],
    nonClassFeatures: Feature[] = [],
    battleEquipment: Equipment[] = [],
    appearanceEquipment: Equipment[] = [],
    items: Item[] = []
  ) {
    this.profile = profile
    this.races = races

    this.attributeDBase = attributeDBase
    this.attributeDEquip = attributeDEquip
    this.attributeDChange = attributeDChange
    this.attributeChange = new Attribute(0, 0, 0, 0, 0, 0, 0)
    this.attributeChangeBase = attributeChangeBase

    this.abilityBase = abilityBase
    this.abilitySave = abilitySave
    this.abilityBaseD = abilityBaseD
    this.abilitySaveD = abilitySaveD

    this.battleAbilityDBase = battleAbilityDBase
    this.battleAbilityDEquip = battleAbilityDEquip
    this.battleAbilityDState = battleAbilityDState
    this.battleAbilityDChange = battleAbilityDChange

    this.sizeAbility = sizeAbility

    this.skillPro = skillPro
    this.skillRace = skillRace
    this.skillEquip = skillEquip
    this.skillState = skillState
    this.skillAdvance = skillAdvance
    this.skillMin = skillMin

    this.typeRace = typeRace
    this.typeClasses = typeClasses
    this.typeAbility = typeAbility
    this.typeEquip = typeEquip
    this.typeState = typeState
    this.typeChange = typeChange

    this.typeMdfRace = typeMdfRace
    this.typeMdfClasses = typeMdfClasses
    this.typeMdfAbility = typeMdfAbility
    this.typeMdfEquip = typeMdfEquip
    this.typeMdfState = typeMdfState
    this.typeMdfChange = typeMdfChange

    this.legendaryModifier = legendaryModifier
    this.difficultyModifier = difficultyModifier
    this.faction = faction

    this.action = action
    this.bonusAction = bonusAction
    this.reaction = reaction

    this.currentHP = currentHP
    this.tempHP = tempHP
    this.currentPP = currentPP

    this.skillCountType = skillCountType
    this.tempInitiative = 1
    this.tempCharacterLv = 0
    this.tempBattleLv = 0

    this.currentAction = action
    this.currentBonusAction = bonusAction
    this.currentReaction = reaction
    this.currentMov = sizeAbility.mov

    this.moves = moves
    this.status = status
    this.resist = resist

    this.currentLoadCapacity = currentLoadCapacity

    this.classFeatures = classFeatures
    this.nonClassFeatures = nonClassFeatures

    this.battleEquipment = battleEquipment
    this.appearanceEquipment = appearanceEquipment
    this.items = items

    this.validate()
  }

  validate(): void {
    this.currentHP = Math.floor(this.currentHP) || 0
    this.tempHP = Math.floor(this.tempHP) || 0
    this.currentPP = Math.floor(this.currentPP) || 0
    this.currentHP = isFinite(this.currentHP) ? this.currentHP : 0
    this.tempHP = Math.max(0, isFinite(this.tempHP) ? this.tempHP : 0)
    this.currentPP = isFinite(this.currentPP) ? this.currentPP : 0

    this.action = Math.round(this.action) || 0
    this.bonusAction = Math.round(this.bonusAction) || 0
    this.reaction = Math.round(this.reaction) || 0
    this.action = isFinite(this.action) ? this.action : 0
    this.bonusAction = isFinite(this.bonusAction) ? this.bonusAction : 0
    this.reaction = isFinite(this.reaction) ? this.reaction : 0

    this.currentAction = Math.round(this.currentAction) || 0
    this.currentBonusAction = Math.round(this.currentBonusAction) || 0
    this.currentReaction = Math.round(this.currentReaction) || 0
    this.currentAction = isFinite(this.currentAction) ? this.currentAction : 0
    this.currentBonusAction = isFinite(this.currentBonusAction) ? this.currentBonusAction : 0
    this.currentReaction = isFinite(this.currentReaction) ? this.currentReaction : 0
    this.currentMov = isFinite(this.currentMov) ? this.currentMov : 0
    this.currentLoadCapacity = isFinite(this.currentLoadCapacity) ? this.currentLoadCapacity : 0

    this.tempInitiative = Math.max(1, Math.min(10, Math.round(this.tempInitiative) || 1))
    this.tempCharacterLv = Math.floor(Number(this.tempCharacterLv) || 0)
    this.tempBattleLv = Math.floor(Number(this.tempBattleLv) || 0)

    if (!this.faction || !['玩家', '友方', '中立', '敌方'].includes(this.faction)) {
      this.faction = '敌方'
    }

    this.restHPCoef = Number(this.restHPCoef) || 0
    this.restPPCoef = Number(this.restPPCoef) || 0
    this.inRound = Boolean(this.inRound)

    this.attributeDBase.validate()
    this.attributeDEquip.validate()
    this.attributeChange.validate()
    this.attributeDChange.validate()
    this.attributeChangeBase.validate()
    this.abilityBase.validate()
    this.abilitySave.validate()
    this.abilityBaseD.validate()
    this.abilitySaveD.validate()
    this.battleAbilityDBase.validate()
    this.battleAbilityDEquip.validate()
    this.battleAbilityDState.validate()
    this.battleAbilityDChange.validate()
    this.sizeAbility.validate()
    this.skillPro.validate()
    this.skillRace.validate()
    this.skillEquip.validate()
    this.skillState.validate()
    this.skillAdvance.validate()
    this.skillMin.validate()
    this.typeRace.validate()
    this.typeClasses.validate()
    this.typeAbility.validate()
    this.typeEquip.validate()
    this.typeState.validate()
    this.typeChange.validate()
    this.typeMdfRace.validate()
    this.typeMdfClasses.validate()
    this.typeMdfAbility.validate()
    this.typeMdfEquip.validate()
    this.typeMdfState.validate()
    this.typeMdfChange.validate()

    for (let i = 0; i < this.races.length; i++) {
      this.races[i].validate()
    }

    for (let i = 0; i < this.moves.length; i++) {
      this.moves[i].validate()
    }

    if (!Array.isArray(this.classFeatures)) {
      this.classFeatures = []
    }
    for (let i = 0; i < this.classFeatures.length; i++) {
      this.classFeatures[i].validate()
    }

    if (!Array.isArray(this.nonClassFeatures)) {
      this.nonClassFeatures = []
    }
    for (let i = 0; i < this.nonClassFeatures.length; i++) {
      this.nonClassFeatures[i].validate()
    }

    if (!Array.isArray(this.battleEquipment)) {
      this.battleEquipment = []
    }
    for (let i = 0; i < this.battleEquipment.length; i++) {
      this.battleEquipment[i].validate()
    }

    if (!Array.isArray(this.appearanceEquipment)) {
      this.appearanceEquipment = []
    }
    for (let i = 0; i < this.appearanceEquipment.length; i++) {
      this.appearanceEquipment[i].validate()
    }

    if (!Array.isArray(this.items)) {
      this.items = []
    }
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].validate()
    }

    this.shallowRefresh()
  }

  shallowRefresh(): void {
    this.status.refreshList()
    this.refreshGrandStatus()
  }

  cachedGrandStatus: Status = S_Null.duplicate()

  grandStatus(): Status {
    return this.cachedGrandStatus
  }

  refreshGrandStatus(): void {
    // costly
    this.cachedGrandStatus = this.status.grandStatus()
  }

  characterLvBase(): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.lv
    })
    return Math.floor(val)
  }

  characterLv(): number {
    return Math.max(1, Math.floor(this.characterLvBase() + this.tempCharacterLv))
  }

  battleLvBase(): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.battleLv()
    })
    return Math.floor(val)
  }

  battleLv(): number {
    return Math.max(1, Math.floor(this.battleLvBase() + this.tempBattleLv))
  }

  battleLvFrom(type: string): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      if (v.type == type) {
        val += v.battleLv()
      }
    })
    return val
  }

  castLv(): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.castLv()
    })
    return Math.floor(val)
  }

  attributeRaw(index: number): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.getAttribute(index)
    })
    const battleLvBase = this.battleLvBase()
    if (battleLvBase > 0 && this.tempBattleLv != 0) {
      val *= this.battleLv() / battleLvBase
    }

    if (index == 0) {
      // HP
      val *= (this.difficultyModifier * this.legendaryModifier * 4 * this.ability(2)) / 10
    } else if (index > 0 && index < 6) {
      val *= this.legendaryModifier * 2.5
    } else if (index == 6) {
      // PP
      val += 40
      val *= this.ability(3) + 10
      val *= this.legendaryModifier
      val /= 20
    }

    return Math.max(1, Math.floor(val + Number.EPSILON))
  }

  attribute(index: number, equip: boolean = true): number {
    // this.validate()
    let val = this.attributeRaw(index)
    const mod1: number = equip
      ? this.attributeDBase.get(index) + this.attributeDEquip.get(index)
      : 0
    const mod2: number =
      this.attributeChange.get(index) +
      this.attributeDChange.get(index) +
      this.status.grandStatus().attributeMdf.get(index)

    if (index > 0 && index < 6) {
      if (mod1 >= 0) {
        val = (val * (100 + mod1)) / 100
      } else {
        val = (val * 100) / (100 - mod1)
      }

      if (mod2 >= 0) {
        val = (val * (100 + mod2)) / 100
      } else {
        val = (val * 100) / (100 - mod2)
      }
    }

    return Math.max(1, Math.floor(val + Number.EPSILON))
  }

  abilityRaw(index: number): number {
    // this.validate()
    return this.abilityBase.get(index)
  }

  ability(index: number): number {
    // this.validate()
    return (
      this.abilityRaw(index) +
      this.abilityBaseD.get(index) +
      this.status.grandStatus().abilityMdf.get(index)
    )
  }

  modifier(index: number): number {
    // this.validate()
    return Math.floor(this.ability(index) / 2 - 5)
  }

  save(index: number): number {
    // this.validate()
    return this.modifier(index) + this.abilitySave.get(index) * 2 + this.abilitySaveD.get(index)
  }

  speedFactor(): number {
    // this.validate()
    const spd = this.attribute(5)
    return Math.log(spd) / Math.log(1.25)
  }

  battleFactor(): number {
    // this.validate()
    return (
      (this.ability(0) + this.ability(1) + this.ability(3) + this.ability(4) + this.ability(5)) / 4
    )
  }

  initiativeRaw(): number {
    // this.validate()
    return Math.floor(this.ability(1) + this.speedFactor())
  }

  getBattleAbilityD(index: number): number {
    // this.validate()
    return (
      this.battleAbilityDBase.get(index) +
      this.battleAbilityDEquip.get(index) +
      this.battleAbilityDState.get(index) +
      this.battleAbilityDChange.get(index) +
      this.status.grandStatus().battleAbilityMdf.get(index)
    )
  }

  initiative(): number {
    // this.validate()
    return Math.floor(this.initiativeRaw() + this.getBattleAbilityD(0))
  }

  accuracyRaw(): number {
    // this.validate()
    return Math.max(0, Math.floor(this.speedFactor() + this.battleFactor() - 24))
  }

  evasionRaw(): number {
    // this.validate()
    return Math.max(0, Math.floor(this.speedFactor() + this.battleFactor() - 24) + this.modifier(1))
  }

  accuracy(): number {
    // this.validate()
    return Math.floor(this.accuracyRaw() + this.getBattleAbilityD(1))
  }

  evasion(): number {
    // this.validate()
    return Math.floor(this.evasionRaw() + this.getBattleAbilityD(2))
  }

  effectPowerRaw(): number {
    // this.validate()
    return Math.floor(10 + this.battleLv() / 40)
  }

  effectPower(): number {
    // this.validate()
    return Math.floor(
      this.effectPowerRaw() +
        this.getBattleAbilityD(3) +
        this.status.grandStatus().battleAbilityMdf.get(3)
    )
  }

  spellCountRaw(): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.spellCount()
    })
    return val
  }

  spellCount(): number {
    // this.validate()
    let val = this.spellCountRaw()
    if (this.skillCountType == '默认') {
      val += Math.floor(this.modifier(3) / 2)
    } else if (this.skillCountType == '智力') {
      val += Math.floor(this.modifier(3))
    } else if (this.skillCountType == '感知') {
      val += Math.floor(this.modifier(4))
    } else if (this.skillCountType == '魅力') {
      val += Math.floor(this.modifier(5))
    }
    return 4 + val
  }

  cantripCount(): number {
    // this.validate()
    let val = 0
    this.races.forEach((v) => {
      val += v.cantripCount
    })
    return val
  }

  memorizedSpellCount(): number {
    let val = 0
    this.moves.forEach((v) => {
      if (v.ring > 0 && v.inMemory == '是') {
        val += 1
      }
    })
    return val
  }

  memorizedCantripCount(): number {
    let val = 0
    this.moves.forEach((v) => {
      if (v.ring == 0 && v.inMemory == '是') {
        val += 1
      }
    })
    return val
  }

  typeStab(index: string): number {
    // this.validate()
    return (
      this.typeRace.get(index) +
      this.typeClasses.get(index) +
      this.typeAbility.get(index) +
      this.typeEquip.get(index) +
      this.typeState.get(index) +
      this.typeChange.get(index)
    )
  }

  typeMdf(index: string): number {
    // this.validate()
    return (
      this.typeMdfRace.get(index) +
      this.typeMdfClasses.get(index) +
      this.typeMdfAbility.get(index) +
      this.typeMdfEquip.get(index) +
      this.typeMdfState.get(index) +
      this.typeMdfChange.get(index) +
      this.status.grandStatus().typeMdf.get(index)
    )
  }

  grandTypeMdf(): number {
    return this.status.grandStatus().grandMdf
  }

  maxHP(equip: boolean = true): number {
    const reduction = this.status.stackOfStatus('HP上限减少')
    if (reduction > 0) {
      return Math.max(1, this.attribute(0, equip) - reduction)
    }
    return this.attribute(0, equip)
  }
  patk(equip: boolean = true): number {
    return this.attribute(1, equip)
  }
  pdef(equip: boolean = true): number {
    return this.attribute(2, equip)
  }
  satk(equip: boolean = true): number {
    return this.attribute(3, equip)
  }
  sdef(equip: boolean = true): number {
    return this.attribute(4, equip)
  }
  spd(equip: boolean = true): number {
    return this.attribute(5, equip)
  }
  maxPP(equip: boolean = true): number {
    const reduction = this.status.stackOfStatus('PP上限减少')
    if (reduction > 0) {
      return Math.max(0, this.attribute(6, equip) - reduction)
    }
    return this.attribute(6, equip)
  }

  getModifierByName(name: string): number {
    if (name == '力量') {
      return this.strmod()
    } else if (name == '敏捷') {
      return this.dexmod()
    } else if (name == '体质') {
      return this.conmod()
    } else if (name == '智力') {
      return this.intmod()
    } else if (name == '感知') {
      return this.wismod()
    } else if (name == '魅力') {
      return this.chamod()
    }
    return 0
  }

  getAttributeByName(name: string): number {
    if (name == '物攻') {
      return this.patk()
    } else if (name == '物防') {
      return this.pdef()
    } else if (name == '特攻') {
      return this.satk()
    } else if (name == '特防') {
      return this.sdef()
    } else if (name == '速度') {
      return this.spd()
    }
    return 0
  }

  getAttackAttributeByName(name: string): number {
    if (name == '物攻') {
      return this.patk()
    } else if (name == '物防') {
      return this.pdef(false)
    } else if (name == '特攻') {
      return this.satk()
    } else if (name == '特防') {
      return this.sdef(false)
    } else if (name == '速度') {
      return this.spd()
    }
    return 0
  }

  strv(): number {
    return this.ability(0)
  }
  dexv(): number {
    return this.ability(1)
  }
  conv(): number {
    return this.ability(2)
  }
  intv(): number {
    return this.ability(3)
  }
  wisv(): number {
    return this.ability(4)
  }
  chav(): number {
    return this.ability(5)
  }

  strmod(): number {
    return this.modifier(0)
  }
  dexmod(): number {
    return this.modifier(1)
  }
  conmod(): number {
    return this.modifier(2)
  }
  intmod(): number {
    return this.modifier(3)
  }
  wismod(): number {
    return this.modifier(4)
  }
  chamod(): number {
    return this.modifier(5)
  }

  strsave(): number {
    return this.save(0)
  }
  dexsave(): number {
    return this.save(1)
  }
  consave(): number {
    return this.save(2)
  }
  intsave(): number {
    return this.save(3)
  }
  wissave(): number {
    return this.save(4)
  }
  chasave(): number {
    return this.save(5)
  }

  maxRing(): number {
    // this.validate()
    return Math.max(1, Math.floor((10 + this.castLv()) / 20))
  }

  maxPokemonRing(): number {
    let mx = 0
    for (const r of this.races) {
      if (r.type == '种族') {
        mx = Math.max(mx, r.lv)
      }
    }
    // this.validate()
    return Math.max(1, Math.floor(mx / 20 + 1))
  }

  name(): string {
    return this.profile.name
  }

  code(): string {
    return this.profile.code
  }

  skillModRaw(skill: string): number {
    return Math.floor(
      this.skillPro.get(skill) +
        this.skillRace.get(skill) +
        this.skillEquip.get(skill) +
        this.skillState.get(skill)
    )
  }

  skillCheckAdvanceStatus(skill: string): number {
    const s = this.status.grandStatus().abilityCheckMdf
    const i = skillToModIndex(skill)
    if (i < 0) {
      return 0
    }
    return s.get(i)
  }

  skillSaveAdvanceStatus(skill: string): number {
    const s = this.status.grandStatus().abilitySaveMdf
    const i = skillToModIndex(skill)
    if (i < 0) {
      return 0
    }
    return s.get(i)
  }

  skillCheckAdvanceWithStatus(skill: string): number {
    return this.skillAdvance.get(skill) + this.skillCheckAdvanceStatus(skill)
  }

  skillSaveAdvanceWithStatus(skill: string): number {
    return this.skillAdvance.get(skill) + this.skillSaveAdvanceStatus(skill)
  }

  skillMod(skill: string): number {
    if (skill == '力量') {
      return this.strmod()
    } else if (skill == '敏捷') {
      return this.dexmod()
    } else if (skill == '体质') {
      return this.conmod()
    } else if (skill == '智力') {
      return this.intmod()
    } else if (skill == '感知') {
      return this.wismod()
    } else if (skill == '魅力') {
      return this.chamod()
    } else if (['运动'].includes(skill)) {
      return this.strmod() + this.skillModRaw(skill)
    } else if (['体操', '巧手', '隐匿'].includes(skill)) {
      return this.dexmod() + this.skillModRaw(skill)
    } else if (['专注'].includes(skill)) {
      return this.conmod() + this.skillModRaw(skill)
    } else if (['调查', '奥秘', '历史', '自然', '宗教'].includes(skill)) {
      return this.intmod() + this.skillModRaw(skill)
    } else if (['察觉', '洞悉', '医药', '求生'].includes(skill)) {
      return this.wismod() + this.skillModRaw(skill)
    } else if (['游说', '欺瞒', '威吓', '表演'].includes(skill)) {
      return this.chamod() + this.skillModRaw(skill)
    } else {
      return 0
    }
  }

  skillSave(skill: string): number {
    if (skill == '力量') {
      return this.strsave()
    } else if (skill == '敏捷') {
      return this.dexsave()
    } else if (skill == '体质') {
      return this.consave()
    } else if (skill == '智力') {
      return this.intsave()
    } else if (skill == '感知') {
      return this.wissave()
    } else if (skill == '魅力') {
      return this.chasave()
    } else if (['运动'].includes(skill)) {
      return this.strsave() + this.skillModRaw(skill)
    } else if (['体操', '巧手', '隐匿'].includes(skill)) {
      return this.dexsave() + this.skillModRaw(skill)
    } else if (['专注'].includes(skill)) {
      return this.consave() + this.skillModRaw(skill)
    } else if (['调查', '奥秘', '历史', '自然', '宗教'].includes(skill)) {
      return this.intsave() + this.skillModRaw(skill)
    } else if (['察觉', '洞悉', '医药', '求生'].includes(skill)) {
      return this.wissave() + this.skillModRaw(skill)
    } else if (['游说', '欺瞒', '威吓', '表演'].includes(skill)) {
      return this.chasave() + this.skillModRaw(skill)
    } else {
      return 0
    }
  }

  maxCapacity(): number {
    return Math.max(0, this.strv() * 10)
  }

  maxPickup(): number {
    return Math.max(0, this.strv() * 5)
  }

  optionalThrow(): number {
    return Math.max(0, Math.min(this.maxPickup(), this.strv() ** 2 / 5))
  }

  maxThrow(): number {
    return Math.max(0, Math.min(this.maxPickup(), this.optionalThrow() * 1.1))
  }

  jumpDistance(): number {
    return Math.max(1, this.strv() / 2 - 1)
  }

  jumpHeight(): number {
    return Math.max(0.25, (this.strv() - 4) / 6)
  }

  totalWeight(): number {
    return this.sizeAbility.weight + this.currentLoadCapacity
  }

  improvisedWeaponEffect(gravity: number = 9.8, net: boolean = false): number {
    return Math.max(
      0,
      Math.floor(gravity * Math.sqrt(net ? this.sizeAbility.weight : this.totalWeight()))
    )
  }

  concentrationSaveFromDamage(dmg: number): number {
    if (dmg <= 0) {
      return 0
    }
    return 10 + Math.floor(Math.max(0, (25 * dmg) / this.attribute(0), dmg / 20))
  }

  attributeChangeFade(): void {
    function fading(x: number, t: number): number {
      if (x > t) {
        return Math.max(t, x - 5)
      } else {
        return Math.min(t, x + 5)
      }
    }
    this.attributeChange.patk = fading(this.attributeChange.patk, this.attributeChangeBase.patk)
    this.attributeChange.pdef = fading(this.attributeChange.pdef, this.attributeChangeBase.pdef)
    this.attributeChange.satk = fading(this.attributeChange.satk, this.attributeChangeBase.satk)
    this.attributeChange.sdef = fading(this.attributeChange.sdef, this.attributeChangeBase.sdef)
    this.attributeChange.spd = fading(this.attributeChange.spd, this.attributeChangeBase.spd)
  }

  newRound(): void {
    this.currentAction = this.action
    this.currentBonusAction = this.bonusAction
    this.currentReaction = this.reaction
    this.currentMov = this.sizeAbility.mov
    this.status.triggerOnTurn()
    this.attributeChangeFade()

    this.validate()
  }

  getMove(name: string): Move | null {
    for (const i of this.moves) {
      if (i.name == name) {
        return i
      }
    }
    return null
  }

  getMoveStab(name: string): number {
    const m = this.getMove(name)
    if (m == null) {
      return 0
    }
    return this.typeStab(m.elemType)
  }

  getMoveMdf(name: string): number {
    const m = this.getMove(name)
    if (m == null) {
      return 0
    }
    return this.getModifierByName(m.castAbility)
  }

  getMoveDC(name: string): number {
    return this.effectPower() + this.getMoveMdf(name)
  }

  getMoveList(): string[] {
    return this.moves.map((x) => x.name)
  }

  getMoveInMemoryList(): string[] {
    return this.moves.filter((x) => x.inMemory.length > 0).map((x) => x.name)
  }

  hpSet(): number[] {
    return [this.currentHP, this.tempHP]
  }

  previewHP(delta: number[]): number[] {
    const res = handleHP(this.hpSet(), this.maxHP(), delta)
    return res
  }

  hpPercentageString(): string {
    return ((100 * this.currentHP) / this.maxHP()).toFixed(2) + '%'
  }

  takeHP(delta: number[]): void {
    const res = this.previewHP(delta)
    this.currentHP = res[0]
    this.tempHP = Math.max(0, res[1])
  }

  previewPP(delta: number): number {
    return Math.min(Math.max(0, this.currentPP + delta), this.maxPP())
  }

  takePP(delta: number): void {
    this.currentPP = this.previewPP(delta)
  }

  attributeChangeString(): string {
    const str: string[] = []
    for (let i = 1; i <= 5; i++) {
      const a = this.attributeChange.get(i)
      if (a != 0) {
        str.push(`${attributeList[i - 1]} ${toMod(a)}`)
      }
    }
    return str.join('，')
  }

  getAttackAdvantageWithStatus(mod: string): number {
    return (
      this.grandStatus().abilityMoveMdf.get(skillToModIndex(mod)) + this.grandStatus().onAttackMdf
    )
  }

  getUnderAttackAdvantageWithStatus(): number {
    return this.grandStatus().underAttackMdf
  }

  getStatusMdf(s: Status): number {
    return this.resist.getStatusMdf(s)
  }

  restHPCoef: number = 0
  restPPCoef: number = 0
  inRound: boolean = false
}
