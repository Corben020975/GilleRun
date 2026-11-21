import { CapacitorHttp } from '@capacitor/core'
import { getSettings, saveSettings } from './settings'
import type { SessionLog } from '../types/session'

/*
 * Envoi de l'historique vers Notion.
 * L'API Notion refuse les appels depuis un navigateur (CORS) : on passe par
 * CapacitorHttp, qui fait la requête en natif sur Android.
 * Au premier envoi, l'app crée elle-même une base « Arena 51 — Historique »
 * dans la page indiquée (la page doit être partagée avec l'intégration).
 */

const API = 'https://api.notion.com/v1'

/** Extrait l'identifiant (32 caractères hexa) d'un lien de page Notion */
export function notionPageId(input: string): string | null {
  const m = input.replace(/-/g, '').match(/[0-9a-f]{32}/i)
  return m ? m[0] : null
}

async function call(path: string, method: 'GET' | 'POST', data?: unknown) {
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

async function createDatabase(): Promise<string> {
  const pageId = notionPageId(getSettings().notionPage)
  if (!pageId) throw new Error('Lien de page Notion invalide.')
  const db = await callFr('/databases', 'POST', {
    parent: { type: 'page_id', page_id: pageId },
    title: [{ type: 'text', text: { content: 'Arena 51 — Historique' } }],
    properties: {
      Séance: { title: {} },
      Date: { date: {} },
      'Durée (min)': { number: { format: 'number' } },
      Type: { select: { options: [] } },
      Ressenti: { number: { format: 'number' } },
      'Tours AMRAP': { number: { format: 'number' } },
      Allégements: { number: { format: 'number' } },
      Note: { rich_text: {} },
    },
  })
  const id = String(db.id)
  saveSettings({ notionDbId: id })
  return id
}

function pageFor(log: SessionLog, dbId: string) {
  return {
    parent: { database_id: dbId },
    properties: {
      Séance: { title: [{ text: { content: log.sessionTitle } }] },
      Date: { date: { start: log.finishedAt } },
      'Durée (min)': { number: Math.round(log.totalMs / 60000) },
      Type: { select: { name: log.modality } },
      Ressenti: { number: log.rpe ?? null },
      'Tours AMRAP': { number: log.amrapRounds ?? null },
      Allégements: { number: log.blockLogs.filter((b) => b.dropped).length },
      Note: { rich_text: log.note ? [{ text: { content: log.note.slice(0, 1900) } }] : [] },
    },
  }
}

/** Traduit les erreurs Notion courantes */
async function callFr(path: string, method: 'GET' | 'POST', data?: unknown) {
  try {
    return await call(path, method, data)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401) throw new Error('Jeton Notion invalide. Vérifie-le dans les réglages.')
    if (status === 404 && path === '/databases')
      throw new Error('Page Notion introuvable : ouvre la page › ••• › Connexions › ajoute ton intégration.')
    throw e
  }
}

/** Envoie une séance ; renvoie l'id de la page Notion créée */
export async function pushLogToNotion(log: SessionLog): Promise<string> {
  let dbId = getSettings().notionDbId || (await createDatabase())
  try {
    const page = await callFr('/pages', 'POST', pageFor(log, dbId))
    return String(page.id)
  } catch (e) {
    // Base supprimée ou plus accessible → on la recrée une fois
    if ((e as { status?: number }).status === 404) {
      dbId = await createDatabase()
      const page = await callFr('/pages', 'POST', pageFor(log, dbId))
      return String(page.id)
    }
    throw e
  }
}
