import type { GhostSplit, Session, SessionLog } from '../types/session'
import { DEMO_SESSIONS } from '../data/demos'

const KEYS = {
  inbox: 'arena51.inbox',
  logs: 'arena51.logs',
  ghosts: 'arena51.ghosts',
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

export function getInbox(): Session[] {
  const stored = read<Session[]>(KEYS.inbox, [])
  if (stored.length === 0) {
    write(KEYS.inbox, DEMO_SESSIONS)
    return DEMO_SESSIONS
  }
  return stored
}

export function saveInbox(sessions: Session[]) {
  write(KEYS.inbox, sessions)
}

export function addSessionToInbox(session: Session) {
  const inbox = getInbox()
  write(KEYS.inbox, [session, ...inbox.filter((s) => s.id !== session.id)])
}

export function getLogs(): SessionLog[] {
  return read(KEYS.logs, [])
}

export function saveLog(log: SessionLog) {
  const logs = getLogs()
  write(KEYS.logs, [log, ...logs].slice(0, 50))
}

export function getGhost(sessionId: string): GhostSplit | null {
  const ghosts = read<Record<string, GhostSplit>>(KEYS.ghosts, {})
  return ghosts[sessionId] ?? null
}

export function saveGhost(ghost: GhostSplit) {
  const ghosts = read<Record<string, GhostSplit>>(KEYS.ghosts, {})
  ghosts[ghost.sessionId] = ghost
  write(KEYS.ghosts, ghosts)
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
