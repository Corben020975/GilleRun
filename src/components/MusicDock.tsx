import type { Session } from '../types/session'

export function MusicDock({ session }: { session: Session }) {
  const playlistId = session.music?.playlistId
  const label = session.music?.label ?? 'YouTube Music'
  const embed = playlistId
    ? `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0`
    : null

  return (
    <div className="music-dock">
      <div className="music-dock-head">
        <span>YouTube Music · {label}</span>
        {session.music?.playlistUrl && (
          <a href={session.music.playlistUrl} target="_blank" rel="noreferrer">
            Ouvrir
          </a>
        )}
      </div>
      {embed ? (
        <iframe
          title="YouTube Music"
          src={embed}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Aucune playlist liée à cette séance.
        </div>
      )}
    </div>
  )
}
