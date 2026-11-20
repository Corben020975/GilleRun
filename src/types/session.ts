export type Modality = 'KB' | 'PDC' | 'Gilet' | 'Cross' | 'DB' | 'Hyrox'

export type Side = 'L' | 'R' | 'both' | null

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
}

export interface Session {
  id: string
  title: string
  source: 'Coach 51' | 'Import' | 'Demo'
  modality: Modality
  durationMin: number
  createdAt: string
  blocks: Block[]
  music?: {
    playlistId?: string
    playlistUrl?: string
    label?: string
  }
  notes?: string
  vestDefaultKg?: number
}

export interface BlockLog {
  blockId: string
  completedAt: number
  durationMs: number
  dropped?: boolean
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
}
