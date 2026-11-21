import { Share } from '@capacitor/share'
import { useState } from 'react'
import type { Session, SessionLog } from '../types/session'
import { formatMs } from '../lib/format'
import { pushLogToNotion } from '../lib/notion'
import { notionConfigured } from '../lib/settings'
import { exportLogForCoach, updateLog } from '../lib/storage'

/** Écran de fin : ressenti + note, enregistrement (et envoi Notion si configuré) */
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
  const [rpe, setRpe] = useState<number | null>(log.rpe ?? null)
  const [note, setNote] = useState(log.note ?? '')
  const [saving, setSaving] = useState(false)
  const [savedLog, setSavedLog] = useState<SessionLog | null>(null)
  const [status, setStatus] = useState('')
  const drops = log.blockLogs.filter((b) => b.dropped).length

  async function save() {
    setSaving(true)
    let next: SessionLog = { ...log, rpe: rpe ?? undefined, note: note.trim() || undefined }
    updateLog(next)
    if (notionConfigured()) {
      try {
        next = { ...next, notionPageId: await pushLogToNotion(next) }
        updateLog(next)
        setStatus('Enregistré et envoyé dans Notion ✓')
      } catch (e) {
        setStatus(`Enregistré. Notion : ${e instanceof Error ? e.message : 'erreur'} (renvoi possible depuis l’historique)`)
      }
    } else {
      setStatus('Enregistré ✓')
    }
    setSavedLog(next)
    setSaving(false)
  }

  async function shareForCoach() {
    const text = exportLogForCoach(savedLog ?? { ...log, rpe: rpe ?? undefined, note })
    try {
      await Share.share({ title: `Arena 51 — ${session.title}`, text, dialogTitle: 'Envoyer à Coach 51' })
    } catch {
      await navigator.clipboard.writeText(text)
      setStatus('Copié')
    }
  }

  return (
    <div className="afterglow">
      <div className="afterglow-card">
        <div className="phase-label">Séance terminée</div>
        <h2>BIEN JOUÉ</h2>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>{session.title}</p>
        <div className="stat-grid">
          <div className="stat">
            <div className="val">{formatMs(log.totalMs)}</div>
            <div className="lbl">Temps</div>
          </div>
          {log.amrapRounds != null ? (
            <div className="stat">
              <div className="val">{log.amrapRounds}</div>
              <div className="lbl">Tours</div>
            </div>
          ) : (
            <div className="stat">
              <div className="val">{drops}</div>
              <div className="lbl">Allégés</div>
            </div>
          )}
          <div className="stat">
            <div className="val">
              {ghostDeltaMs == null
                ? '—'
                : ghostDeltaMs < 0
                  ? `−${formatMs(Math.abs(ghostDeltaMs))}`
                  : ghostDeltaMs === 0
                    ? 'Record'
                    : `+${formatMs(ghostDeltaMs)}`}
            </div>
            <div className="lbl">vs record</div>
          </div>
        </div>
      </div>

      <p className="section-label">Ressenti — 1 facile · 10 à fond</p>
      <div className="rpe-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={rpe === n ? 'active' : ''} onClick={() => setRpe(n)}>
            {n}
          </button>
        ))}
      </div>

      <label className="field" style={{ marginTop: 14 }}>
        <span>Note (facultatif)</span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Douleur, forme, ce qui a coincé…"
        />
      </label>

      <div className="actions-row" style={{ flexDirection: 'column' }}>
        {!savedLog ? (
          <button type="button" className="btn btn-primary btn-block btn-xl" disabled={saving} onClick={() => void save()}>
            {saving ? 'Enregistrement…' : notionConfigured() ? 'Enregistrer (+ Notion)' : 'Enregistrer'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block btn-xl" onClick={onHome}>
            Retour aux séances
          </button>
        )}
        {status && <p className="hint">{status}</p>}
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void shareForCoach()}>
          Envoyer le résumé à Coach 51
        </button>
        {!savedLog && (
          <button type="button" className="btn btn-ghost btn-block" onClick={onHome}>
            Quitter sans ressenti
          </button>
        )}
      </div>
    </div>
  )
}
