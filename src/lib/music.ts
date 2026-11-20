import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'

const DEFAULT_PLAYLIST_KEY = 'arena51.defaultMusicUrl'

export const DEFAULT_YTM_PLAYLISTS = {
  engine: {
    label: 'Workout Energy',
    playlistUrl: 'https://music.youtube.com/search?q=workout%20energy',
  },
  pulse: {
    label: 'Dark Pulse',
    playlistUrl: 'https://music.youtube.com/search?q=dark%20electronic%20workout',
  },
  garage: {
    label: 'Garage Night',
    playlistUrl: 'https://music.youtube.com/search?q=hip%20hop%20workout',
  },
  charts: {
    label: 'Charts',
    playlistUrl: 'https://music.youtube.com/charts',
  },
} as const

export function getDefaultMusicUrl(): string {
  try {
    return localStorage.getItem(DEFAULT_PLAYLIST_KEY) || DEFAULT_YTM_PLAYLISTS.engine.playlistUrl
  } catch {
    return DEFAULT_YTM_PLAYLISTS.engine.playlistUrl
  }
}

export function setDefaultMusicUrl(url: string) {
  localStorage.setItem(DEFAULT_PLAYLIST_KEY, url.trim())
}

export function normalizeMusicUrl(input?: string | null): string {
  const raw = (input || '').trim()
  if (!raw) return getDefaultMusicUrl()
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (u.hostname.includes('youtube.com') && !u.hostname.includes('music.')) {
        const list = u.searchParams.get('list')
        if (list) return `https://music.youtube.com/playlist?list=${list}`
        const v = u.searchParams.get('v')
        if (v) return `https://music.youtube.com/watch?v=${v}`
      }
      return raw
    } catch {
      return raw
    }
  }
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
    return `https://music.youtube.com/playlist?list=${raw}`
  }
  return `https://music.youtube.com/search?q=${encodeURIComponent(raw)}`
}

/**
 * Ouvre YouTube Music sans Custom Tab qui recouvre Arena.
 * Sur Android, un lien https://music.youtube.com est un App Link : il ouvre
 * directement l'app YT Music si elle est installée, sinon le navigateur.
 * Attention : AppLauncher.openUrl ne lève jamais d'erreur, il renvoie
 * { completed: false } — il faut donc tester ce retour.
 */
export async function openYouTubeMusic(url?: string | null): Promise<void> {
  const httpsUrl = normalizeMusicUrl(url)

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AppLauncher.openUrl({ url: httpsUrl })
      if (res.completed) return
    } catch {
      /* fallback ci-dessous */
    }
  }

  // Web / échec natif : navigateur système
  const opened = window.open(httpsUrl, '_blank', 'noopener,noreferrer')
  if (!opened) throw new Error('Impossible d’ouvrir YouTube Music')
}
