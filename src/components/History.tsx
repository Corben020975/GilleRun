import { useState } from 'react'
import { formatMs } from '../lib/format'
import { pushLogToNotion } from '../lib/notion'
import { notionConfigured } from '../lib/settings'
import { getLogs, updateLog } from '../lib/storage'
import type { SessionLog } from '../types/session'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function History({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<SessionLog[]>(getLogs)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const pending = logs.filter((l) => !l.notionPageId)
  const canSync = notionConfigured()

  async function syncAll() {
    setBusy(true)
    let ok = 0
    try {
      // Du plus ancien au plus récent pour garder l'ordre dans Notion
      for (const log of [...pending].reverse()) {
        const id = await pushLogToNotion(log)
        updateLog({ ...log, notionPageId: id })
        ok++
      }
      setStatus(`${ok} séance${ok > 1 ? 's' : ''} envoyée${ok > 1 ? 's' : ''} dans Notion.`)
    } catch (e) {
      setStatus(`${ok ? `${ok} envoyée(s), puis erreur : ` : ''}${e instanceof Error ? e.message : 'erreur Notion'}`)
    } finally {
      setLogs(getLogs())
      setBusy(false)
    }
  }

  const last7 = logs.filter((l) => Date.now() - new Date(l.finishedAt).getTime() < 7 * 864e5)

  return (
    <div>
      <div className="player-header" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Séances
        </button>
      </div>
      <h1 className="screen-title">Historique</h1>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="val">{last7.length}</div>
          <div className="lbl">Séances 7 j</div>
        </div>
        <div className="stat">
          <div className="val">{Math.round(last7.reduce((a, l) => a + l.totalMs, 0) / 60000)}</div>
          <div className="lbl">Minutes 7 j</div>
        </div>
        <div className="stat">
          <div className="val">{logs.length}</div>
          <div className="lbl">Total</div>
        </div>
      </div>

      {canSync && pending.length > 0 && (
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void syncAll()}>
          {busy ? 'Envoi…' : `Envoyer dans Notion (${pending.length})`}
        </button>
      )}
      {!canSync && logs.length > 0 && <p className="hint">Configure Notion dans les réglages pour y envoyer tes séances.</p>}
      {status && <p className="hint">{status}</p>}

      <div className="session-list" style={{ marginTop: 12 }}>
        {logs.map((l) => {
          const drops = l.blockLogs.filter((b) => b.dropped).length
          return (
            <div key={l.finishedAt + l.sessionId} className="session-card history-card">
              <div className="session-card-top">
                <h3>{l.sessionTitle}</h3>
                <span className="modality-pill">{l.modality}</span>
              </div>
              <div className="session-meta">
                <span>{fmtDate(l.finishedAt)}</span>
                <span>{formatMs(l.totalMs)}</span>
                {l.rpe != null && <span>Ressenti {l.rpe}/10</span>}
                {l.amrapRounds != null && <span>{l.amrapRounds} tours</span>}
                {drops > 0 && <span>{drops} allégé{drops > 1 ? 's' : ''}</span>}
                {l.notionPageId && <span className="ghost-badge">Notion ✓</span>}
              </div>
              {l.note && <p className="hint" style={{ margin: '6px 0 0' }}>« {l.note} »</p>}
            </div>
          )
        })}
        {logs.length === 0 && <p className="hint">Aucune séance terminée pour l’instant.</p>}
      </div>
    </div>
  )
}
