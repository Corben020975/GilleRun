import type { GhostSplit, Session } from '../types/session'
import type { PersistedPlayerState } from '../lib/sessionClock'
import { formatMs } from '../lib/format'

export function Inbox({
  sessions,
  ghosts,
  lastGhosts,
  activePlayer,
  onOpen,
  onResume,
  onImport,
  onDelete,
}: {
  sessions: Session[]
  ghosts: Record<string, GhostSplit | null>
  lastGhosts: Record<string, GhostSplit | null>
  activePlayer: PersistedPlayerState | null
  onOpen: (s: Session) => void
  onResume: () => void
  onImport: () => void
  onDelete: (id: string) => void
}) {
  const resumeSession = activePlayer
    ? sessions.find((s) => s.id === activePlayer.sessionId)
    : null

  return (
    <div>
      <div className="brand-row">
        <div className="brand-mark">
          <img src="/icon.jpg" alt="Arena 51" />
        </div>
        <div className="brand-text">
          <h1>ARENA 51</h1>
          <p>
            Coach 51 envoie. <span className="tagline-ember">Arena exécute.</span>
          </p>
        </div>
      </div>

      {resumeSession && activePlayer && (
        <button type="button" className="btn btn-primary btn-block btn-xl" style={{ marginBottom: 16 }} onClick={onResume}>
          Reprendre · {resumeSession.title} · {formatMs(activePlayer.sessionElapsedMs)}
        </button>
      )}

      <div className="actions-row">
        <button type="button" className="btn btn-primary" onClick={onImport}>
          + Importer une séance
        </button>
      </div>

      <p className="section-label">Mes séances</p>
      <div className="session-list">
        {sessions.map((s) => {
          const ghost = ghosts[s.id]
          const last = lastGhosts[s.id]
          return (
            <div key={s.id} className="session-card-wrap">
              <button type="button" className="session-card" onClick={() => onOpen(s)}>
                <div className="session-card-top">
                  <h3>{s.title}</h3>
                  <span className="modality-pill">{s.modality}</span>
                </div>
                <div className="session-meta">
                  <span>{s.durationMin} min</span>
                  <span>{s.blocks.length} blocs</span>
                  <span>{s.source}</span>
                  {ghost && <span className="ghost-badge">Best {formatMs(ghost.totalMs)}</span>}
                  {last && <span>Dernière {formatMs(last.totalMs)}</span>}
                </div>
              </button>
              <button
                type="button"
                className="btn btn-ghost session-delete"
                title="Supprimer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Supprimer « ${s.title} » ?`)) onDelete(s.id)
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
        {sessions.length === 0 && <p className="hint">Aucune séance. Importe-en une.</p>}
      </div>
    </div>
  )
}
