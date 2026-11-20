import type { Block, Modality, Session } from '../types/session'

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

export function parseCoachPayload(raw: string): Session {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Colle d’abord le JSON envoyé par Coach 51.')

  let data: Record<string, unknown>
  try {
    data = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    throw new Error('JSON invalide — demande à Coach 51 un export Arena 51.')
  }

  // Accept wrapped envelope { type, session } or flat session
  if (data.session && typeof data.session === 'object') {
    data = data.session as Record<string, unknown>
  }

  const blocksRaw = (data.blocks as Record<string, unknown>[]) ?? []
  const blocks: Block[] = blocksRaw.map((b, i) => ({
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
      typeof b.restSec === 'number'
        ? b.restSec
        : typeof b.repos === 'number'
          ? b.repos
          : 0,
    notes: typeof b.notes === 'string' ? b.notes : typeof b.cue === 'string' ? b.cue : undefined,
    vestKg: typeof b.vestKg === 'number' ? b.vestKg : typeof b.gilet === 'number' ? b.gilet : undefined,
  }))

  if (blocks.length === 0) {
    throw new Error('Aucun bloc trouvé — le champ "blocks" est vide.')
  }

  const music =
    data.music && typeof data.music === 'object'
      ? (data.music as Session['music'])
      : undefined

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
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    vestDefaultKg:
      typeof data.vestDefaultKg === 'number'
        ? data.vestDefaultKg
        : typeof data.giletKg === 'number'
          ? data.giletKg
          : undefined,
    music,
  }
}

/** Presets that feel like real Coach 51 exports — not a random EMOM stub */
export const COACH_PRESETS: { id: string; label: string; blurb: string; json: string }[] = [
  {
    id: 'kb-complex',
    label: 'KB Complex',
    blurb: '2×23 · 4 tours · volume faisable',
    json: `{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_kb_complex_soir",
    "title": "Complex double KB 2×23",
    "modality": "KB",
    "durationMin": 28,
    "notes": "4 tours. Respire entre les côtés. Pas de WOD gonflé.",
    "music": {
      "playlistUrl": "https://music.youtube.com/search?q=workout%20energy",
      "label": "Workout Energy"
    },
    "blocks": [
      { "name": "Swing", "reps": 10, "loadKg": 23, "side": "both", "restSec": 0, "cue": "Hinge, pas squat" },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Front Squat", "reps": 8, "loadKg": 23, "side": "both", "restSec": 90, "notes": "Fin de tour" },

      { "name": "Swing", "reps": 10, "loadKg": 23, "side": "both", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Front Squat", "reps": 8, "loadKg": 23, "side": "both", "restSec": 90 },

      { "name": "Swing", "reps": 10, "loadKg": 23, "side": "both", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Front Squat", "reps": 8, "loadKg": 23, "side": "both", "restSec": 90 },

      { "name": "Swing", "reps": 10, "loadKg": 23, "side": "both", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Clean", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "L", "restSec": 0 },
      { "name": "Push Press", "reps": 5, "loadKg": 23, "side": "R", "restSec": 0 },
      { "name": "Front Squat", "reps": 8, "loadKg": 23, "side": "both", "restSec": 0, "notes": "Dernier tour" }
    ]
  }
}`,
  },
  {
    id: 'vest-engine',
    label: 'Gilet Engine',
    blurb: 'Gilet 10 kg · 3 rounds engine',
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
    "notes": "Steady, pas de sprint. Gilet on toute la séance.",
    "music": {
      "playlistUrl": "https://music.youtube.com/search?q=dark%20electronic%20workout",
      "label": "Dark Pulse"
    },
    "blocks": [
      { "name": "Push-ups", "reps": 15, "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 6, "side": "L", "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 6, "side": "R", "vestKg": 10, "restSec": 0 },
      { "name": "Rows", "reps": 12, "vestKg": 10, "restSec": 0 },
      { "name": "Fentes arrière", "reps": 6, "side": "L", "vestKg": 10, "restSec": 0 },
      { "name": "Fentes arrière", "reps": 6, "side": "R", "vestKg": 10, "restSec": 0 },
      { "name": "Sit-ups", "reps": 15, "vestKg": 10, "restSec": 60, "notes": "Fin round 1" },

      { "name": "Push-ups", "reps": 15, "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 6, "side": "L", "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 6, "side": "R", "vestKg": 10, "restSec": 0 },
      { "name": "Rows", "reps": 12, "vestKg": 10, "restSec": 0 },
      { "name": "Fentes arrière", "reps": 6, "side": "L", "vestKg": 10, "restSec": 0 },
      { "name": "Fentes arrière", "reps": 6, "side": "R", "vestKg": 10, "restSec": 0 },
      { "name": "Sit-ups", "reps": 15, "vestKg": 10, "restSec": 60, "notes": "Fin round 2" },

      { "name": "Push-ups", "reps": 12, "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 5, "side": "L", "vestKg": 10, "restSec": 0 },
      { "name": "Fentes latérales", "reps": 5, "side": "R", "vestKg": 10, "restSec": 0 },
      { "name": "Rows", "reps": 10, "vestKg": 10, "restSec": 0 },
      { "name": "Sit-ups", "reps": 12, "vestKg": 10, "restSec": 0, "notes": "Round 3 allégé" }
    ]
  }
}`,
  },
  {
    id: 'cross-soir',
    label: 'Cross soir',
    blurb: 'KB 32 + PDC + corde · 35 min',
    json: `{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_cross_soir",
    "title": "Cross soir — KB · PDC · corde",
    "modality": "Cross",
    "durationMin": 35,
    "notes": "Créneau 17h30–19h. Intensité modérée → intense.",
    "music": {
      "playlistUrl": "https://music.youtube.com/search?q=hip%20hop%20workout",
      "label": "Garage Night"
    },
    "blocks": [
      { "name": "Corde à sauter", "durationSec": 90, "restSec": 30 },
      { "name": "KB Swing", "reps": 20, "loadKg": 32, "side": "both", "restSec": 30 },
      { "name": "Burpees", "reps": 10, "restSec": 30 },
      { "name": "Corde à sauter", "durationSec": 90, "restSec": 30 },
      { "name": "KB Goblet Squat", "reps": 15, "loadKg": 23, "restSec": 30 },
      { "name": "Pompes", "reps": 12, "restSec": 30 },
      { "name": "Corde à sauter", "durationSec": 60, "restSec": 20 },
      { "name": "KB Swing", "reps": 15, "loadKg": 32, "side": "both", "restSec": 45 },
      { "name": "Planche", "durationSec": 45, "restSec": 0, "notes": "Finisher — propre" }
    ]
  }
}`,
  },
]

/** Prompt snippet to paste into Coach 51 so exports stop being "bof" */
export const COACH_51_EXPORT_RULE = `Quand je dis "envoie à Arena" ou "export Arena 51", réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaire) au format :

{
  "type": "arena51.session",
  "version": 1,
  "from": "Coach 51",
  "session": {
    "id": "c51_YYYYMMDD_slug",
    "title": "titre court",
    "modality": "KB|PDC|Gilet|Cross|DB|Hyrox",
    "durationMin": 30,
    "notes": "consigne courte",
    "giletKg": 10,
    "music": {
      "playlistId": "PLxxxx",
      "playlistUrl": "https://music.youtube.com/playlist?list=PLxxxx",
      "label": "nom"
    },
    "blocks": [
      {
        "name": "exercice",
        "reps": 10,
        "durationSec": null,
        "side": "L|R|both",
        "loadKg": 23,
        "vestKg": null,
        "restSec": 30,
        "cue": "rappel technique court"
      }
    ]
  }
}

Règles : matériel maison KB 2×23 + 1×32 + gilet ; volume faisable ; sides L/R séparés en blocs ; un restSec en fin de tour ; jamais de WOD gonflé.`
