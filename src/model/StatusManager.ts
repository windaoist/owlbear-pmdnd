import {
  Status,
  ElemType,
  Attribute,
  Ability,
  BattleAbility,
  MovePower,
  ExtraResist
} from './DataType'
import { StatusList, getStatus, statusStack } from './Status'

export class ResistManager {
  resist: ExtraResist[]

  constructor(resist: ExtraResist[] = []) {
    this.resist = resist
  }

  getStatusMdf(s: Status): number {
    let res = 0
    for (const r of this.resist) {
      if (
        r.name.includes(s.name) ||
        (s.parentName.length > 0 && r.name.includes(s.parentName)) ||
        (s.childName.length > 0 && r.name.includes(s.childName))
      ) {
        const t = r.sum()
        if (!res || t) {
          res = t
        }
      }
    }
    return res
  }

  getStatusMdfByName(s: string): number {
    const ss = getStatus(s)
    if (!ss) {
      return 0
    }
    return this.getStatusMdf(ss)
  }
}

export class StatusManager {
  status: Status[]

  constructor(status: Status[] = []) {
    this.status = []
    for (const x of status) {
      this.status.push(x.duplicate())
    }
  }

  getConsistStatus(): Status[] {
    return this.status.filter((a) => !a.type)
  }

  getAccumulateStatus(): Status[] {
    return this.status.filter((a) => a.type)
  }

  findStatus(name: string): Status | undefined {
    return this.status.find((a) => a.name == name)
  }

  stackOfStatus(name: string): number {
    const a = this.status.filter((s) => s.name == name)
    let stk = 0
    for (const s of a) {
      stk += s.stack
    }
    return stk
  }

  hasStatus(name: string): boolean {
    return this.stackOfStatus(name) > 0
  }

  refreshList(): void {
    const newStatus: Status[] = []

    const collected: Set<string> = new Set()
    for (const ss of StatusList) {
      if (collected.has(ss.name)) {
        continue
      }

      if (ss.oppositeName.length > 0) {
        const s = this.stackOfStatus(ss.name)
        const t = this.stackOfStatus(ss.oppositeName)
        const stk = s - t
        if (stk >= 0) {
          const x = ss.duplicate()
          x.stack = stk
          newStatus.push(x)
        } else if (stk < 0) {
          const x = getStatus(ss.oppositeName)!.duplicate()
          x.stack = -stk
          newStatus.push(x)
        }
        collected.add(ss.name)
        collected.add(ss.oppositeName)
      } else {
        const x = ss.duplicate()
        x.stack = Math.max(0, this.stackOfStatus(ss.name))
        newStatus.push(x)
      }
    }

    for (const ss of this.status) {
      if (getStatus(ss.name) == undefined && ss.stack > 0) {
        newStatus.push(ss)
      }
    }

    this.status = []

    for (const x of newStatus) {
      this.status.push(x.duplicate())
    }
  }

  grandStatus(): Status {
    const res = new Status(
      false,
      '',
      0,
      '',
      '',
      0,
      '',
      '',
      0,
      new ElemType(),
      0,
      0,
      0,
      new Attribute(),
      new Ability(),
      new BattleAbility(),
      new Ability(),
      new Ability(),
      new Ability(),
      0,
      0,
      0,
      0,
      0,
      0,
      false,
      [],
      0,
      false,
      false
    )

    for (const s of this.status) {
      if (s.parentName.length > 0 && this.hasStatus(s.parentName)) {
        continue
      }

      if (s.stack <= 0) {
        continue
      }

      res.grandMdf += s.grandMdf
      res.typeMdf.value = res.typeMdf.value.map((v, i) => v + s.typeMdf.value[i])

      res.attributeMdf.add(s.attributeMdf)
      res.abilityMdf.add(s.abilityMdf)
      res.battleAbilityMdf.add(s.battleAbilityMdf)

      res.abilityMoveMdf.add(s.abilityMoveMdf)
      res.abilityCheckMdf.add(s.abilityCheckMdf)
      res.abilitySaveMdf.add(s.abilitySaveMdf)

      res.actionMdf += s.actionMdf
      res.bonusActionMdf += s.bonusActionMdf
      res.reactionMdf += s.reactionMdf
      res.movMdf += s.movMdf

      res.incapacitated = res.incapacitated || s.incapacitated
      res.damageOnTurn = res.damageOnTurn.concat(s.damageOnTurn)

      res.onAttackMdf += s.onAttackMdf
      res.underAttackMdf += s.underAttackMdf

      res.cannotMove = res.cannotMove || s.cannotMove
      res.autoCrit = res.autoCrit || s.autoCrit
    }

    res.abilityMoveMdf.trim()
    res.abilityCheckMdf.trim()
    res.abilitySaveMdf.trim()

    const pwrs: MovePower[] = []
    let i = 0
    for (const x of res.damageOnTurn) {
      pwrs.push(new MovePower(i, x.power, x.elemType, x.psType, x.aspect, x.isStatus, x.extra))
      i += 1
    }
    res.damageOnTurn = pwrs

    return res
  }

  grandMdf(): number {
    return this.grandStatus().grandMdf
  }

  typeMdf(): ElemType {
    return this.grandStatus().typeMdf
  }

  attributeMdf(): Attribute {
    return this.grandStatus().attributeMdf
  }

  abilityMdf(): Ability {
    return this.grandStatus().abilityMdf
  }

  battleAbilityMdf(): BattleAbility {
    return this.grandStatus().battleAbilityMdf
  }

  abilityMoveMdf(): Ability {
    return this.grandStatus().abilityMoveMdf
  }

  abilityCheckMdf(): Ability {
    return this.grandStatus().abilityCheckMdf
  }

  abilitySaveMdf(): Ability {
    return this.grandStatus().abilitySaveMdf
  }

  actionMdf(): number {
    return this.grandStatus().actionMdf
  }

  bonusActionMdf(): number {
    return this.grandStatus().bonusActionMdf
  }

  reactionMdf(): number {
    return this.grandStatus().reactionMdf
  }

  movMdf(): number {
    return this.grandStatus().movMdf
  }

  incapacitated(): boolean {
    return this.grandStatus().incapacitated
  }

  damageOnTurn(): MovePower[] {
    return this.grandStatus().damageOnTurn
  }

  cannotMove(): boolean {
    return this.grandStatus().cannotMove
  }

  autoCrit(): boolean {
    return this.grandStatus().autoCrit
  }

  triggerOn(t: number): void {
    const newStatus: Status[] = []
    for (const s of this.status) {
      const loss = t == 0 ? s.lossOnTurn : 0
      if (s.stack > 0 && s.stack <= loss) {
        const t = statusStack(s.childName, 10)
        if (t != undefined) {
          newStatus.push(t)
        }
      }
      s.stack = Math.max(s.stack - loss, 0)
    }
    this.status = this.status.concat(newStatus)
    this.refreshList()
  }

  triggerOnTurn(): void {
    return this.triggerOn(0)
  }

  addStatus(s: Status): void {
    this.status.push(s.duplicate())
    this.refreshList()
  }

  removeStatus(s: Status): void {
    this.status = this.status.filter((t) => t.name != s.name)
  }

  degradeStatus(x: string): void {
    const s = getStatus(x)
    if (s == undefined) {
      return
    }
    this.removeStatus(s)
    const t = statusStack(s.childName, 10)
    if (t != undefined) {
      if (t.stack > 0) {
        this.addStatus(t)
      }
    }
  }

  upgradeStatus(x: string, outside: boolean = false): void {
    const s = getStatus(x)
    if (s == undefined) {
      return
    }
    const u = getStatus(s.parentName)
    if (u == undefined) {
      return
    }
    const current = this.findStatus(s.name)
    if (current) current.stack = Math.max(0, current.stack - 20)
    u.stack = Math.max(1, s.parentStack)
    if (outside && this.stackOfStatus(u.name) <= 0 && u.lossOnTurn > 0) {
      u.stack += 1
    }
    this.addStatus(u)
  }

  toString(): string {
    const str: string[] = []
    for (const s of this.status) {
      if (s.stack > 0) {
        str.push(`${s.name} ${s.stack}`)
      }
    }
    return str.join('，')
  }
}
