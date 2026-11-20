import { useMemo, useState } from 'react'
import { COACH_PRESETS, parseCoachPayload } from '../lib/parseSession'
import type { Session } from '../types/session'

export function ImportPanel({
  onBack,
  onImported,
}: {
  onBack: () => void
  onImported: (session: Session) => void
}) {
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const preview = useMemo(() => {
    if (!raw.trim()) return null
    try {
      return parseCoachPayload(raw)
    } catch {
      return null
    }
  }, [raw])

  function handleImport() {
    try {
      onImported(parseCoachPayload(raw))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide')
    }
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      setRaw(text)
      setActivePreset(null)
      setError(null)
    } catch {
      setError('Presse-papiers inaccessible — colle manuellement.')
    }
  }

  return (
    <div>
      <div className="player-header" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Retour
        </button>
      </div>
      <div className="brand-text" style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', margin: 0, letterSpacing: '0.05em' }}>
          HANDOFF
        </h1>
        <p className="hint">Colle l’export Coach 51 (JSON, même avec ```json). Tolère le texte autour.</p>
      </div>

      <p className="section-label">Presets</p>
      <div className="session-list" style={{ marginBottom: 16 }}>
        {COACH_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="session-card"
            style={activePreset === p.id ? { borderColor: 'rgba(232,146,58,0.45)' } : undefined}
            onClick={() => {
              setActivePreset(p.id)
              setRaw(p.json)
              setError(null)
            }}
          >
            <div className="session-card-top">
              <h3>{p.label}</h3>
              <span className="modality-pill">Preset</span>
            </div>
            <div className="session-meta">
              <span>{p.blurb}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="panel">
        <textarea
          value={raw}
          placeholder={'Colle ici le JSON Arena 51…\n\n```json\n{ "type": "arena51.session", ... }\n```'}
          onChange={(e) => {
            setRaw(e.target.value)
            setActivePreset(null)
            setError(null)
          }}
          spellCheck={false}
          aria-label="JSON Coach 51"
        />
        {error && <p className="error-text">{error}</p>}
        {preview && !error && (
          <p className="hint" style={{ marginTop: 8 }}>
            Aperçu : <strong>{preview.title}</strong> · {preview.modality} · {preview.blocks.length} blocs · ~
            {preview.durationMin} min
          </p>
        )}
        <div className="actions-row" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => void pasteClipboard()}>
            Coller presse-papiers
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRaw('')
              setActivePreset(null)
              setError(null)
            }}
          >
            Effacer
          </button>
          <button type="button" className="btn btn-primary" onClick={handleImport} disabled={!raw.trim()}>
            Transcrire & lancer
          </button>
        </div>
      </div>
    </div>
  )
}
