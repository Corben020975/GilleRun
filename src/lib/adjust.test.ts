import { describe, expect, it } from 'vitest'
import { effectiveBlock } from './adjust'
import type { Block, BlockLog } from '../types/session'

const blocks: Block[] = [
  { id: 'a', name: 'Swing', reps: 20, loadKg: 32 },
  { id: 'b', name: 'Squat', reps: 10, loadKg: 23 },
  { id: 'c', name: 'Swing', reps: 20, loadKg: 32 },
  { id: 'd', name: 'Swing', reps: 20, loadKg: 32 },
]
const log = (blockId: string, dropKind: BlockLog['dropKind']): BlockLog => ({
  blockId,
  completedAt: 0,
  durationMs: 0,
  dropped: true,
  dropKind,
})

describe('effectiveBlock', () => {
  it('sans drop : bloc inchangé', () => {
    expect(effectiveBlock(blocks, 2, [])).toBe(blocks[2])
  })
  it('− reps : −25 % sur les blocs suivants du même exo', () => {
    expect(effectiveBlock(blocks, 2, [log('a', 'reps')])?.reps).toBe(15)
    expect(effectiveBlock(blocks, 1, [log('a', 'reps')])?.reps).toBe(10)
  })
  it('− reps cumulable', () => {
    expect(effectiveBlock(blocks, 3, [log('a', 'reps'), log('c', 'reps')])?.reps).toBe(11)
  })
  it('− charge : passe à la KB inférieure de la séance', () => {
    expect(effectiveBlock(blocks, 2, [log('a', 'load')])?.loadKg).toBe(23)
  })
  it('skip : pas d’allègement', () => {
    expect(effectiveBlock(blocks, 2, [log('a', 'skip')])).toBe(blocks[2])
  })
})
