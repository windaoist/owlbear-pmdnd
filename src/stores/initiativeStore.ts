import { ref } from 'vue'

export class InitiativeMemory {
  initMode: 'individual' | 'grouped' = 'individual'
  currentInitiativeIdx = 0
  controlsExpanded = true
  disabledCodes: string[] = []
}

export const initiativeMemory = ref(new InitiativeMemory())
