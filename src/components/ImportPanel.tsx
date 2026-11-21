import { useState } from 'react'
import { generateSession } from '../lib/claude'
import { COACH_PRESETS, parseCoachPayload } from '../lib/parseSession'
import { getSettings } from '../lib/settings'
import type { Session } from '../types/session'

const IDEAS = [
  'Kettlebell 30 min, force + cardio',
  'EMOM 20 min kettlebell',
  'Gilet lesté 25 min, poids du corps',
  'Séance courte 15 min, je suis fatigué',
  'AMRAP 12 min + gainage',
]

/** Nouvelle séance : générée par Claude, collée depuis Coach 51, ou modèle */
export function ImportPanel({
  onBack,
  onImported,
  onSettings,
}: {
  onBack: () => void
  onImported: (session: Session) => void
  onSettings: () => void
}) {
  const hasKey = Boolean(getSettings().claudeKey.trim())
  const [request, setRequest] = useState('')
  const [generating, setGenerating] = useState(false)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      onImported(await generateSession(request.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Génération impossible.')
    } finally {
      setGenerating(false)
    }
  }

  function importJson() {
    try {
      onImported(parseCoachPayload(raw))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Texte non reconnu.')
    }
  }

  async function pasteClipboard() {
    try {
      setRaw(await navigator.clipboard.readText())
      setError(null)
    } catch {
      setError('Presse-papiers inaccessible — colle manuellement.')
    }
  }

  return (
    <div>
      <div className="player-header" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Séances
        </button>
      </div>
      <h1 className="screen-title">Nouvelle séance</h1>

      <p className="section-label">Générer avec Claude</p>
      <div className="panel">
        {hasKey ? (
          <>
            <textarea
              rows={3}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Ex. : 30 min kettlebell, j’ai mal à l’épaule gauche, pas de saut"
              aria-label="Séance souhaitée"
            />
            <div className="chips">
              {IDEAS.map((i) => (
                <button key={i} type="button" className="chip" onClick={() => setRequest(i)}>
                  {i}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block btn-xl"
              disabled={generating || !request.trim()}
              onClick={() => void generate()}
            >
              {generating ? 'Claude prépare ta séance…' : 'Générer la séance'}
            </button>
            {generating && <p className="hint">Ça prend 20 à 60 secondes.</p>}
          </>
        ) : (
          <>
            <p className="hint" style={{ marginTop: 0 }}>
              Ajoute ta clé API Claude pour générer une séance sur mesure en une phrase.
            </p>
            <button type="button" className="btn btn-block" onClick={onSettings}>
              Ouvrir les réglages
            </button>
          </>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      <p className="section-label">Modèles prêts</p>
      <div className="session-list" style={{ marginBottom: 16 }}>
        {COACH_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="session-card"
            onClick={() => onImported(parseCoachPayload(p.json))}
          >
            <div className="session-card-top">
              <h3>{p.label}</h3>
            </div>
            <div className="session-meta">
              <span>{p.blurb}</span>
            </div>
          </button>
        ))}
      </div>

      <details className="panel">
        <summary>Coller une séance de Coach 51</summary>
        <textarea
          value={raw}
          placeholder="Colle ici le bloc envoyé par Coach 51…"
          onChange={(e) => {
            setRaw(e.target.value)
            setError(null)
          }}
          spellCheck={false}
          aria-label="Séance Coach 51"
        />
        <div className="actions-row" style={{ marginBottom: 0 }}>
          <button type="button" className="btn" onClick={() => void pasteClipboard()}>
            Coller
          </button>
          <button type="button" className="btn btn-primary" onClick={importJson} disabled={!raw.trim()}>
            Ajouter
          </button>
        </div>
      </details>
    </div>
  )
}
