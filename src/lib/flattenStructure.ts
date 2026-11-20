import type { Block, StructureSegment } from '../types/session'

function uid(prefix: string, i: number) {
  return `${prefix}_${i}`
}

function normalizeBlock(
  b: Omit<Block, 'id'> & { id?: string },
  id: string,
  extra: Partial<Block> = {},
): Block {
  return {
    id,
    name: b.name,
    reps: b.reps,
    durationSec: b.durationSec,
    side: b.side ?? null,
    loadKg: b.loadKg,
    restSec: b.restSec ?? 0,
    notes: b.notes,
    vestKg: b.vestKg,
    ...extra,
  }
}

/**
 * Aplatit rounds/tabata en blocs standards.
 * EMOM/AMRAP : produit un bloc « méta » + blocs templates pour le player dédié.
 */
export function flattenStructure(structure: StructureSegment[]): {
  blocks: Block[]
  playMode: 'standard' | 'emom' | 'amrap'
  emomMinutes?: number
  amrapMinutes?: number
} {
  const blocks: Block[] = []
  let playMode: 'standard' | 'emom' | 'amrap' = 'standard'
  let emomMinutes: number | undefined
  let amrapMinutes: number | undefined
  let n = 0

  for (const seg of structure) {
    if (seg.kind === 'rounds') {
      const rounds = Math.max(1, seg.rounds)
      const restBetween = seg.restBetweenRoundsSec ?? 0
      for (let r = 1; r <= rounds; r++) {
        seg.blocks.forEach((b, bi) => {
          const isLastOfRound = bi === seg.blocks.length - 1
          const isLastRound = r === rounds
          const rest =
            isLastOfRound && !isLastRound
              ? restBetween
              : (b.restSec ?? 0)
          blocks.push(
            normalizeBlock(b, uid('rnd', n++), {
              restSec: rest,
              roundLabel: `Tour ${r}/${rounds}`,
              mode: 'standard',
            }),
          )
        })
      }
    } else if (seg.kind === 'tabata') {
      const rounds = Math.max(1, seg.rounds)
      const work = seg.workSec
      const rest = seg.restSec
      const template = seg.blocks[0]
      for (let r = 1; r <= rounds; r++) {
        blocks.push(
          normalizeBlock(
            {
              name: template?.name ?? 'Tabata',
              side: template?.side,
              loadKg: template?.loadKg,
              vestKg: template?.vestKg,
              durationSec: work,
              restSec: r < rounds ? rest : 0,
            },
            uid('tab', n++),
            {
              roundLabel: `Tour ${r}/${rounds}`,
              mode: 'tabata',
              cycleIndex: r - 1,
              cycleLength: rounds,
            },
          ),
        )
      }
    } else if (seg.kind === 'emom') {
      playMode = 'emom'
      emomMinutes = seg.minutes
      // Un bloc par minute, rotation sur les templates
      const templates = seg.blocks.length ? seg.blocks : [{ name: 'EMOM' }]
      for (let m = 0; m < seg.minutes; m++) {
        const t = templates[m % templates.length]!
        blocks.push(
          normalizeBlock(
            { ...t, durationSec: 60, restSec: 0 },
            uid('emom', n++),
            {
              roundLabel: `Min ${m + 1}/${seg.minutes}`,
              mode: 'emom',
              cycleIndex: m,
              cycleLength: seg.minutes,
            },
          ),
        )
      }
    } else if (seg.kind === 'amrap') {
      playMode = 'amrap'
      amrapMinutes = seg.minutes
      // Un seul « super bloc » AMRAP : le player gère le compte à rebours + tours
      const names = seg.blocks.map((b) => b.name).join(' + ') || 'AMRAP'
      blocks.push({
        id: uid('amrap', n++),
        name: names,
        durationSec: seg.minutes * 60,
        restSec: 0,
        notes: seg.blocks
          .map((b) => {
            const bits = [b.name]
            if (b.reps) bits.push(`${b.reps}r`)
            if (b.side === 'L') bits.push('G')
            if (b.side === 'R') bits.push('D')
            return bits.join(' ')
          })
          .join(' → '),
        mode: 'amrap',
        roundLabel: `AMRAP ${seg.minutes}'`,
      })
    }
  }

  return { blocks, playMode, emomMinutes, amrapMinutes }
}
