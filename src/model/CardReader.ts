import { Creature } from './Creature'
import {
  Profile,
  Relative,
  Race,
  Attribute,
  Ability,
  BattleAbility,
  SizeAbility,
  Skill,
  ElemType,
  ExtraResist,
  Move,
  MovePower,
  Feature,
  Equipment,
  Item,
  tagSet
} from './DataType'
import * as xlsx from 'xlsx'
import { ResistManager, StatusManager } from './StatusManager'

export function readCardFromXlsx(file: xlsx.WorkBook): Creature {
  let sheetNames: (string | number)[]
  let character: xlsx.WorkSheet
  let isFullCard: boolean = false
  try {
    sheetNames = file.SheetNames
    // console.log(sheetNames);
    character = file.Sheets[sheetNames[0]]
    // console.log(xlsx.utils.sheet_to_json(profile));
  } catch {
    throw Error(`无法解析文件：${file.Props?.Title}`)
  }

  let profile: Profile

  try {
    const type = character['A1'].v
    if (type == '人物') {
      isFullCard = true
    }
  } catch {
    throw Error(`文件表头有错误：${file.Props?.Title}`)
  }

  try {
    profile = new Profile(
      character['C2'].v,
      character['C4'].v,
      character['I2'].v,
      character['I3'].v,
      character['L3'].v,
      character['I4'].v
    )
  } catch {
    throw Error(`无法读取文件的人物信息：${file.Props?.Title}`)
  }

  const relatives: Relative[] = []
  if (isFullCard) {
    try {
      for (let i = 44; i <= 144; i++) {
        try {
          if (character[`A${i}`].v == null) {
            break
          }
        } catch {
          break
        }
        const name = character[`A${i}`]?.v ?? ''
        const relationship = character[`D${i}`]?.v ?? ''
        const description = character[`F${i}`]?.v ?? ''
        const relative = new Relative(name, relationship, description)
        relatives.push(relative)
      }
      // console.log(relatives);
    } catch {
      throw Error(`角色“${profile.name}”（${profile.code}）的人物关系区域存在问题`)
    }
  }

  let stats: xlsx.WorkSheet
  try {
    if (isFullCard) {
      stats = file.Sheets[sheetNames[1]]
    } else {
      stats = file.Sheets[sheetNames[0]]
    }
    // console.log(xlsx.utils.sheet_to_json(stats));
  } catch {
    throw Error(`无法读取角色“${profile.name}”（${profile.code}）的状态页面`)
  }

  const races: Race[] = []

  function fetchRace(index: number, type: string): Race | null {
    let col = ['J', 'M', 'N', 'O', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'AA']
    if (!isFullCard) {
      col = ['N', 'Q', 'R', 'S', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AD']
    }
    try {
      if (stats[`${col[0]}${index}`].v == null) {
        return null
      }
    } catch {
      return null
    }

    const name = stats[`${col[0]}${index}`].v
    const lv = stats[`${col[1]}${index}`]?.v ?? 0
    const battleScale = stats[`${col[2]}${index}`]?.v ?? 0
    const castScale = stats[`${col[3]}${index}`]?.v ?? 0
    const attribute = new Attribute(
      stats[`${col[4]}${index}`].v,
      stats[`${col[5]}${index}`].v,
      stats[`${col[6]}${index}`].v,
      stats[`${col[7]}${index}`].v,
      stats[`${col[8]}${index}`].v,
      stats[`${col[9]}${index}`].v,
      stats[`${col[10]}${index}`].v
    )
    const cantripCount = stats[`${col[11]}${index}`]?.v ?? 0
    const race = new Race(type, name, lv, battleScale, castScale, attribute, cantripCount)
    return race
  }
  try {
    for (let i = 6; i <= 8; i++) {
      const race = fetchRace(i, '种族')
      if (race != null) {
        races.push(race)
      } else {
        break
      }
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的种族信息存在问题`)
  }

  try {
    for (let i = 11; i <= (isFullCard ? 31 : 16); i++) {
      const race = fetchRace(i, '职业')
      if (race != null) {
        races.push(race)
      } else {
        break
      }
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的职业信息存在问题`)
  }

  function fetchAttribute(col: string, row: number): Attribute {
    return new Attribute(
      0,
      stats[`${col}${row}`]?.v ?? 0,
      stats[`${col}${row + 1}`]?.v ?? 0,
      stats[`${col}${row + 2}`]?.v ?? 0,
      stats[`${col}${row + 3}`]?.v ?? 0,
      stats[`${col}${row + 4}`]?.v ?? 0,
      0
    )
  }

  let attributeDBase: Attribute
  let attributeDEquip: Attribute
  let attributeDChange: Attribute
  let attributeChangeBase: Attribute
  try {
    let row = 6
    if (!isFullCard) {
      row = 13
    }
    attributeDBase = fetchAttribute('E', row)
    attributeDEquip = fetchAttribute('F', row)
    attributeDChange = fetchAttribute('G', row)
    attributeChangeBase = fetchAttribute('H', row)
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的人物能力区域存在问题`)
  }

  function fetchAbility(col: string, row: number): Ability {
    return new Ability(
      stats[`${col}${row}`]?.v ?? 0,
      stats[`${col}${row + 1}`]?.v ?? 0,
      stats[`${col}${row + 2}`]?.v ?? 0,
      stats[`${col}${row + 3}`]?.v ?? 0,
      stats[`${col}${row + 4}`]?.v ?? 0,
      stats[`${col}${row + 5}`]?.v ?? 0
    )
  }

  let abilityBase: Ability
  let abilitySave: Ability
  let abilityBaseD: Ability
  let abilitySaveD: Ability
  try {
    let row = 13
    if (!isFullCard) {
      row = 20
    }
    abilityBase = fetchAbility('E', row)
    abilitySave = fetchAbility('F', row)
    abilityBaseD = fetchAbility('G', row)
    abilitySaveD = fetchAbility('H', row)
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的人物属性区域存在问题`)
  }

  function fetchBattleAbility(col: string, row: number): BattleAbility {
    const address = xlsx.utils.decode_cell(`${col}${row}`)
    return new BattleAbility(
      stats[xlsx.utils.encode_cell({ c: address.c, r: address.r })]?.v ?? 0,
      stats[xlsx.utils.encode_cell({ c: address.c, r: address.r + 1 })]?.v ?? 0,
      stats[xlsx.utils.encode_cell({ c: address.c, r: address.r + 2 })]?.v ?? 0,
      stats[xlsx.utils.encode_cell({ c: address.c, r: address.r + 3 })]?.v ?? 0
    )
  }

  let battleAbilityDBase: BattleAbility
  let battleAbilityDEquip: BattleAbility
  let battleAbilityDState: BattleAbility
  let battleAbilityDChange: BattleAbility
  try {
    let row = 23
    if (!isFullCard) {
      row = 30
    }
    battleAbilityDBase = fetchBattleAbility('E', row)
    battleAbilityDEquip = fetchBattleAbility('F', row)
    battleAbilityDState = fetchBattleAbility('G', row)
    battleAbilityDChange = fetchBattleAbility('H', row)
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的战斗参数区域存在问题`)
  }

  function parseSize(s: string): { size: number; original: string } {
    if (s.includes('微型')) return { size: 0.5, original: '微型' }
    if (s.includes('大型')) return { size: 2, original: '大型' }
    if (s.includes('中型')) return { size: 1, original: '中型' }
    return { size: 1, original: '小型' }
  }

  let sizeAbility: SizeAbility
  let currentLoadCapacity: number
  try {
    if (isFullCard) {
      const parsed = parseSize(stats['B29'].v)
      sizeAbility = new SizeAbility(
        stats['B28'].v,
        stats['F28'].v,
        parsed.size,
        stats['F29'].v,
        stats['B31'].v,
        parsed.original
      )
      currentLoadCapacity = stats['B30'].v
    } else {
      const parsed = parseSize(stats['B36'].v)
      sizeAbility = new SizeAbility(
        stats['B35'].v,
        stats['F35'].v,
        parsed.size,
        stats['F36'].v,
        stats['B38'].v,
        parsed.original
      )
      currentLoadCapacity = stats['B37'].v
    }
  } catch {
    throw Error(`角色”${profile.name}”（${profile.code}）的生存参数区域存在问题`)
  }

  function fetchSkill(col: string, row: number): Skill {
    const value: number[] = []
    for (let i = 0; i < 18; i++) {
      try {
        value.push(stats[`${col}${row + i}`]?.v ?? 0)
      } catch {
        value.push(0)
      }
    }
    return new Skill(value)
  }

  let skillPro: Skill
  let skillRace: Skill
  let skillEquip: Skill
  let skillState: Skill
  let skillAdvance: Skill
  let skillMin: Skill
  try {
    let row = 36
    if (!isFullCard) {
      row = 43
    }
    skillPro = fetchSkill('C', row)
    skillRace = fetchSkill('D', row)
    skillEquip = fetchSkill('E', row)
    skillState = fetchSkill('F', row)
    skillAdvance = fetchSkill('G', row)
    skillMin = fetchSkill('H', row)
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的技术区域存在问题`)
  }

  let action: number
  let bonusAction: number
  let reaction: number
  let currentHP: number
  let tempHP: number
  let currentPP: number
  try {
    if (isFullCard) {
      action = stats['D20'].v
      bonusAction = stats['F20'].v
      reaction = stats['H20'].v
    } else {
      action = stats['D27'].v
      bonusAction = stats['F27'].v
      reaction = stats['H27'].v
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的每回合资源区域存在问题`)
  }
  try {
    if (isFullCard) {
      currentHP = stats['B2'].v
      tempHP = stats['H4'].v
      currentPP = stats['B4'].v
    } else {
      currentHP = stats['B9'].v
      tempHP = stats['H11'].v
      currentPP = stats['B11'].v
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的 HP 或 PP 值存在问题`)
  }

  let skillCountType: string
  try {
    if (isFullCard) {
      skillCountType = stats['U36'].v
    } else {
      skillCountType = stats['K41'].v
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的来自调整值的记忆位存在问题`)
  }

  let legendaryModifier: number
  let difficultyModifier: number
  try {
    if (isFullCard) {
      legendaryModifier = stats['AD4']?.v ?? 1
      difficultyModifier = stats['U50']?.v ?? 1
    } else {
      legendaryModifier = stats['AH4']?.v ?? 1
      difficultyModifier = stats['K13']?.v ?? 1
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的难度等级或传奇修正存在问题`)
  }

  let elemtypes: xlsx.WorkSheet
  try {
    if (isFullCard) {
      elemtypes = file.Sheets[sheetNames[2]]
    } else {
      elemtypes = file.Sheets[sheetNames[0]]
    }
    // console.log(xlsx.utils.sheet_to_json(elemtypes));
  } catch {
    throw Error(`无法读取角色“${profile.name}”（${profile.code}）的属性页面`)
  }

  function fetchElemType(col: string, row: number): ElemType {
    const value: number[] = []
    for (let i = 0; i < 25; i++) {
      try {
        value.push(elemtypes[`${col}${row + i}`]?.v ?? 0)
      } catch {
        value.push(0)
      }
    }
    return new ElemType(value)
  }

  let typeRace: ElemType
  let typeClasses: ElemType
  let typeAbility: ElemType = new ElemType()
  let typeEquip: ElemType = new ElemType()
  let typeState: ElemType = new ElemType()
  let typeChange: ElemType
  try {
    if (isFullCard) {
      typeRace = fetchElemType('C', 4)
      typeClasses = fetchElemType('D', 4)
      typeAbility = fetchElemType('E', 4)
      typeEquip = fetchElemType('F', 4)
      typeState = fetchElemType('G', 4)
      typeChange = fetchElemType('H', 4)
    } else {
      typeRace = fetchElemType('P', 21)
      typeClasses = fetchElemType('Q', 21)
      typeChange = fetchElemType('R', 21)
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的角色属性区域存在问题`)
  }

  let typeMdfRace: ElemType
  let typeMdfClasses: ElemType
  let typeMdfAbility: ElemType = new ElemType()
  let typeMdfEquip: ElemType = new ElemType()
  let typeMdfState: ElemType = new ElemType()
  let typeMdfChange: ElemType
  try {
    if (isFullCard) {
      typeMdfRace = fetchElemType('L', 4)
      typeMdfClasses = fetchElemType('M', 4)
      typeMdfAbility = fetchElemType('N', 4)
      typeMdfEquip = fetchElemType('O', 4)
      typeMdfState = fetchElemType('P', 4)
      typeMdfChange = fetchElemType('Q', 4)
    } else {
      typeMdfRace = fetchElemType('U', 21)
      typeMdfClasses = fetchElemType('V', 21)
      typeMdfChange = fetchElemType('W', 21)
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的属性修正区域存在问题`)
  }

  const extraResists: ExtraResist[] = []
  function fetchExtraResist(col: string, row: number): ExtraResist | null {
    const address = xlsx.utils.decode_cell(`${col}${row}`)
    let name = ''
    try {
      name = elemtypes[xlsx.utils.encode_cell({ c: address.c, r: address.r })].v
    } catch {
      return null
    }
    if (isFullCard) {
      return new ExtraResist(
        name,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 2, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 3, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 4, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 5, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 6, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 7, r: address.r })]?.v ?? 0
      )
    } else {
      return new ExtraResist(
        name,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 3, r: address.r })]?.v ?? 0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 4, r: address.r })]?.v ?? 0,
        0,
        0,
        0,
        elemtypes[xlsx.utils.encode_cell({ c: address.c + 5, r: address.r })]?.v ?? 0
      )
    }
  }

  try {
    if (isFullCard) {
      for (let i = 4; i <= 28; i++) {
        const extraResist = fetchExtraResist('S', i)
        if (extraResist != null) {
          extraResists.push(extraResist)
        } else {
          break
        }
      }
    } else {
      for (let i = 21; i <= 45; i++) {
        const extraResist = fetchExtraResist('X', i)
        if (extraResist != null) {
          extraResists.push(extraResist)
        } else {
          break
        }
      }
    }
  } catch {
    throw Error(`角色“${profile.name}”（${profile.code}）的抗性修正区域存在问题`)
  }

  let featuresSheet: xlsx.WorkSheet
  try {
    if (isFullCard) {
      featuresSheet = file.Sheets[sheetNames[3]]
      // console.log(xlsx.utils.sheet_to_json(featuresSheet));
    } else {
      featuresSheet = file.Sheets[sheetNames[0]]
    }
  } catch {
    throw Error(`无法读取角色“${profile.name}”（${profile.code}）的特性页面`)
  }

  const classFeatures: Feature[] = []
  const nonClassFeatures: Feature[] = []

  function parseBoolean(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim() === '是'
    }
    return Boolean(value)
  }

  if (isFullCard) {
    for (let i = 3; i <= 102; i++) {
      try {
        const name = featuresSheet[`H${i}`]?.v
        if (name == null || name === '') {
          continue
        }

        const innate = parseBoolean(featuresSheet[`I${i}`]?.v)
        const known = parseBoolean(featuresSheet[`J${i}`]?.v)
        const source = featuresSheet[`K${i}`]?.v ?? ''
        const sourceLevel = featuresSheet[`L${i}`]?.v ?? ''
        const description = featuresSheet[`M${i}`]?.v ?? ''

        const feature = new Feature(name, innate, known, source, sourceLevel, description)
        classFeatures.push(feature)
      } catch (error) {
        console.warn(`读取职业特性时在第 ${i} 行出现问题:`, error)
      }
    }
  } else {
    for (let i = 49; i <= 148; i++) {
      try {
        const name = featuresSheet[`V${i}`]?.v
        if (name == null || name === '') {
          continue
        }

        const innate = true
        const known = true
        const source = ''
        const sourceLevel = ''
        const description = featuresSheet[`X${i}`]?.v ?? ''

        const feature = new Feature(name, innate, known, source, sourceLevel, description)
        classFeatures.push(feature)
      } catch (error) {
        console.warn(`读取职业特性时在第 ${i} 行出现问题:`, error)
      }
    }
  }

  if (isFullCard) {
    for (let i = 3; i <= 102; i++) {
      try {
        const name = featuresSheet[`A${i}`]?.v
        if (name == null || name === '') {
          continue
        }
        const innate = parseBoolean(featuresSheet[`B${i}`]?.v)
        const known = parseBoolean(featuresSheet[`C${i}`]?.v)
        const source = featuresSheet[`D${i}`]?.v ?? ''
        const sourceLevel = featuresSheet[`E${i}`]?.v ?? ''
        const description = featuresSheet[`F${i}`]?.v ?? ''

        const feature = new Feature(name, innate, known, source, sourceLevel, description)
        nonClassFeatures.push(feature)
      } catch (error) {
        console.warn(`读取非职业特性时在第 ${i} 行出现问题:`, error)
      }
    }
  } else {
    for (let i = 49; i <= 148; i++) {
      try {
        const name = featuresSheet[`N${i}`]?.v
        if (name == null || name === '') {
          continue
        }
        const innate = true
        const known = true
        const source = ''
        const sourceLevel = ''
        const description = featuresSheet[`P${i}`]?.v ?? ''

        const feature = new Feature(name, innate, known, source, sourceLevel, description)
        nonClassFeatures.push(feature)
      } catch (error) {
        console.warn(`读取非职业特性时在第 ${i} 行出现问题:`, error)
      }
    }
  }

  let equipmentSheet: xlsx.WorkSheet
  try {
    if (isFullCard) {
      equipmentSheet = file.Sheets[sheetNames[4]]
      // console.log(xlsx.utils.sheet_to_json(equipmentSheet));
    } else {
      equipmentSheet = file.Sheets[sheetNames[1]]
    }
  } catch {
    throw Error(`无法读取角色“${profile.name}”（${profile.code}）的装备页面`)
  }

  const battleEquipment: Equipment[] = []
  const appearanceEquipment: Equipment[] = []
  const items: Item[] = []

  let currentSlot = ''
  for (let i = 3; i <= 19; i++) {
    try {
      const slotCell = equipmentSheet[`A${i}`]
      if (slotCell && slotCell.v !== null && slotCell.v !== undefined) {
        currentSlot = String(slotCell.v).trim()
      }
      if (!currentSlot) {
        continue
      }

      const usableTypes = String(equipmentSheet[`B${i}`]?.v ?? '').trim()
      const name = String(equipmentSheet[`C${i}`]?.v ?? '').trim()

      if (!name) {
        continue
      }

      const category = String(equipmentSheet[`D${i}`]?.v ?? '').trim()
      const performance = String(equipmentSheet[`E${i}`]?.v ?? '').trim()
      const tagString = String(equipmentSheet[`F${i}`]?.v ?? '').trim()
      const description = String(equipmentSheet[`G${i}`]?.v ?? '').trim()
      const weightRaw = equipmentSheet[`H${i}`]?.v
      const weight = typeof weightRaw === 'number' ? weightRaw : 0.0

      const tags = tagSet(tagString)

      const equipment = new Equipment(
        currentSlot,
        usableTypes,
        name,
        category,
        performance,
        tags,
        description,
        weight
      )
      battleEquipment.push(equipment)
    } catch (error) {
      console.warn(`读取战斗装备时在第 ${i} 行出现问题:`, error)
    }
  }

  currentSlot = ''
  for (let i = 23; i <= 50; i++) {
    try {
      const slotCell = equipmentSheet[`A${i}`]
      if (slotCell && slotCell.v !== null && slotCell.v !== undefined) {
        currentSlot = String(slotCell.v).trim()
      }
      if (!currentSlot) {
        continue
      }

      const usableTypes = String(equipmentSheet[`B${i}`]?.v ?? '').trim()
      const name = String(equipmentSheet[`C${i}`]?.v ?? '').trim()
      if (!name) {
        continue
      }

      const category = String(equipmentSheet[`D${i}`]?.v ?? '').trim()
      const performance = String(equipmentSheet[`E${i}`]?.v ?? '').trim()
      const tagString = String(equipmentSheet[`F${i}`]?.v ?? '').trim()
      const description = String(equipmentSheet[`G${i}`]?.v ?? '').trim()
      const weightRaw = equipmentSheet[`H${i}`]?.v
      const weight = typeof weightRaw === 'number' ? weightRaw : 0.0

      const tags = tagSet(tagString)

      const equipment = new Equipment(
        currentSlot,
        usableTypes,
        name,
        category,
        performance,
        tags,
        description,
        weight
      )
      appearanceEquipment.push(equipment)
    } catch (error) {
      console.warn(`读取外观装备时在第 ${i} 行出现问题:`, error)
    }
  }

  for (let i = 54; i <= 153; i++) {
    try {
      const name = String(equipmentSheet[`C${i}`]?.v ?? '').trim()
      if (!name) {
        continue
      }

      const type = String(equipmentSheet[`A${i}`]?.v ?? '').trim()
      const quantityRaw = equipmentSheet[`B${i}`]?.v
      const quantity = typeof quantityRaw === 'number' ? quantityRaw : 1
      const unitWeightRaw = equipmentSheet[`D${i}`]?.v
      const unitWeight = typeof unitWeightRaw === 'number' ? unitWeightRaw : 0.0
      const effect = String(equipmentSheet[`E${i}`]?.v ?? '').trim()
      const tagString = String(equipmentSheet[`F${i}`]?.v ?? '').trim()
      const description = String(equipmentSheet[`G${i}`]?.v ?? '').trim()

      const tags = tagSet(tagString)

      const item = new Item(type, quantity, name, unitWeight, effect, tags, description)
      items.push(item)
    } catch (error) {
      console.warn(`读取道具时在第 ${i} 行出现问题:`, error)
    }
  }

  let movesList: xlsx.WorkSheet
  try {
    if (isFullCard) {
      movesList = file.Sheets[sheetNames[5]]
      // console.log(xlsx.utils.sheet_to_json(elemtypes));
    } else {
      movesList = file.Sheets[sheetNames[2]]
    }
  } catch {
    throw Error(`无法读取角色“${profile.name}”（${profile.code}）的招式页面`)
  }

  const moves: Move[] = []

  function fetchMove(row: number): Move | null {
    try {
      if (movesList[`E${row}`] == undefined || movesList[`E${row}`].v == null) {
        return null
      }
    } catch {
      return null
    }

    const inMemory = movesList[`A${row}`]?.v ?? ''
    const ring = movesList[`B${row}`]?.v ?? -1
    const name = movesList[`E${row}`]?.v ?? ''

    const elemtype = movesList[`F${row}`]?.v ?? '无属性'
    const castAbility = movesList[`H${row}`]?.v ?? '无加值'
    const powerRaw = movesList[`K${row}`]?.v ?? ''

    const costAction = movesList[`L${row}`]?.v ?? ''
    const costBonusAction = movesList[`M${row}`]?.v ?? ''
    const costReaction = movesList[`N${row}`]?.v ?? ''
    const costMove = movesList[`O${row}`]?.v ?? ''
    const costPP = movesList[`P${row}`]?.v ?? 0
    const costOther = movesList[`Q${row}`]?.v ?? ''

    const castRange = movesList[`R${row}`]?.v ?? ''
    const duration = movesList[`S${row}`]?.v ?? ''
    const concentration = movesList[`T${row}`]?.v ?? ''

    const chargeRaw = movesList[`U${row}`]?.v ?? ''
    const chargeAt = movesList[`V${row}`]?.v ?? ''
    const cooldown = movesList[`W${row}`]?.v ?? ''

    const V = movesList[`X${row}`]?.v ?? ''
    const S = movesList[`Y${row}`]?.v ?? ''
    const M = movesList[`Z${row}`]?.v ?? ''

    const description = movesList[`AA${row}`]?.v ?? ''

    const movepowers: MovePower[] = [new MovePower(0, 0, '治疗', '特殊', '', true, '')]

    try {
      if (powerRaw != null && powerRaw !== '') {
        const moveparts = String(powerRaw)
          .split(/[+/|]/)
          .map((s) => s.trim())
        let i = 1
        for (const s of moveparts) {
          const rgx =
            /([0-9]+) *(无属性|一般|力场|格斗|飞行|毒|酸|地面|岩石|虫|幽灵|钢|火|水|草|电|超能力|冰|龙|恶|妖精|光耀|黯蚀|治疗|护盾)(物理|特殊|)(钝击|挥砍|穿刺|)(状态|)(.*)/
          const res = rgx.exec(s)
          if (res) {
            movepowers.push(
              new MovePower(i, Number(res[1]), res[2], res[3], res[4], res[5] == '状态', res[6])
            )
            i += 1
          }
        }
      }
    } catch {
      throw Error(`角色“${profile.name}”（${profile.code}）的招式“${name}”存在问题`)
    }

    let charge: number = 0
    let maxCharge: number = 0

    if (chargeRaw != null && chargeRaw !== '') {
      const chargeParts = String(chargeRaw).split('/')
      if (chargeParts.length === 2) {
        charge = Number(chargeParts[0].trim())
        maxCharge = Number(chargeParts[1].trim())
      }
    }

    return new Move(
      inMemory,
      ring,
      name,
      elemtype,
      castAbility,
      movepowers,
      costAction,
      costBonusAction,
      costReaction,
      costMove,
      costPP,
      costOther,
      castRange,
      duration,
      concentration,
      charge,
      maxCharge,
      chargeAt,
      cooldown,
      V,
      S,
      M,
      description
    )
  }

  for (let i = 6; i <= 105; i++) {
    const move = fetchMove(i)
    if (move != null) {
      moves.push(move)
    }
  }
  for (let i = 106; i <= 999999; i++) {
    const move = fetchMove(i)
    if (move != null) {
      moves.push(move)
    } else {
      break
    }
  }
  if (moves.find((s) => s.name == '主手徒手攻击') == undefined) {
    moves.unshift(
      new Move(
        '固有',
        -1,
        '主手徒手攻击',
        '无属性',
        '力量',
        [
          new MovePower(0, 0, '', '', '', true, ''),
          new MovePower(1, 50, '无属性', '物理', '钝击', false, '')
        ],
        '*1',
        '',
        '',
        '',
        0,
        '',
        '触及',
        '',
        '',
        0,
        0,
        '',
        '',
        '',
        '',
        '',
        ''
      )
    )
  }

  const creature = new Creature(
    profile,
    races,
    attributeDBase,
    attributeDEquip,
    attributeDChange,
    attributeChangeBase,
    abilityBase,
    abilitySave,
    abilityBaseD,
    abilitySaveD,
    battleAbilityDBase,
    battleAbilityDEquip,
    battleAbilityDState,
    battleAbilityDChange,
    sizeAbility,
    skillPro,
    skillRace,
    skillEquip,
    skillState,
    skillAdvance,
    skillMin,
    typeRace,
    typeClasses,
    typeAbility,
    typeEquip,
    typeState,
    typeChange,
    typeMdfRace,
    typeMdfClasses,
    typeMdfAbility,
    typeMdfEquip,
    typeMdfState,
    typeMdfChange,
    legendaryModifier,
    difficultyModifier,
    difficultyModifier == 1.25 ? '玩家' : '敌方',
    currentHP,
    tempHP,
    currentPP,
    action,
    bonusAction,
    reaction,
    skillCountType,
    moves,
    new StatusManager([]),
    new ResistManager(extraResists),
    currentLoadCapacity,
    classFeatures,
    nonClassFeatures,
    battleEquipment,
    appearanceEquipment,
    items
  )

  return creature
}
