import { useEffect, useState } from 'react'
import type { Session } from '../types/session'
import {
  DEFAULT_YTM_PLAYLISTS,
  getDefaultMusicUrl,
  normalizeMusicUrl,
  openYouTubeMusic,
  setDefaultMusicUrl,
} from '../lib/music'

export function MusicDock({
  session,
  autoOpen,
}: {
  session: Session
  autoOpen?: boolean
}) {
  const sessionUrl = session.music?.playlistUrl || session.music?.playlistId
  const label = session.music?.label ?? 'YouTube Music'
  const [customUrl, setCustomUrl] = useState(() => getDefaultMusicUrl())
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resolved = normalizeMusicUrl(sessionUrl || customUrl)

  useEffect(() => {
    if (!autoOpen) return
    void launch('auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, session.id])

  async function launch(reason: 'tap' | 'auto' = 'tap') {
    setBusy(true)
    setStatus(reason === 'auto' ? 'Ouverture YouTube Music…' : null)
    try {
      const url = sessionUrl ? normalizeMusicUrl(sessionUrl) : normalizeMusicUrl(customUrl)
      if (!sessionUrl && customUrl.trim()) setDefaultMusicUrl(customUrl)
      await openYouTubeMusic(url)
      setStatus('YouTube Music ouvert — reviens ici pour le timer.')
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
          YouTube Music ne s’embarque pas dans l’app (blocage Google). Arena l’ouvre à côté — le timer reste ici.
        </p>

        <div className="music-url-row">
          <input
            className="music-input"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Colle ton lien playlist YouTube Music…"
            aria-label="URL YouTube Music"
          />
        </div>

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

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={() => void launch('tap')}
        >
          {busy ? 'Ouverture…' : '▶ Lancer YouTube Music'}
        </button>

        {status && <p className="hint">{status}</p>}
        <p className="hint" style={{ wordBreak: 'break-all', opacity: 0.7 }}>
          {resolved}
        </p>
      </div>
    </div>
  )
}
