import { useState } from 'react'
import type { Session } from '../types/session'
import {
  DEFAULT_YTM_PLAYLISTS,
  getDefaultMusicUrl,
  normalizeMusicUrl,
  openYouTubeMusic,
  setDefaultMusicUrl,
} from '../lib/music'

/** Uniquement sur l'écran « Prêt ? » — jamais pendant la séance. */
export function MusicDock({ session }: { session: Session }) {
  const sessionUrl = session.music?.playlistUrl || session.music?.playlistId
  const label = session.music?.label ?? 'YouTube Music'
  const [customUrl, setCustomUrl] = useState(() => getDefaultMusicUrl())
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resolved = normalizeMusicUrl(sessionUrl || customUrl)

  async function launch() {
    setBusy(true)
    setStatus(null)
    try {
      const url = sessionUrl ? normalizeMusicUrl(sessionUrl) : normalizeMusicUrl(customUrl)
      if (!sessionUrl && customUrl.trim()) setDefaultMusicUrl(customUrl)
      await openYouTubeMusic(url)
      setStatus('YouTube Music lancé — reviens ici pour le chrono.')
    } catch {
      setStatus('Impossible d’ouvrir YouTube Music.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="music-dock">
      <div className="music-dock-head">
        <span>YouTube Music · {label}</span>
        <span className="hint" style={{ margin: 0 }}>
          App native
        </span>
      </div>
      <div className="music-dock-body">
        <p className="hint" style={{ marginTop: 0 }}>
          Ouvre YTM à côté (intent). Le timer reste au premier plan dès que tu reviens.
        </p>
        <input
          className="music-input"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="Lien playlist YouTube Music…"
          aria-label="URL YouTube Music"
        />
        <div className="music-presets">
          {Object.values(DEFAULT_YTM_PLAYLISTS).map((p) => (
            <button
              key={p.label}
              type="button"
              className="music-chip"
              onClick={() => {
                setCustomUrl(p.playlistUrl)
                setDefaultMusicUrl(p.playlistUrl)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void launch()}>
          {busy ? 'Ouverture…' : '▶ Lancer YouTube Music'}
        </button>
        {status && <p className="hint">{status}</p>}
        <p className="hint" style={{ wordBreak: 'break-all', opacity: 0.65 }}>
          {resolved}
        </p>
      </div>
    </div>
  )
}
