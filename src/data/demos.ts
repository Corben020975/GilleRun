import { flattenStructure } from '../lib/flattenStructure'
import type { Session, StructureSegment } from '../types/session'

function buildDemo(
  partial: Omit<Session, 'blocks' | 'createdAt'> & { structure: StructureSegment[] },
): Session {
  const flat = flattenStructure(partial.structure)
  return {
    ...partial,
    createdAt: new Date().toISOString(),
    blocks: flat.blocks,
    playMode: flat.playMode,
    emomMinutes: flat.emomMinutes,
    amrapMinutes: flat.amrapMinutes,
  }
}

export const DEMO_SESSIONS: Session[] = [
  buildDemo({
    id: 'demo-kb-complex',
    title: 'Complex KB 2×23 — 4 tours',
    source: 'Demo',
    modality: 'KB',
    durationMin: 28,
    notes: 'Volume faisable. Pas de WOD gonflé.',
    structure: [
      {
        kind: 'rounds',
        rounds: 4,
        restBetweenRoundsSec: 90,
        blocks: [
          { name: 'Swing', reps: 10, side: 'both', loadKg: 23 },
          { name: 'Clean', reps: 5, side: 'L', loadKg: 23 },
          { name: 'Clean', reps: 5, side: 'R', loadKg: 23 },
          { name: 'Push Press', reps: 5, side: 'L', loadKg: 23 },
          { name: 'Push Press', reps: 5, side: 'R', loadKg: 23 },
          { name: 'Front Squat', reps: 8, side: 'both', loadKg: 23 },
        ],
      },
    ],
  }),
  buildDemo({
    id: 'demo-vest-engine',
    title: 'Vest Engine — 3 rounds',
    source: 'Demo',
    modality: 'Gilet',
    durationMin: 30,
    vestDefaultKg: 10,
    structure: [
      {
        kind: 'rounds',
        rounds: 3,
        restBetweenRoundsSec: 60,
        blocks: [
          { name: 'Push-ups', reps: 15, vestKg: 10 },
          { name: 'Fentes latérales', reps: 6, side: 'L', vestKg: 10 },
          { name: 'Fentes latérales', reps: 6, side: 'R', vestKg: 10 },
          { name: 'Rows', reps: 12, vestKg: 10 },
          { name: 'Sit-ups', reps: 15, vestKg: 10 },
        ],
      },
    ],
  }),
  buildDemo({
    id: 'demo-pdc-engine',
    title: 'PDC Engine — burpee squat pompe',
    source: 'Demo',
    modality: 'PDC',
    durationMin: 35,
    structure: [
      {
        kind: 'rounds',
        rounds: 8,
        restBetweenRoundsSec: 20,
        blocks: [
          { name: 'Burpee', reps: 5 },
          { name: 'Air squat', reps: 10 },
          { name: 'Pompe', reps: 8 },
        ],
      },
    ],
  }),
  buildDemo({
    id: 'demo-cross',
    title: 'Cross soir — KB · PDC · corde',
    source: 'Demo',
    modality: 'Cross',
    durationMin: 35,
    structure: [
      {
        kind: 'rounds',
        rounds: 1,
        blocks: [
          { name: 'Corde à sauter', durationSec: 90, restSec: 30 },
          { name: 'KB Swing @32', reps: 20, loadKg: 32, side: 'both', restSec: 30 },
          { name: 'Burpees', reps: 10, restSec: 30 },
          { name: 'Corde à sauter', durationSec: 90, restSec: 30 },
          { name: 'KB Goblet Squat @23', reps: 15, loadKg: 23, restSec: 30 },
          { name: 'Pompes', reps: 12, restSec: 30 },
          { name: 'Planche', durationSec: 45, restSec: 0, notes: 'Finisher' },
        ],
      },
    ],
  }),
]
