import { useMemo, useState } from 'react'
import { Afterglow } from './components/Afterglow'
import { ImportPanel } from './components/ImportPanel'
import { Inbox } from './components/Inbox'
import { Player } from './components/Player'
import {
  addSessionToInbox,
  getGhost,
  getInbox,
  saveGhost,
  saveLog,
} from './lib/storage'
import type { GhostSplit, Session, SessionLog } from './types/session'

type Screen =
  | { name: 'inbox' }
  | { name: 'import' }
  | { name: 'player'; session: Session }
  | { name: 'afterglow'; session: Session; log: SessionLog; ghostDeltaMs: number | null }

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => getInbox())
  const [screen, setScreen] = useState<Screen>({ name: 'inbox' })

  const ghosts = useMemo(() => {
    const map: Record<string, GhostSplit | null> = {}
    for (const s of sessions) map[s.id] = getGhost(s.id)
    return map
  }, [sessions, screen])

  function openSession(session: Session) {
    setScreen({ name: 'player', session })
  }

  function handleImported(session: Session) {
    addSessionToInbox(session)
    setSessions(getInbox())
    setScreen({ name: 'player', session })
  }

  function handleFinish(
    session: Session,
    payload: { totalMs: number; blockLogs: SessionLog['blockLogs']; blockDurationsMs: number[] },
  ) {
    const prev = getGhost(session.id)
    const log: SessionLog = {
      sessionId: session.id,
      sessionTitle: session.title,
      modality: session.modality,
      startedAt: new Date(Date.now() - payload.totalMs).toISOString(),
      finishedAt: new Date().toISOString(),
      totalMs: payload.totalMs,
      blockLogs: payload.blockLogs,
    }
    saveLog(log)
    saveGhost({
      sessionId: session.id,
      sessionTitle: session.title,
      blockDurationsMs: payload.blockDurationsMs,
      totalMs: payload.totalMs,
      finishedAt: log.finishedAt,
    })
    const ghostDeltaMs = prev ? payload.totalMs - prev.totalMs : null
    setScreen({ name: 'afterglow', session, log, ghostDeltaMs })
  }

  return (
    <div className="app-shell">
      {screen.name === 'inbox' && (
        <Inbox
          sessions={sessions}
          ghosts={ghosts}
          onOpen={openSession}
          onImport={() => setScreen({ name: 'import' })}
        />
      )}
      {screen.name === 'import' && (
        <ImportPanel onBack={() => setScreen({ name: 'inbox' })} onImported={handleImported} />
      )}
      {screen.name === 'player' && (
        <Player
          session={screen.session}
          ghost={getGhost(screen.session.id)}
          onAbort={() => setScreen({ name: 'inbox' })}
          onFinish={(payload) => handleFinish(screen.session, payload)}
        />
      )}
      {screen.name === 'afterglow' && (
        <Afterglow
          session={screen.session}
          log={screen.log}
          ghostDeltaMs={screen.ghostDeltaMs}
          onHome={() => setScreen({ name: 'inbox' })}
        />
      )}
    </div>
  )
}
