import type { GhostSplit, Session, SessionLog } from '../types/session'
import type { PersistedPlayerState } from './sessionClock'
import { DEMO_SESSIONS } from '../data/demos'

const KEYS = {
  inbox: 'arena51.inbox',
  logs: 'arena51.logs',
  ghostsBest: 'arena51.ghosts.best',
  ghostsLast: 'arena51.ghosts.last',
  /** legacy single ghost map — migré à la lecture */
  ghostsLegacy: 'arena51.ghosts',
  player: 'arena51.player.active',
  demosSeeded: 'arena51.demos.seeded',
  demosCleared: 'arena51.demos.cleared',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function migrateGhosts() {
  const legacy = read<Record<string, GhostSplit> | null>(KEYS.ghostsLegacy, null)
  if (!legacy) return
  const best = read<Record<string, GhostSplit>>(KEYS.ghostsBest, {})
  const last = read<Record<string, GhostSplit>>(KEYS.ghostsLast, {})
  let touched = false
  for (const [id, g] of Object.entries(legacy)) {
    if (!last[id]) {
      last[id] = { ...g, kind: 'last' }
      touched = true
    }
    if (!best[id]) {
      best[id] = { ...g, kind: 'best' }
      touched = true
    }
  }
  if (touched) {
    write(KEYS.ghostsBest, best)
    write(KEYS.ghostsLast, last)
  }
  localStorage.removeItem(KEYS.ghostsLegacy)
}

export function getInbox(): Session[] {
  const cleared = read<boolean>(KEYS.demosCleared, false)
  const stored = read<Session[]>(KEYS.inbox, [])
  if (stored.length === 0 && !cleared) {
    write(KEYS.inbox, DEMO_SESSIONS)
    write(KEYS.demosSeeded, true)
    return DEMO_SESSIONS
  }
  return stored
}

export function saveInbox(sessions: Session[]) {
  write(KEYS.inbox, sessions)
  if (sessions.length === 0) write(KEYS.demosCleared, true)
}

export function addSessionToInbox(session: Session) {
  const inbox = getInbox()
  write(KEYS.inbox, [session, ...inbox.filter((s) => s.id !== session.id)])
}

export function removeSessionFromInbox(sessionId: string) {
  const next = getInbox().filter((s) => s.id !== sessionId)
  saveInbox(next)
  return next
}

export function getLogs(): SessionLog[] {
  return read(KEYS.logs, [])
}

export function saveLog(log: SessionLog) {
  const logs = getLogs()
  write(KEYS.logs, [log, ...logs].slice(0, 50))
}

export function getGhost(sessionId: string): GhostSplit | null {
  migrateGhosts()
  const best = read<Record<string, GhostSplit>>(KEYS.ghostsBest, {})
  return best[sessionId] ?? null
}

export function getLastGhost(sessionId: string): GhostSplit | null {
  migrateGhosts()
  const last = read<Record<string, GhostSplit>>(KEYS.ghostsLast, {})
  return last[sessionId] ?? null
}

/**
 * Enregistre la dernière séance + met à jour le meilleur ghost
 * uniquement si la séance est complète (aucun bloc abandonné).
 */
export function saveGhostsFromRun(ghost: GhostSplit, complete: boolean) {
  migrateGhosts()
  const last = read<Record<string, GhostSplit>>(KEYS.ghostsLast, {})
  last[ghost.sessionId] = { ...ghost, kind: 'last' }
  write(KEYS.ghostsLast, last)

  if (!complete) return

  const best = read<Record<string, GhostSplit>>(KEYS.ghostsBest, {})
  const prev = best[ghost.sessionId]
  if (!prev || ghost.totalMs < prev.totalMs) {
    best[ghost.sessionId] = { ...ghost, kind: 'best' }
    write(KEYS.ghostsBest, best)
  }
}

/** @deprecated use saveGhostsFromRun */
export function saveGhost(ghost: GhostSplit) {
  saveGhostsFromRun(ghost, true)
}

export function exportLogForCoach(log: SessionLog): string {
  return JSON.stringify(
    {
      type: 'arena51.log',
      version: 1,
      ...log,
    },
    null,
    2,
  )
}

export function getActivePlayer(): PersistedPlayerState | null {
  return read<PersistedPlayerState | null>(KEYS.player, null)
}

export function saveActivePlayer(state: PersistedPlayerState | null) {
  if (!state) localStorage.removeItem(KEYS.player)
  else write(KEYS.player, state)
}

export function clearActivePlayer() {
  localStorage.removeItem(KEYS.player)
}
