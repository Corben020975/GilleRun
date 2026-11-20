import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

const DEFAULT_PLAYLIST_KEY = 'arena51.defaultMusicUrl'

/** Official-feeling defaults that open in YouTube Music app/web */
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

  // Already a YTM / YT link
  if (/^https?:\/\//i.test(raw)) {
    // Convert classic YouTube playlist → Music domain when possible
    try {
      const u = new URL(raw)
      if (u.hostname.includes('youtube.com') && !u.hostname.includes('music.')) {
        const list = u.searchParams.get('list')
        if (list) return `https://music.youtube.com/playlist?list=${list}`
        const v = u.searchParams.get('v')
        if (v) return `https://music.youtube.com/watch?v=${v}`
        if (u.pathname.startsWith('/playlist')) {
          return `https://music.youtube.com${u.pathname}${u.search}`
        }
      }
      return raw
    } catch {
      return raw
    }
  }

  // Bare playlist id
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
    return `https://music.youtube.com/playlist?list=${raw}`
  }

  // Free text → search
  return `https://music.youtube.com/search?q=${encodeURIComponent(raw)}`
}

/**
 * YouTube Music cannot be embedded in an iframe.
 * Open the native app (or web) via system browser / Capacitor Browser.
 */
export async function openYouTubeMusic(url?: string | null): Promise<void> {
  const target = normalizeMusicUrl(url)

  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({
        url: target,
        presentationStyle: 'popover',
      })
      return
    } catch {
      // fall through
    }
  }

  // Web / fallback
  const opened = window.open(target, '_blank', 'noopener,noreferrer')
  if (!opened) {
    // Popup blocked — navigate top
    window.location.href = target
  }
}
