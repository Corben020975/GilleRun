/**
 * Bips Web Audio (sans fichier) — audibles même voix coupée.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

async function tone(freq: number, durationMs: number, gain = 0.08, type: OscillatorType = 'sine') {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') await ac.resume()
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ac.destination)
  const now = ac.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
  osc.start(now)
  osc.stop(now + durationMs / 1000 + 0.02)
}

/** Bip distinct au début d'un bloc */
export async function beepBlockStart() {
  await tone(660, 90, 0.1, 'triangle')
}

/** Countdown 3-2-1 */
export async function beepCountdown(n: 3 | 2 | 1) {
  const freq = n === 1 ? 880 : 520
  await tone(freq, n === 1 ? 140 : 80, 0.12, 'square')
}

export async function resumeAudio() {
  const ac = getCtx()
  if (ac?.state === 'suspended') await ac.resume()
}
