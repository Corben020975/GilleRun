import { CapacitorHttp } from '@capacitor/core'
import { previewSections } from './describe'
import { getSettings, saveSettings } from './settings'
import type { Session, SessionLog } from '../types/session'

/*
 * Lien avec Notion.
 * - Le lien donné dans les réglages peut être une BASE existante (ex. « Séances »
 *   créée avec Grok) : l'app écrit dedans en reconnaissant les colonnes par
 *   leur type et leur nom (Séance, Date, Durée, Modalité, Charge, RPE, Note).
 * - Si c'est une simple PAGE, l'app y crée une base au même format.
 * L'API Notion refuse les appels depuis un navigateur (CORS) : on passe par
 * CapacitorHttp, qui fait la requête en natif sur Android.
 */

const API = 'https://api.notion.com/v1'

type Prop = { type: string; select?: { options?: { name: string }[] } }
type Schema = Record<string, Prop>

/** Extrait l'identifiant (32 caractères hexa) d'un lien Notion */
export function notionPageId(input: string): string | null {
  const m = input.replace(/-/g, '').match(/[0-9a-f]{32}/i)
  return m ? m[0] : null
}

async function rawCall(path: string, method: 'GET' | 'POST' | 'PATCH', data?: unknown) {
  const { notionToken } = getSettings()
  const res = await CapacitorHttp.request({
    url: `${API}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${notionToken.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    data,
  })
  if (res.status >= 400) {
    const msg = (res.data as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.data as Record<string, unknown>
}

/** Même appel, avec les erreurs courantes traduites */
async function call(path: string, method: 'GET' | 'POST' | 'PATCH', data?: unknown) {
  try {
    return await rawCall(path, method, data)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401) throw new Error('Jeton Notion invalide. Vérifie-le dans les réglages.')
    throw e
  }
}

/** Trouve (ou crée) la base où écrire, et renvoie son id + ses colonnes */
async function resolveDatabase(): Promise<{ id: string; schema: Schema }> {
  const s = getSettings()
  const target = notionPageId(s.notionPage)
  if (!target) throw new Error('Lien Notion invalide.')

  const known = s.notionDbId || target
  try {
    const db = await rawCall(`/databases/${known}`, 'GET')
    if (s.notionDbId !== known) saveSettings({ notionDbId: known })
    return { id: known, schema: db.properties as Schema }
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401) throw new Error('Jeton Notion invalide. Vérifie-le dans les réglages.')
    // 404/400 : ce n'est pas une base (ou elle n'existe plus) → on crée une base dans la page
  }

  try {
    const db = await rawCall('/databases', 'POST', {
      parent: { type: 'page_id', page_id: target },
      title: [{ type: 'text', text: { content: 'Séances' } }],
      properties: {
        Séance: { title: {} },
        Date: { date: {} },
        'Durée (min)': { number: { format: 'number' } },
        Modalité: { select: { options: [] } },
        'Charge (kg)': { number: { format: 'number' } },
        'RPE réel': { number: { format: 'number' } },
        Note: { rich_text: {} },
      },
    })
    const id = String(db.id)
    saveSettings({ notionDbId: id })
    return { id, schema: db.properties as Schema }
  } catch (e) {
    if ((e as { status?: number }).status === 404)
      throw new Error('Notion introuvable : ouvre la base (ou la page) › ••• › Connexions › ajoute ton intégration.')
    throw e
  }
}

/** Cherche une colonne par type et (si possible) par nom */
function findProp(schema: Schema, type: string, name?: RegExp): string | undefined {
  const all = Object.entries(schema).filter(([, p]) => p.type === type)
  if (name) return all.find(([n]) => name.test(n))?.[0]
  return all[0]?.[0]
}

/** Correspondance des modalités de l'app vers les options de la base */
const MODALITY_CANDIDATES: Record<string, string[]> = {
  KB: ['Kettlebell', 'KB', 'Force'],
  DB: ['Haltères', 'DB', 'Force'],
  PDC: ['PDC', 'Poids du corps', 'Force'],
  Gilet: ['Gilet', 'PDC', 'Force'],
  Cross: ['Cross', 'Circuit', 'Force'],
  Hyrox: ['Hyrox', 'HYROX'],
}

function pickOption(prop: Prop, modality: string): string {
  const options = (prop.select?.options ?? []).map((o) => o.name)
  const wanted = [...(MODALITY_CANDIDATES[modality] ?? []), 'Autre']
  for (const w of wanted) {
    const hit = options.find((o) => o.toLowerCase() === w.toLowerCase())
    if (hit) return hit
  }
  return options.length ? (options.includes('Autre') ? 'Autre' : modality) : modality
}

function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildProperties(log: SessionLog, session: Session | undefined, schema: Schema) {
  const props: Record<string, unknown> = {}
  const d = new Date(log.finishedAt)
  const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

  const title = findProp(schema, 'title')
  if (title) props[title] = { title: [{ text: { content: `Séance ${dm} — ${log.sessionTitle}` } }] }

  const date = findProp(schema, 'date', /date/i) ?? findProp(schema, 'date')
  if (date) props[date] = { date: { start: localDate(log.finishedAt) } }

  const dur = findProp(schema, 'number', /dur/i)
  if (dur) props[dur] = { number: Math.max(1, Math.round(log.totalMs / 60000)) }

  const mod = findProp(schema, 'select', /modal|type|discipline/i)
  if (mod) props[mod] = { select: { name: pickOption(schema[mod]!, log.modality) } }

  const rpe =
    findProp(schema, 'number', /rpe.*r[ée]el|ressenti/i) ?? findProp(schema, 'number', /^rpe$/i)
  if (rpe && log.rpe != null) props[rpe] = { number: log.rpe }

  const charge = findProp(schema, 'number', /charge|kg/i)
  const loads = session?.blocks.map((b) => b.loadKg).filter((l): l is number => l != null) ?? []
  if (charge && loads.length) props[charge] = { number: Math.max(...loads) }

  const note = findProp(schema, 'rich_text', /note|comment/i)
  const drops = log.blockLogs.filter((b) => b.dropped).length
  const noteText = [
    log.note,
    log.amrapRounds != null ? `${log.amrapRounds} tours AMRAP` : null,
    drops ? `${drops} exercice(s) allégé(s)` : null,
    'Faite avec Arena 51',
  ]
    .filter(Boolean)
    .join(' · ')
  if (note) props[note] = { rich_text: [{ text: { content: noteText.slice(0, 1900) } }] }

  return props
}

/** Contenu de la page : le déroulé des exercices, comme dans les fiches Grok */
function buildChildren(session: Session | undefined) {
  if (!session) return []
  const blocks: unknown[] = []
  for (const sec of previewSections(session)) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: sec.title }, annotations: { bold: true } }] },
    })
    for (const { text: line } of sec.items) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line } }] },
      })
    }
  }
  return blocks.slice(0, 100)
}

/** Envoie une séance terminée ; renvoie l'id de la page Notion créée */
export async function pushLogToNotion(log: SessionLog, session?: Session): Promise<string> {
  const { id, schema } = await resolveDatabase()
  const page = await call('/pages', 'POST', {
    parent: { database_id: id },
    properties: buildProperties(log, session, schema),
    children: buildChildren(session),
  })
  return String(page.id)
}

/** Dernières séances de la base Notion (pour que Claude en tienne compte) */
export async function recentNotionSessions(limit = 10): Promise<string[]> {
  const { id, schema } = await resolveDatabase()
  const date = findProp(schema, 'date', /date/i) ?? findProp(schema, 'date')
  const res = await call(`/databases/${id}/query`, 'POST', {
    page_size: limit,
    sorts: date ? [{ property: date, direction: 'descending' }] : undefined,
  })
  const pages = (res.results as { properties: Record<string, Record<string, unknown>> }[]) ?? []
  return pages.map((p) => {
    const parts: string[] = []
    for (const [name, v] of Object.entries(p.properties)) {
      const type = v.type as string
      if (type === 'title') parts.unshift(((v.title as { plain_text: string }[]) ?? []).map((t) => t.plain_text).join(''))
      else if (type === 'date' && v.date) parts.push(`${name} ${(v.date as { start: string }).start}`)
      else if (type === 'number' && v.number != null) parts.push(`${name} ${v.number}`)
      else if (type === 'select' && v.select) parts.push(`${name} ${(v.select as { name: string }).name}`)
      else if (type === 'rich_text') {
        const t = ((v.rich_text as { plain_text: string }[]) ?? []).map((x) => x.plain_text).join('')
        if (t) parts.push(`${name} : ${t}`)
      }
    }
    return `- ${parts.join(', ')}`
  })
}
