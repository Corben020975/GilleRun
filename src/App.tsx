import { useMemo, useState } from 'react'
import { Afterglow } from './components/Afterglow'
import { History } from './components/History'
import { SettingsScreen } from './components/SettingsScreen'
import { ImportPanel } from './components/ImportPanel'
import { Inbox } from './components/Inbox'
import { Player } from './components/Player'
import {
  addSessionToInbox,
  clearActivePlayer,
  getActivePlayer,
  getGhost,
  getInbox,
  getLastGhost,
  removeSessionFromInbox,
  saveGhostsFromRun,
  saveLog,
} from './lib/storage'
import type { PersistedPlayerState } from './lib/sessionClock'
import type { GhostSplit, Session, SessionLog } from './types/session'

type Screen =
  | { name: 'inbox' }
  | { name: 'import' }
  | { name: 'history' }
  | { name: 'settings'; back: 'inbox' | 'import' }
  | { name: 'player'; session: Session; resume?: PersistedPlayerState | null }
  | { name: 'afterglow'; session: Session; log: SessionLog; ghostDeltaMs: number | null }

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => getInbox())
  const [activePlayer, setActivePlayer] = useState<PersistedPlayerState | null>(() => getActivePlayer())
  const [screen, setScreen] = useState<Screen>({ name: 'inbox' })

  const ghosts = useMemo(() => {
    const map: Record<string, GhostSplit | null> = {}
    for (const s of sessions) map[s.id] = getGhost(s.id)
    return map
  }, [sessions, screen])

  const lastGhosts = useMemo(() => {
    const map: Record<string, GhostSplit | null> = {}
    for (const s of sessions) map[s.id] = getLastGhost(s.id)
    return map
  }, [sessions, screen])

  function refreshInbox() {
    setSessions(getInbox())
    setActivePlayer(getActivePlayer())
  }

  function openSession(session: Session) {
    setScreen({ name: 'player', session, resume: null })
  }

  function resumeActive() {
    const snap = getActivePlayer()
    if (!snap) return
    const session = getInbox().find((s) => s.id === snap.sessionId)
    if (!session) {
      clearActivePlayer()
      refreshInbox()
      return
    }
    setScreen({ name: 'player', session, resume: snap })
  }

  function handleImported(session: Session) {
    addSessionToInbox(session)
    refreshInbox()
    setScreen({ name: 'player', session, resume: null })
  }

  function handleFinish(
    session: Session,
    payload: {
      totalMs: number
      blockLogs: SessionLog['blockLogs']
      blockDurationsMs: number[]
      amrapRounds?: number
    },
  ) {
    const prevBest = getGhost(session.id)
    const complete = payload.blockLogs.every((b) => !b.dropped)
    const log: SessionLog = {
      sessionId: session.id,
      sessionTitle: session.title,
      modality: session.modality,
      startedAt: new Date(Date.now() - payload.totalMs).toISOString(),
      finishedAt: new Date().toISOString(),
      totalMs: payload.totalMs,
      blockLogs: payload.blockLogs,
      amrapRounds: payload.amrapRounds,
    }
    saveLog(log)
    saveGhostsFromRun(
      {
        sessionId: session.id,
        sessionTitle: session.title,
        blockDurationsMs: payload.blockDurationsMs,
        totalMs: payload.totalMs,
        finishedAt: log.finishedAt,
      },
      complete,
    )
    clearActivePlayer()
    setActivePlayer(null)
    const newBest = getGhost(session.id)
    const ghostDeltaMs = prevBest && newBest ? newBest.totalMs - prevBest.totalMs : null
    setScreen({ name: 'afterglow', session, log, ghostDeltaMs })
  }

  return (
    <div className="app-shell">
      {screen.name === 'inbox' && (
        <Inbox
          sessions={sessions}
          ghosts={ghosts}
          lastGhosts={lastGhosts}
          activePlayer={activePlayer}
          onOpen={openSession}
          onResume={resumeActive}
          onImport={() => setScreen({ name: 'import' })}
          onHistory={() => setScreen({ name: 'history' })}
          onSettings={() => setScreen({ name: 'settings', back: 'inbox' })}
          onDelete={(id) => {
            removeSessionFromInbox(id)
            refreshInbox()
          }}
        />
      )}
      {screen.name === 'import' && (
        <ImportPanel
          onBack={() => setScreen({ name: 'inbox' })}
          onImported={handleImported}
          onSettings={() => setScreen({ name: 'settings', back: 'import' })}
        />
      )}
      {screen.name === 'history' && <History onBack={() => setScreen({ name: 'inbox' })} />}
      {screen.name === 'settings' && <SettingsScreen onBack={() => setScreen(screen.back === 'import' ? { name: 'import' } : { name: 'inbox' })} />}
      {screen.name === 'player' && (
        <Player
          session={screen.session}
          ghost={getGhost(screen.session.id)}
          lastGhost={getLastGhost(screen.session.id)}
          resumeState={screen.resume ?? undefined}
          onAbort={() => {
            setActivePlayer(getActivePlayer())
            setScreen({ name: 'inbox' })
          }}
          onFinish={(payload) => handleFinish(screen.session, payload)}
        />
      )}
      {screen.name === 'afterglow' && (
        <Afterglow
          session={screen.session}
          log={screen.log}
          ghostDeltaMs={screen.ghostDeltaMs}
          onHome={() => {
            refreshInbox()
            setScreen({ name: 'inbox' })
          }}
        />
      )}
    </div>
  )
}
