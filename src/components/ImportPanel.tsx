import { useState } from 'react'
import { parseCoachPayload, SAMPLE_COACH_JSON } from '../lib/parseSession'
import type { Session } from '../types/session'

export function ImportPanel({
  onBack,
  onImported,
}: {
  onBack: () => void
  onImported: (session: Session) => void
}) {
  const [raw, setRaw] = useState(SAMPLE_COACH_JSON)
  const [error, setError] = useState<string | null>(null)

  function handleImport() {
    try {
      const session = parseCoachPayload(raw)
      onImported(session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide')
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
        <p className="hint">Colle le JSON généré par Coach 51. Arena le transcrit en timer.</p>
      </div>
      <div className="panel">
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            setError(null)
          }}
          spellCheck={false}
          aria-label="JSON Coach 51"
        />
        {error && <p className="error-text">{error}</p>}
        <div className="actions-row" style={{ marginBottom: 0 }}>
          <button type="button" className="btn" onClick={() => setRaw(SAMPLE_COACH_JSON)}>
            Exemple
          </button>
          <button type="button" className="btn btn-primary" onClick={handleImport}>
            Transcrire & lancer
          </button>
        </div>
      </div>
    </div>
  )
}
