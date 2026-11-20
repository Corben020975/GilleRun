import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { sanitizeForTts } from './ttsSanitize'

export type VoiceCommand = 'next' | 'done' | 'drop' | 'pause' | 'resume'

let speakingUntil = 0

export function markSpeaking(durationMs = 2500) {
  speakingUntil = Date.now() + durationMs
}

export function isSpeakingGate(): boolean {
  // Ignore l'écoute pendant TTS + 500 ms
  return Date.now() < speakingUntil + 500
}

export function cueForBlock(opts: {
  name: string
  side?: string | null
  reps?: number
  durationSec?: number
  loadKg?: number
  vestKg?: number
  isRest?: boolean
  restSec?: number
  nextPreview?: string
}): string {
  if (opts.isRest) {
    const base = `Repos. ${opts.restSec ?? 30} secondes.`
    return opts.nextPreview ? `${base} Ensuite : ${opts.nextPreview}.` : base
  }
  const parts = [sanitizeForTts(opts.name)]
  if (opts.side === 'L') parts.push('côté gauche')
  if (opts.side === 'R') parts.push('côté droit')
  if (opts.reps) parts.push(`${opts.reps} répétitions`)
  if (opts.durationSec) parts.push(`${opts.durationSec} secondes`)
  if (opts.loadKg) parts.push(`${opts.loadKg} kilos`)
  if (opts.vestKg) parts.push(`gilet ${opts.vestKg}`)
  return parts.join('. ')
}

/** Commandes strictes uniquement. */
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const t = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
  if (!t) return null
  // Exactitude : le mot-clé doit être le cœur de l'énoncé (pas ok/oui/go…)
  if (/^(trop dur)$/.test(t) || /\btrop dur\b/.test(t)) return 'drop'
  if (/^(suivant)$/.test(t) || /\bsuivant\b/.test(t)) return 'next'
  if (/^(fait)$/.test(t) || /\bfait\b/.test(t)) return 'done'
  if (/^(pause)$/.test(t) || /\bpause\b/.test(t)) return 'pause'
  if (/^(reprendre)$/.test(t) || /\breprendre\b/.test(t)) return 'resume'
  return null
}

export async function speak(text: string): Promise<void> {
  const clean = sanitizeForTts(text)
  if (!clean.trim()) return
  markSpeaking(Math.min(8000, 800 + clean.length * 60))

  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop()
      await TextToSpeech.speak({
        text: clean,
        lang: 'fr-FR',
        rate: 1.05,
        pitch: 1.0,
        category: 'playback',
      })
      markSpeaking(400)
      return
    } catch {
      /* web fallback */
    }
  }

  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  await new Promise<void>((resolve) => {
    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang = 'fr-FR'
    utter.rate = 1.05
    utter.onend = () => {
      markSpeaking(400)
      resolve()
    }
    utter.onerror = () => resolve()
    window.speechSynthesis.speak(utter)
  })
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) await TextToSpeech.stop()
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  markSpeaking(0)
}

export type VoiceListenHandle = { stop: () => Promise<void> }

export async function startVoiceListen(
  onCommand: (cmd: VoiceCommand) => void,
  onStatus?: (msg: string) => void,
): Promise<VoiceListenHandle> {
  if (Capacitor.isNativePlatform()) return startNativeListen(onCommand, onStatus)
  return startWebListen(onCommand, onStatus)
}

async function startNativeListen(
  onCommand: (cmd: VoiceCommand) => void,
  onStatus?: (msg: string) => void,
): Promise<VoiceListenHandle> {
  let active = true
  let backoffMs = 400
  let restartTimer: ReturnType<typeof setTimeout> | null = null

  const avail = await SpeechRecognition.available()
  if (!avail.available) {
    onStatus?.('Reconnaissance vocale indisponible.')
    return { stop: async () => undefined }
  }
  const perm = await SpeechRecognition.requestPermissions()
  if (perm.speechRecognition !== 'granted') {
    onStatus?.('Autorise le micro pour Voice next.')
    return { stop: async () => undefined }
  }

  const scheduleRestart = () => {
    if (!active || restartTimer) return
    const wait = backoffMs
    // Backoff pour éviter la boucle serrée du SpeechRecognizer Android
    backoffMs = Math.min(4000, Math.round(backoffMs * 1.5))
    restartTimer = setTimeout(async () => {
      restartTimer = null
      if (!active) return
      if (isSpeakingGate()) {
        scheduleRestart()
        return
      }
      try {
        await SpeechRecognition.start({
          language: 'fr-FR',
          partialResults: true,
          popup: false,
          maxResults: 3,
        })
        backoffMs = 400
        onStatus?.('Écoute… « suivant » · « fait » · « trop dur »')
      } catch {
        scheduleRestart()
      }
    }, wait)
  }

  const handlePartial = await SpeechRecognition.addListener('partialResults', () => {
    // Partiels ignorés volontairement — on attend le résultat final via stop/listeningState
  })

  // Sur Android, avec partialResults, le final arrive souvent juste avant stopped.
  // On capture aussi via un second start sans partial pour les matches.
  const handleState = await SpeechRecognition.addListener('listeningState', async (data) => {
    if (!active) return
    if (data.status === 'stopped') scheduleRestart()
  })

  // Boucle de reconnaissance « oneshot » : start sans partial → matches finaux
  const loopFinal = async () => {
    while (active) {
      if (isSpeakingGate()) {
        await new Promise((r) => setTimeout(r, 300))
        continue
      }
      try {
        const res = await SpeechRecognition.start({
          language: 'fr-FR',
          partialResults: false,
          popup: false,
          maxResults: 3,
          prompt: 'Arena 51',
        })
        backoffMs = 400
        const text = (res.matches || []).join(' ')
        if (text) {
          onStatus?.(`« ${text} »`)
          if (!isSpeakingGate()) {
            const cmd = matchVoiceCommand(text)
            if (cmd) onCommand(cmd)
          }
        }
      } catch {
        // Redémarre avec backoff
        await new Promise((r) => setTimeout(r, backoffMs))
        backoffMs = Math.min(4000, Math.round(backoffMs * 1.5))
      }
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  onStatus?.('Écoute… « suivant » · « fait » · « trop dur »')
  void loopFinal()

  return {
    stop: async () => {
      active = false
      if (restartTimer) clearTimeout(restartTimer)
      try {
        await handlePartial.remove()
        await handleState.remove()
      } catch {
        /* ignore */
      }
      try {
        await SpeechRecognition.stop()
      } catch {
        /* ignore */
      }
      try {
        await SpeechRecognition.removeAllListeners()
      } catch {
        /* ignore */
      }
      onStatus?.('')
    },
  }
}

function startWebListen(
  onCommand: (cmd: VoiceCommand) => void,
  onStatus?: (msg: string) => void,
): Promise<VoiceListenHandle> {
  const SR =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

  if (!SR) {
    onStatus?.('Voix indisponible dans ce navigateur — utilise l’APK.')
    return Promise.resolve({ stop: async () => undefined })
  }

  let active = true
  let backoffMs = 400
  const rec = new SR()
  rec.lang = 'fr-FR'
  rec.continuous = true
  rec.interimResults = true

  rec.onresult = (event: SpeechRecognitionEvent) => {
    if (isSpeakingGate()) return
    const last = event.results[event.results.length - 1]
    if (!last?.[0] || !last.isFinal) return // finals only
    const transcript = last[0].transcript
    onStatus?.(`« ${transcript} »`)
    const cmd = matchVoiceCommand(transcript)
    if (cmd) onCommand(cmd)
  }

  const restart = () => {
    if (!active) return
    setTimeout(() => {
      if (!active) return
      try {
        rec.start()
        backoffMs = 400
      } catch {
        backoffMs = Math.min(4000, Math.round(backoffMs * 1.5))
        restart()
      }
    }, backoffMs)
  }

  rec.onerror = () => {
    if (active) {
      backoffMs = Math.min(4000, Math.round(backoffMs * 1.5))
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      restart()
    }
  }
  rec.onend = () => {
    if (active) restart()
  }

  try {
    rec.start()
    onStatus?.('Écoute… « suivant » · « fait » · « trop dur »')
  } catch {
    onStatus?.('Impossible de démarrer le micro.')
  }

  return Promise.resolve({
    stop: async () => {
      active = false
      rec.onend = null
      rec.onerror = null
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      onStatus?.('')
    },
  })
}
