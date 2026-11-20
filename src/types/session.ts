export type Modality = 'KB' | 'PDC' | 'Gilet' | 'Cross' | 'DB' | 'Hyrox'

export type Side = 'L' | 'R' | 'both' | null

export type DropKind = 'reps' | 'load' | 'skip'

export interface Block {
  id: string
  name: string
  reps?: number
  durationSec?: number
  side?: Side
  loadKg?: number
  restSec?: number
  notes?: string
  vestKg?: number
  /** Affichage « Tour x/y » après aplatissement rounds/tabata */
  roundLabel?: string
  /** Mode player dédié si issu d'une structure */
  mode?: 'standard' | 'emom' | 'amrap' | 'tabata'
  /** Index dans le cycle EMOM / Tabata */
  cycleIndex?: number
  cycleLength?: number
}

export type StructureSegment =
  | {
      kind: 'rounds'
      rounds: number
      restBetweenRoundsSec?: number
      blocks: Array<Omit<Block, 'id'> & { id?: string }>
    }
  | {
      kind: 'emom'
      minutes: number
      blocks: Array<Omit<Block, 'id'> & { id?: string }>
    }
  | {
      kind: 'amrap'
      minutes: number
      blocks: Array<Omit<Block, 'id'> & { id?: string }>
    }
  | {
      kind: 'tabata'
      rounds: number
      workSec: number
      restSec: number
      blocks: Array<Omit<Block, 'id'> & { id?: string }>
    }

export interface Session {
  id: string
  title: string
  source: 'Coach 51' | 'Import' | 'Demo'
  modality: Modality
  durationMin: number
  createdAt: string
  blocks: Block[]
  /** Structure optionnelle (rétrocompatible) — déjà aplatie dans blocks */
  structure?: StructureSegment[]
  music?: {
    playlistId?: string
    playlistUrl?: string
    label?: string
  }
  notes?: string
  vestDefaultKg?: number
  /** Mode global si toute la séance est EMOM/AMRAP */
  playMode?: 'standard' | 'emom' | 'amrap'
  emomMinutes?: number
  amrapMinutes?: number
}

export interface BlockLog {
  blockId: string
  completedAt: number
  durationMs: number
  dropped?: boolean
  dropKind?: DropKind
}

export interface SessionLog {
  sessionId: string
  sessionTitle: string
  modality: Modality
  startedAt: string
  finishedAt: string
  totalMs: number
  blockLogs: BlockLog[]
  rpe?: number
  mood?: 'good' | 'ok' | 'low'
  achillesOk?: boolean
}

export interface GhostSplit {
  sessionId: string
  sessionTitle: string
  blockDurationsMs: number[]
  totalMs: number
  finishedAt: string
  /** true = meilleur temps complet (sans abandon) */
  kind?: 'best' | 'last'
}
