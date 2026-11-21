import Anthropic from '@anthropic-ai/sdk'
import { parseCoachPayload } from './parseSession'
import { getLogs } from './storage'
import { getSettings } from './settings'
import type { Session } from '../types/session'

/*
 * Génération de séance avec l'API Claude, directement depuis le téléphone.
 * La clé est celle de l'utilisateur (réglages), jamais envoyée ailleurs.
 * Sortie structurée (JSON schema) → même format que les exports Coach 51.
 */

const blockSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string' },
    reps: { type: 'integer' },
    durationSec: { type: 'integer' },
    side: { type: 'string', enum: ['L', 'R', 'both'] },
    loadKg: { type: 'number' },
    vestKg: { type: 'number' },
    restSec: { type: 'integer' },
    notes: { type: 'string' },
  },
}

const sessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'modality', 'durationMin', 'notes', 'structure'],
  properties: {
    title: { type: 'string' },
    modality: { type: 'string', enum: ['KB', 'PDC', 'Gilet', 'Cross', 'DB', 'Hyrox'] },
    durationMin: { type: 'integer' },
    notes: { type: 'string' },
    structure: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'blocks'],
        properties: {
          kind: { type: 'string', enum: ['rounds', 'emom', 'amrap', 'tabata'] },
          rounds: { type: 'integer' },
          minutes: { type: 'integer' },
          workSec: { type: 'integer' },
          restSec: { type: 'integer' },
          restBetweenRoundsSec: { type: 'integer' },
          blocks: { type: 'array', items: blockSchema },
        },
      },
    },
  },
}

const SYSTEM = `Tu es un coach de force et conditionnement. Tu conçois UNE séance d'entraînement exécutable dans une app chronomètre.

Format de la séance ("structure" = suite de parties) :
- "rounds" : N tours des mêmes exercices (champ rounds, et restBetweenRoundsSec pour le repos entre tours).
- "emom" : minutes = durée ; un exercice au début de chaque minute, en rotation sur la liste.
- "amrap" : minutes = durée ; un maximum de tours de la liste.
- "tabata" : rounds, workSec, restSec ; un seul exercice dans blocks.

Règles :
- Chaque exercice a soit reps, soit durationSec.
- Un exercice unilatéral = deux blocs séparés, side "L" puis "R".
- loadKg uniquement avec les charges réellement disponibles dans le profil.
- restSec = repos après l'exercice (0 si on enchaîne).
- notes d'exercice : un rappel technique de 6 mots maximum, sinon rien.
- Titre court (5 mots max), en français. notes de séance : une phrase.
- Volume réaliste pour la durée demandée. Échauffement intégré si la séance dépasse 20 min.`

function recentHistory(): string {
  const logs = getLogs().slice(0, 6)
  if (!logs.length) return 'Aucune séance enregistrée.'
  return logs
    .map((l) => {
      const d = new Date(l.finishedAt).toLocaleDateString('fr-BE')
      const bits = [`${d} : ${l.sessionTitle}`, `${Math.round(l.totalMs / 60000)} min`]
      if (l.rpe) bits.push(`ressenti ${l.rpe}/10`)
      const drops = l.blockLogs.filter((b) => b.dropped).length
      if (drops) bits.push(`${drops} exercice(s) allégé(s)`)
      if (l.note) bits.push(`note : ${l.note}`)
      return `- ${bits.join(', ')}`
    })
    .join('\n')
}

/** Complète les champs manquants pour que le player ne casse pas */
function normalize(raw: Record<string, unknown>) {
  const structure = (raw.structure as Record<string, unknown>[]).map((seg) => ({
    ...seg,
    rounds: seg.rounds ?? (seg.kind === 'tabata' ? 8 : 1),
    minutes: seg.minutes ?? 10,
    workSec: seg.workSec ?? 20,
    restSec: seg.restSec ?? 10,
  }))
  return { ...raw, structure }
}

export async function generateSession(request: string): Promise<Session> {
  const { claudeKey, profile } = getSettings()
  if (!claudeKey.trim()) throw new Error('Ajoute ta clé API Claude dans les réglages.')

  const client = new Anthropic({ apiKey: claudeKey.trim(), dangerouslyAllowBrowser: true })

  let response
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: sessionSchema },
      },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Profil :\n${profile}\n\nDernières séances :\n${recentHistory()}\n\nDemande : ${request}`,
        },
      ],
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Clé API Claude refusée. Vérifie-la dans les réglages.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Trop de demandes. Réessaie dans une minute.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Pas de connexion à Claude. Vérifie ton réseau.')
    if (e instanceof Anthropic.APIError) throw new Error(`Erreur Claude (${e.status}) : ${e.message}`)
    throw e
  }

  if (response.stop_reason === 'refusal') throw new Error('Claude a refusé cette demande. Reformule-la.')
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse trop longue. Demande une séance plus courte.')

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const data = normalize(JSON.parse(text) as Record<string, unknown>)
  const session = parseCoachPayload(JSON.stringify(data))
  return { ...session, id: `claude_${Date.now().toString(36)}`, source: 'Claude' }
}
