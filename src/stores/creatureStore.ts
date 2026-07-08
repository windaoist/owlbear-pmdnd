import { ref, type Ref } from 'vue'
import { Creature } from '../model/Creature'

const creatures: Ref<Creature[]> = ref([])

export function useCreatureStore() {
  function addCreature(creature: Creature): void {
    creatures.value.push(creature)
  }

  function removeCreature(code: string): void {
    creatures.value = creatures.value.filter((c) => c.code() !== code)
  }

  function findByCode(code: string): Creature | null {
    return creatures.value.find((c) => c.code() === code) ?? null
  }

  function findByIndex(index: number): Creature | null {
    if (index < 0 || index >= creatures.value.length) return null
    return creatures.value[index]
  }

  function findAll(): Creature[] {
    return creatures.value
  }

  function clear(): void {
    creatures.value = []
  }

  return {
    creatures,
    addCreature,
    removeCreature,
    findByCode,
    findByIndex,
    findAll,
    clear,
  }
}
