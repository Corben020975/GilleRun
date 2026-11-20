export function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'fr-FR'
  utter.rate = 1.05
  utter.pitch = 0.95
  window.speechSynthesis.speak(utter)
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
}): string {
  if (opts.isRest) {
    return `Repos. ${opts.restSec ?? 30} secondes.`
  }
  const parts = [opts.name]
  if (opts.side === 'L') parts.push('côté gauche')
  if (opts.side === 'R') parts.push('côté droit')
  if (opts.reps) parts.push(`${opts.reps} reps`)
  if (opts.durationSec) parts.push(`${opts.durationSec} secondes`)
  if (opts.loadKg) parts.push(`${opts.loadKg} kilos`)
  if (opts.vestKg) parts.push(`gilet ${opts.vestKg}`)
  return parts.join('. ')
}

type VoiceHandler = (cmd: 'next' | 'done' | 'drop') => void

export function startVoiceListen(onCommand: VoiceHandler): () => void {
  const SR =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

  if (!SR) {
    return () => undefined
  }

  const rec = new SR()
  rec.lang = 'fr-FR'
  rec.continuous = true
  rec.interimResults = false

  rec.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1]
    if (!last?.[0]) return
    const transcript = last[0].transcript.toLowerCase().trim()
    if (/(next|suivant|suivant[e]?|avancer|go)/.test(transcript)) onCommand('next')
    else if (/(fait|done|ok|terminé|valide)/.test(transcript)) onCommand('done')
    else if (/(drop|trop dur|allège|panic)/.test(transcript)) onCommand('drop')
  }

  rec.onerror = () => {
    try {
      rec.stop()
      setTimeout(() => rec.start(), 600)
    } catch {
      /* ignore */
    }
  }

  rec.onend = () => {
    try {
      rec.start()
    } catch {
      /* ignore */
    }
  }

  try {
    rec.start()
  } catch {
    /* ignore */
  }

  return () => {
    rec.onend = null
    rec.onerror = null
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
  }
}
