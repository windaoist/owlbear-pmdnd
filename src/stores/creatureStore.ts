import { ref, type Ref } from 'vue'
import { Creature } from '../model/Creature'
import type { ObrRole } from './obrSessionStore'

const creatures: Ref<Creature[]> = ref([])

export function canPlayerSeeCreature(creature: Creature): boolean {
  return creature.publicVisibility !== 'hidden'
}

export function canPlayerSeeCreatureVitals(creature: Creature): boolean {
  return creature.publicVisibility === 'vitals' || creature.publicVisibility === 'full'
}

export function canPlayerSeeCreatureFull(creature: Creature): boolean {
  return creature.publicVisibility === 'full'
}

export function canRoleSeeCreature(role: ObrRole, creature: Creature): boolean {
  return role !== 'PLAYER' || canPlayerSeeCreature(creature)
}

export function canRoleSeeCreatureVitals(role: ObrRole, creature: Creature): boolean {
  return role !== 'PLAYER' || canPlayerSeeCreatureVitals(creature)
}

export function canRoleSeeCreatureFull(role: ObrRole, creature: Creature): boolean {
  return role !== 'PLAYER' || canPlayerSeeCreatureFull(creature)
}

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
