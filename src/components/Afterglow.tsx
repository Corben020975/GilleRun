import { Share } from '@capacitor/share'
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
  const [status, setStatus] = useState('')

  function payload() {
    return exportLogForCoach({ ...log, rpe })
  }

  async function copyForCoach() {
    await navigator.clipboard.writeText(payload())
    setStatus('Copié pour Coach 51')
  }

  async function shareForCoach() {
    const text = payload()
    try {
      await Share.share({
        title: `Arena 51 — ${session.title}`,
        text,
        dialogTitle: 'Envoyer le log à Coach 51',
      })
      setStatus('Partagé')
    } catch {
      await copyForCoach()
    }
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
          {log.amrapRounds != null ? (
            <div className="stat">
              <div className="val">{log.amrapRounds}</div>
              <div className="lbl">Tours AMRAP</div>
            </div>
          ) : (
            <div className="stat">
              <div className="val">{log.blockLogs.length}</div>
              <div className="lbl">Blocs</div>
            </div>
          )}
          <div className="stat">
            <div className="val">
              {ghostDeltaMs == null
                ? '—'
                : ghostDeltaMs <= 0
                  ? `−${formatMs(Math.abs(ghostDeltaMs))}`
                  : `+${formatMs(ghostDeltaMs)}`}
            </div>
            <div className="lbl">vs Best</div>
          </div>
        </div>
      </div>

      <p className="section-label">RPE</p>
      <div className="rpe-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={rpe === n ? 'active' : ''} onClick={() => setRpe(n)}>
            {n}
          </button>
        ))}
      </div>

      <div className="actions-row" style={{ flexDirection: 'column' }}>
        <button type="button" className="btn btn-primary btn-block" onClick={() => void shareForCoach()}>
          Partager → Coach 51
        </button>
        <button type="button" className="btn btn-block" onClick={() => void copyForCoach()}>
          Copier le JSON
        </button>
        <button type="button" className="btn btn-block" onClick={onHome}>
          Retour inbox
        </button>
        {status && <p className="hint">{status}</p>}
      </div>
    </div>
  )
}
