import { useState } from 'react'
import type { Session, SessionLog } from '../types/session'
import { formatMs } from '../lib/format'
import { exportLogForCoach } from '../lib/storage'

export function Afterglow({
  session,
  log,
  ghostDeltaMs,
  onHome,
}: {
  session: Session
  log: SessionLog
  ghostDeltaMs: number | null
  onHome: () => void
}) {
  const [rpe, setRpe] = useState(log.rpe ?? 7)
  const [copied, setCopied] = useState(false)

  async function copyForCoach() {
    const payload = exportLogForCoach({ ...log, rpe })
    await navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="afterglow">
      <div className="afterglow-card">
        <div className="phase-label">Afterglow</div>
        <h2>SESSION STAMP</h2>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>{session.title}</p>
        <div className="stat-grid">
          <div className="stat">
            <div className="val">{formatMs(log.totalMs)}</div>
            <div className="lbl">Temps</div>
          </div>
          <div className="stat">
            <div className="val">{log.blockLogs.length}</div>
            <div className="lbl">Blocs</div>
          </div>
          <div className="stat">
            <div className="val">
              {ghostDeltaMs == null
                ? '—'
                : ghostDeltaMs <= 0
                  ? `−${formatMs(Math.abs(ghostDeltaMs))}`
                  : `+${formatMs(ghostDeltaMs)}`}
            </div>
            <div className="lbl">vs Ghost</div>
          </div>
        </div>
      </div>

      <p className="section-label">RPE</p>
      <div className="rpe-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={rpe === n ? 'active' : ''}
            onClick={() => setRpe(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="actions-row" style={{ flexDirection: 'column' }}>
        <button type="button" className="btn btn-primary btn-block" onClick={copyForCoach}>
          {copied ? 'Copié pour Coach 51' : 'Exporter log → Coach 51'}
        </button>
        <button type="button" className="btn btn-block" onClick={onHome}>
          Retour inbox
        </button>
      </div>
    </div>
  )
}
