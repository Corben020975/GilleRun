import type { Block, Modality, Session } from '../types/session'

function uid(prefix = 's'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function parseCoachPayload(raw: string): Session {
  const data = JSON.parse(raw) as Record<string, unknown>

  const blocksRaw = (data.blocks as Record<string, unknown>[]) ?? []
  const blocks: Block[] = blocksRaw.map((b, i) => ({
    id: String(b.id ?? `b${i + 1}`),
    name: String(b.name ?? b.exo ?? `Bloc ${i + 1}`),
    reps: typeof b.reps === 'number' ? b.reps : undefined,
    durationSec: typeof b.durationSec === 'number' ? b.durationSec : typeof b.time === 'number' ? b.time : undefined,
    side: (b.side as Block['side']) ?? null,
    loadKg: typeof b.loadKg === 'number' ? b.loadKg : typeof b.charge === 'number' ? b.charge : undefined,
    restSec: typeof b.restSec === 'number' ? b.restSec : typeof b.repos === 'number' ? b.repos : 0,
    notes: typeof b.notes === 'string' ? b.notes : undefined,
    vestKg: typeof b.vestKg === 'number' ? b.vestKg : undefined,
  }))

  if (blocks.length === 0) {
    throw new Error('Aucun bloc trouvé dans le JSON Coach 51.')
  }

  const modality = (data.modality as Modality) || (data.type as Modality) || 'Cross'

  return {
    id: String(data.id ?? uid('coach')),
    title: String(data.title ?? data.name ?? 'Séance Coach 51'),
    source: 'Coach 51',
    modality,
    durationMin: typeof data.durationMin === 'number' ? data.durationMin : Math.max(20, Math.round(blocks.length * 1.5)),
    createdAt: new Date().toISOString(),
    blocks,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    vestDefaultKg: typeof data.vestDefaultKg === 'number' ? data.vestDefaultKg : undefined,
    music:
      data.music && typeof data.music === 'object'
        ? (data.music as Session['music'])
        : {
            playlistId: 'PLw-VjUGpzkHRG8tLdLxZzW_gERpPm8G5W',
            playlistUrl: 'https://music.youtube.com/playlist?list=PLw-VjUGpzkHRG8tLdLxZzW_gERpPm8G5W',
            label: 'Default Engine',
          },
  }
}

export const SAMPLE_COACH_JSON = `{
  "id": "coach_live_1",
  "title": "EMOM KB 20' — Swing + Press",
  "modality": "KB",
  "durationMin": 22,
  "notes": "Envoyé par Coach 51",
  "music": {
    "playlistId": "PLw-VjUGpzkHRG8tLdLxZzW_gERpPm8G5W",
    "playlistUrl": "https://music.youtube.com/playlist?list=PLw-VjUGpzkHRG8tLdLxZzW_gERpPm8G5W",
    "label": "Engine Mix"
  },
  "blocks": [
    { "name": "Swing", "reps": 12, "loadKg": 32, "side": "both", "restSec": 0 },
    { "name": "Push Press", "reps": 6, "loadKg": 23, "side": "L", "restSec": 0 },
    { "name": "Push Press", "reps": 6, "loadKg": 23, "side": "R", "restSec": 45 },
    { "name": "Swing", "reps": 12, "loadKg": 32, "side": "both", "restSec": 0 },
    { "name": "Push Press", "reps": 6, "loadKg": 23, "side": "L", "restSec": 0 },
    { "name": "Push Press", "reps": 6, "loadKg": 23, "side": "R", "restSec": 45 }
  ]
}`
