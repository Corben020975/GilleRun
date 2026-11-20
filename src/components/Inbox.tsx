import type { GhostSplit, Session } from '../types/session'
import { formatMs } from '../lib/format'

export function Inbox({
  sessions,
  ghosts,
  onOpen,
  onImport,
}: {
  sessions: Session[]
  ghosts: Record<string, GhostSplit | null>
  onOpen: (s: Session) => void
  onImport: () => void
}) {
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

      <div className="actions-row">
        <button type="button" className="btn btn-primary" onClick={onImport}>
          Recevoir Coach 51
        </button>
      </div>

      <p className="section-label">Inbox séances</p>
      <div className="session-list">
        {sessions.map((s) => {
          const ghost = ghosts[s.id]
          return (
            <button key={s.id} type="button" className="session-card" onClick={() => onOpen(s)}>
              <div className="session-card-top">
                <h3>{s.title}</h3>
                <span className="modality-pill">{s.modality}</span>
              </div>
              <div className="session-meta">
                <span>{s.durationMin} min</span>
                <span>{s.blocks.length} blocs</span>
                <span>{s.source}</span>
                {ghost && <span className="ghost-badge">Ghost {formatMs(ghost.totalMs)}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
