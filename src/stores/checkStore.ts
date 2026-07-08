import { ref } from 'vue'

export type RollMode = 'dice' | 'check' | 'save'

export class CheckMemory {
  chosen: Set<string> = new Set()
  difficulty = 10
  logs = ''
  rollMode: RollMode = 'check'
  checkSkill = '力量'
  abilityOverride = ''
  tempModifier = 0
  chooseMode = 0
  useCustomAdvance = 1
  useCustomMin = 1
  diceSequence = '1d20'
}

export const checkMemory = ref(new CheckMemory())
