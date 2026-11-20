import type { Block, BlockLog } from '../types/session'

/**
 * « Trop dur » → allège réellement la suite de la séance.
 * Les ajustements sont DÉRIVÉS des logs (dropKind) : pas d'état en plus,
 * et une séance reprise depuis l'inbox retrouve automatiquement ses allègements.
 *
 * Règle : un drop sur un exercice s'applique à tous les blocs SUIVANTS
 * portant le même nom (même exo dans les tours suivants).
 *  - 'reps'  : −25 % de reps (min 1), cumulable
 *  - 'load'  : charge inférieure disponible dans la séance (ex. 32 → 23),
 *              sinon −20 % ; gilet −20 %
 */

function lowerLoad(current: number, available: number[]): number {
  const lower = available.filter((l) => l < current)
  if (lower.length) return Math.max(...lower)
  return Math.max(1, Math.round(current * 0.8))
}

export function effectiveBlock(blocks: Block[], index: number, logs: BlockLog[]): Block | undefined {
  const base = blocks[index]
  if (!base) return undefined
  const loads = [...new Set(blocks.map((b) => b.loadKg).filter((l): l is number => l != null))]
  const indexById = new Map(blocks.map((b, i) => [b.id, i]))

  let reps = base.reps
  let loadKg = base.loadKg
  let vestKg = base.vestKg
  let adjusted = false

  for (const log of logs) {
    if (!log.dropKind || log.dropKind === 'skip') continue
    const i = indexById.get(log.blockId)
    if (i == null || i >= index) continue
    if (blocks[i]!.name !== base.name) continue
    if (log.dropKind === 'reps' && reps != null) {
      reps = Math.max(1, Math.round(reps * 0.75))
      adjusted = true
    }
    if (log.dropKind === 'load') {
      if (loadKg != null) loadKg = lowerLoad(loadKg, loads)
      if (vestKg != null) vestKg = Math.max(0, Math.round(vestKg * 0.8))
      if (loadKg != null || vestKg != null) adjusted = true
    }
  }

  return adjusted ? { ...base, reps, loadKg, vestKg, notes: base.notes ? `${base.notes} · allégé` : 'Allégé' } : base
}
