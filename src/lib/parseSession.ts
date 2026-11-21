import { extractJsonObject } from './extractJson'
import { flattenStructure } from './flattenStructure'
import type { Block, Modality, Session, StructureSegment } from '../types/session'

function uid(prefix = 's'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

const MODALITIES: Modality[] = ['KB', 'PDC', 'Gilet', 'Cross', 'DB', 'Hyrox']

function asModality(v: unknown): Modality {
  if (typeof v === 'string' && MODALITIES.includes(v as Modality)) return v as Modality
  return 'Cross'
}

function asSide(v: unknown): Block['side'] {
  if (v === 'L' || v === 'R' || v === 'both' || v === 'G' || v === 'D') {
    if (v === 'G') return 'L'
    if (v === 'D') return 'R'
    return v
  }
  return null
}

function mapBlock(b: Record<string, unknown>, i: number): Block {
  return {
    id: String(b.id ?? `b${i + 1}`),
    name: String(b.name ?? b.exo ?? b.exercice ?? `Bloc ${i + 1}`),
    reps: typeof b.reps === 'number' ? b.reps : undefined,
    durationSec:
      typeof b.durationSec === 'number'
        ? b.durationSec
        : typeof b.time === 'number'
          ? b.time
          : typeof b.duree === 'number'
            ? b.duree
            : undefined,
    side: asSide(b.side ?? b.cote),
    loadKg:
      typeof b.loadKg === 'number'
        ? b.loadKg
        : typeof b.charge === 'number'
          ? b.charge
          : typeof b.kg === 'number'
            ? b.kg
            : undefined,
    restSec:
      typeof b.restSec === 'number' ? b.restSec : typeof b.repos === 'number' ? b.repos : 0,
    notes: typeof b.notes === 'string' ? b.notes : typeof b.cue === 'string' ? b.cue : undefined,
    vestKg: typeof b.vestKg === 'number' ? b.vestKg : typeof b.gilet === 'number' ? b.gilet : undefined,
  }
}

export function parseCoachPayload(raw: string): Session {
  const parsed = extractJsonObject(raw) as Record<string, unknown>
  let data = parsed
  if (data.session && typeof data.session === 'object') {
    data = data.session as Record<string, unknown>
  }

  let blocks: Block[] = []
  let playMode: Session['playMode'] = 'standard'
  let emomMinutes: number | undefined
  let amrapMinutes: number | undefined
  let structure: StructureSegment[] | undefined

  if (Array.isArray(data.structure) && data.structure.length > 0) {
    structure = data.structure as StructureSegment[]
    const flat = flattenStructure(structure)
    blocks = flat.blocks
    playMode = flat.playMode
    emomMinutes = flat.emomMinutes
    amrapMinutes = flat.amrapMinutes
  } else {
    const blocksRaw = (data.blocks as Record<string, unknown>[]) ?? []
    blocks = blocksRaw.map(mapBlock)
  }

  if (blocks.length === 0) {
    throw new Error('Aucun bloc trouvé — "blocks" ou "structure" vide.')
  }


  return {
    id: String(data.id ?? uid('coach')),
    title: String(data.title ?? data.name ?? 'Séance Coach 51'),
    source: 'Coach 51',
    modality: asModality(data.modality ?? data.type),
    durationMin:
      typeof data.durationMin === 'number'
        ? data.durationMin
        : typeof data.duree === 'number'
          ? data.duree
          : Math.max(20, Math.round(blocks.length * 1.5)),
    createdAt: new Date().toISOString(),
    blocks,
    structure,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    vestDefaultKg:
      typeof data.vestDefaultKg === 'number'
        ? data.vestDefaultKg
        : typeof data.giletKg === 'number'
          ? data.giletKg
          : undefined,
    playMode,
    emomMinutes,
    amrapMinutes,
  }
}

export const COACH_PRESETS: { id: string; label: string; blurb: string; json: string }[] = [
  {
    id: 'kb-rounds',
    label: 'KB Complex',
    blurb: '2×23 · 4 tours structurés',
    json: `{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_kb_complex_soir",
    "title": "Complex double KB 2×23",
    "modality": "KB",
    "durationMin": 28,
    "notes": "Volume faisable. Respire entre les côtés.",
    "structure": [
      {
        "kind": "rounds",
        "rounds": 4,
        "restBetweenRoundsSec": 90,
        "blocks": [
          { "name": "Swing", "reps": 10, "loadKg": 23, "side": "both" },
          { "name": "Clean", "reps": 5, "loadKg": 23, "side": "L" },
          { "name": "Clean", "reps": 5, "loadKg": 23, "side": "R" },
          { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "L" },
          { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "R" },
          { "name": "Front Squat", "reps": 8, "loadKg": 23, "side": "both" }
        ]
      }
    ]
  }
}`,
  },
  {
    id: 'vest-engine',
    label: 'Gilet Engine',
    blurb: 'Gilet 10 kg · 3 rounds',
    json: `{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_vest_engine",
    "title": "Vest Engine 3 rounds",
    "modality": "Gilet",
    "durationMin": 30,
    "giletKg": 10,
    "structure": [
      {
        "kind": "rounds",
        "rounds": 3,
        "restBetweenRoundsSec": 60,
        "blocks": [
          { "name": "Push-ups", "reps": 15, "vestKg": 10 },
          { "name": "Fentes latérales", "reps": 6, "side": "L", "vestKg": 10 },
          { "name": "Fentes latérales", "reps": 6, "side": "R", "vestKg": 10 },
          { "name": "Rows", "reps": 12, "vestKg": 10 },
          { "name": "Sit-ups", "reps": 15, "vestKg": 10 }
        ]
      }
    ]
  }
}`,
  },
  {
    id: 'pdc-rounds',
    label: 'PDC Engine',
    blurb: 'Burpee · squat · pompe · 8 tours',
    json: `{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_pdc_engine",
    "title": "PDC Engine 8 tours",
    "modality": "PDC",
    "durationMin": 35,
    "structure": [
      {
        "kind": "rounds",
        "rounds": 8,
        "restBetweenRoundsSec": 20,
        "blocks": [
          { "name": "Burpee", "reps": 5 },
          { "name": "Air squat", "reps": 10 },
          { "name": "Pompe", "reps": 8 }
        ]
      }
    ]
  }
}`,
  },
]

export const COACH_51_EXPORT_RULE = `Quand je dis "envoie à Arena" ou "export Arena 51", réponds UNIQUEMENT avec un JSON valide au format arena51.session avec "structure" (rounds|emom|amrap|tabata) ou "blocks" plat. Matériel KB 2×23 + 32 + gilet ; volume faisable ; sides L/R séparés.`
