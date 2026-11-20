import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

export type VoiceCommand = 'next' | 'done' | 'drop'

export function cueForBlock(opts: {
  name: string
  side?: string | null
  reps?: number
  durationSec?: number
  loadKg?: number
  vestKg?: number
  isRest?: boolean
  restSec?: number
}): string {
  if (opts.isRest) {
    return `Repos. ${opts.restSec ?? 30} secondes.`
  }
  const parts = [opts.name]
  if (opts.side === 'L') parts.push('côté gauche')
  if (opts.side === 'R') parts.push('côté droit')
  if (opts.reps) parts.push(`${opts.reps} répétitions`)
  if (opts.durationSec) parts.push(`${opts.durationSec} secondes`)
  if (opts.loadKg) parts.push(`${opts.loadKg} kilos`)
  if (opts.vestKg) parts.push(`gilet ${opts.vestKg}`)
  return parts.join('. ')
}

export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const t = transcript.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim()
  if (!t) return null
  if (/(trop dur|drop|allege|allège|panic|plus leger|plus léger)/.test(t)) return 'drop'
  if (/(suivant|next|avancer|go|continue|passe|encore)/.test(t)) return 'next'
  if (/(fait|done|ok|termine|terminé|valide|valider|yes|oui)/.test(t)) return 'done'
  return null
}

export async function speak(text: string): Promise<void> {
  if (!text.trim()) return

  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop()
      await TextToSpeech.speak({
        text,
        lang: 'fr-FR',
        rate: 1.05,
        pitch: 1.0,
        category: 'playback',
      })
      return
    } catch {
      // fall through to web TTS
    }
  }

  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  await new Promise<void>((resolve) => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'fr-FR'
    utter.rate = 1.05
    utter.pitch = 0.95
    utter.onend = () => resolve()
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
}

export type VoiceListenHandle = {
  stop: () => Promise<void>
}

/**
 * Starts voice command listening.
 * Native Android/iOS: Capacitor SpeechRecognition (needs mic permission).
 * Web: Web Speech API when available.
 */
export async function startVoiceListen(
  onCommand: (cmd: VoiceCommand) => void,
  onStatus?: (msg: string) => void,
): Promise<VoiceListenHandle> {
  if (Capacitor.isNativePlatform()) {
    return startNativeListen(onCommand, onStatus)
  }
  return startWebListen(onCommand, onStatus)
}

async function startNativeListen(
  onCommand: (cmd: VoiceCommand) => void,
  onStatus?: (msg: string) => void,
): Promise<VoiceListenHandle> {
  let active = true
  let restarting = false

  const avail = await SpeechRecognition.available()
  if (!avail.available) {
    onStatus?.('Reconnaissance vocale indisponible sur cet appareil.')
    return { stop: async () => undefined }
  }

  const perm = await SpeechRecognition.requestPermissions()
  if (perm.speechRecognition !== 'granted') {
    onStatus?.('Autorise le micro pour Voice next.')
    return { stop: async () => undefined }
  }

  const handlePartial = await SpeechRecognition.addListener('partialResults', (data) => {
    const text = (data.matches || []).join(' ')
    if (!text) return
    onStatus?.(`« ${text} »`)
    const cmd = matchVoiceCommand(text)
    if (cmd) onCommand(cmd)
  })

  const handleState = await SpeechRecognition.addListener('listeningState', async (data) => {
    if (!active) return
    if (data.status === 'stopped' && !restarting) {
      restarting = true
      setTimeout(async () => {
        if (!active) {
          restarting = false
          return
        }
        try {
          await SpeechRecognition.start({
            language: 'fr-FR',
            partialResults: true,
            popup: false,
            maxResults: 3,
          })
          onStatus?.('Écoute… dis « suivant »')
        } catch {
          onStatus?.('Écoute interrompue — rétente…')
        } finally {
          restarting = false
        }
      }, 350)
    }
  })

  try {
    await SpeechRecognition.start({
      language: 'fr-FR',
      partialResults: true,
      popup: false,
      maxResults: 3,
    })
    onStatus?.('Écoute… dis « suivant », « fait » ou « trop dur »')
  } catch (e) {
    onStatus?.(e instanceof Error ? e.message : 'Impossible de démarrer le micro.')
  }

  return {
    stop: async () => {
      active = false
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
    onStatus?.('Ce navigateur ne gère pas la voix — utilise l’APK Android.')
    return Promise.resolve({ stop: async () => undefined })
  }

  let active = true
  const rec = new SR()
  rec.lang = 'fr-FR'
  rec.continuous = true
  rec.interimResults = true

  rec.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1]
    if (!last?.[0]) return
    const transcript = last[0].transcript
    if (last.isFinal) onStatus?.(`« ${transcript} »`)
    const cmd = matchVoiceCommand(transcript)
    if (cmd && last.isFinal) onCommand(cmd)
  }

  rec.onerror = (ev: Event) => {
    const err = (ev as unknown as { error?: string }).error
    if (err === 'not-allowed') onStatus?.('Micro bloqué par le navigateur.')
    else if (active) {
      try {
        rec.stop()
        setTimeout(() => {
          if (active) rec.start()
        }, 500)
      } catch {
        /* ignore */
      }
    }
  }

  rec.onend = () => {
    if (!active) return
    try {
      rec.start()
    } catch {
      /* ignore */
    }
  }

  try {
    rec.start()
    onStatus?.('Écoute… dis « suivant », « fait » ou « trop dur »')
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
