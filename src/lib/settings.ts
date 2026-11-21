/** Réglages locaux (clés API, Notion, profil). Stockés uniquement sur le téléphone. */

export interface Settings {
  claudeKey: string
  notionToken: string
  notionPage: string
  /** Base Notion créée par l'app au premier envoi */
  notionDbId: string
  profile: string
}

const KEY = 'arena51.settings'

export const DEFAULT_PROFILE =
  'Matériel : 2 kettlebells de 23 kg, 1 kettlebell de 32 kg, gilet lesté 10 kg, corde à sauter. ' +
  'Séances à la maison, 25 à 40 min. Volume réaliste, pas de WOD gonflé.'

export function getSettings(): Settings {
  let stored: Partial<Settings> = {}
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Settings>
  } catch {
    /* ignore */
  }
  return {
    claudeKey: stored.claudeKey ?? '',
    notionToken: stored.notionToken ?? '',
    notionPage: stored.notionPage ?? '',
    notionDbId: stored.notionDbId ?? '',
    profile: stored.profile ?? DEFAULT_PROFILE,
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function notionConfigured(s = getSettings()): boolean {
  return Boolean(s.notionToken.trim() && s.notionPage.trim())
}
