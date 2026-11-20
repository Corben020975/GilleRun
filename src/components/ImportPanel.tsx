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
      const session = parseCoachPayload(raw)
      onImported(session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide')
    }
  }

  function loadPreset(id: string) {
    const preset = COACH_PRESETS.find((p) => p.id === id)
    if (!preset) return
    setActivePreset(id)
    setRaw(preset.json)
    setError(null)
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
        <p className="hint">Colle l’export Coach 51, ou charge un preset propre.</p>
      </div>

      <p className="section-label">Presets Coach 51</p>
      <div className="session-list" style={{ marginBottom: 16 }}>
        {COACH_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="session-card"
            style={activePreset === p.id ? { borderColor: 'rgba(232,146,58,0.45)' } : undefined}
            onClick={() => loadPreset(p.id)}
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
          placeholder={`Colle ici le JSON Arena 51 de Coach 51…\n\n{ "type": "arena51.session", "session": { ... } }`}
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
        <div className="actions-row" style={{ marginBottom: 0 }}>
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
