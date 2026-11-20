/**
 * Horloge de séance pure (pas de React).
 * Les pauses décale les ancres : le temps Ghost / logs n'inclut jamais les pauses.
 */

export type ClockPhase = 'work' | 'rest'

export interface SessionClock {
  index: number
  phase: ClockPhase
  /** true = chronos tournent */
  running: boolean
  /** performance.now() (ou équivalent) au début de séance, décalé à chaque reprise */
  sessionStartedAt: number
  /** début du bloc work courant (idem, décalé) */
  blockStartedAt: number
  /** fin absolue du repos ; null hors repos */
  restEndsAt: number | null
  /** instant de pause ; null si non en pause */
  pausedAt: number | null
  /** durée totale passée en pause (info / debug) */
  accumulatedPauseMs: number
  /** pour EMOM : début de la minute courante */
  emomSlotStartedAt: number | null
  /** pour AMRAP : tours complétés */
  amrapRounds: number
}

export function createClock(now: number, startIndex = 0): SessionClock {
  return {
    index: startIndex,
    phase: 'work',
    running: true,
    sessionStartedAt: now,
    blockStartedAt: now,
    restEndsAt: null,
    pausedAt: null,
    accumulatedPauseMs: 0,
    emomSlotStartedAt: now,
    amrapRounds: 0,
  }
}

/** Instant « actif » : gelé si en pause. */
export function activeNow(clock: SessionClock, now: number): number {
  return clock.pausedAt ?? now
}

export function sessionElapsedMs(clock: SessionClock, now: number): number {
  return Math.max(0, activeNow(clock, now) - clock.sessionStartedAt)
}

export function blockElapsedMs(clock: SessionClock, now: number): number {
  if (clock.phase !== 'work') return 0
  return Math.max(0, activeNow(clock, now) - clock.blockStartedAt)
}

/** Temps restant sur un bloc chronométré (durationSec). */
export function workRemainingMs(
  clock: SessionClock,
  now: number,
  durationSec: number | undefined,
): number | null {
  if (durationSec == null || clock.phase !== 'work') return null
  const left = durationSec * 1000 - blockElapsedMs(clock, now)
  return Math.max(0, left)
}

export function restRemainingMs(clock: SessionClock, now: number): number {
  if (clock.phase !== 'rest' || clock.restEndsAt == null) return 0
  return Math.max(0, clock.restEndsAt - activeNow(clock, now))
}

/**
 * Pause : gèle tous les chronos. Ne touche pas aux ancres tant que non repris.
 */
export function pauseClock(clock: SessionClock, now: number): SessionClock {
  if (clock.pausedAt != null || !clock.running) return clock
  return { ...clock, running: false, pausedAt: now }
}

/**
 * Reprise : décale session/bloc/repos/emom du temps passé en pause
 * pour qu'un durationSec ne se termine pas d'un coup à la reprise.
 */
export function resumeClock(clock: SessionClock, now: number): SessionClock {
  if (clock.pausedAt == null) return { ...clock, running: true }
  const pauseMs = Math.max(0, now - clock.pausedAt)
  return {
    ...clock,
    running: true,
    pausedAt: null,
    accumulatedPauseMs: clock.accumulatedPauseMs + pauseMs,
    sessionStartedAt: clock.sessionStartedAt + pauseMs,
    blockStartedAt: clock.blockStartedAt + pauseMs,
    restEndsAt: clock.restEndsAt != null ? clock.restEndsAt + pauseMs : null,
    emomSlotStartedAt:
      clock.emomSlotStartedAt != null ? clock.emomSlotStartedAt + pauseMs : null,
  }
}

export function startWork(clock: SessionClock, now: number, index: number): SessionClock {
  return {
    ...clock,
    index,
    phase: 'work',
    blockStartedAt: activeNow(clock, now),
    restEndsAt: null,
    emomSlotStartedAt: activeNow(clock, now),
  }
}

export function startRest(clock: SessionClock, now: number, restSec: number): SessionClock {
  const t = activeNow(clock, now)
  return {
    ...clock,
    phase: 'rest',
    restEndsAt: t + Math.max(0, restSec) * 1000,
  }
}

export function bumpAmrapRound(clock: SessionClock): SessionClock {
  return { ...clock, amrapRounds: clock.amrapRounds + 1 }
}

/** Snapshot sérialisable pour localStorage (timestamps relatifs à une base). */
export interface PersistedPlayerState {
  sessionId: string
  index: number
  phase: ClockPhase
  running: boolean
  /** ms écoulées de séance (hors pause) au moment de la sauvegarde */
  sessionElapsedMs: number
  /** ms écoulées du bloc work courant */
  blockElapsedMs: number
  /** ms restantes de repos */
  restRemainingMs: number
  accumulatedPauseMs: number
  amrapRounds: number
  blockLogs: unknown[]
  blockDurationsMs: number[]
  savedAt: string
}

export function toPersisted(
  clock: SessionClock,
  now: number,
  sessionId: string,
  extras: {
    blockLogs: unknown[]
    blockDurationsMs: number[]
  },
): PersistedPlayerState {
  return {
    sessionId,
    index: clock.index,
    phase: clock.phase,
    running: clock.running && clock.pausedAt == null,
    sessionElapsedMs: sessionElapsedMs(clock, now),
    blockElapsedMs: blockElapsedMs(clock, now),
    restRemainingMs: restRemainingMs(clock, now),
    accumulatedPauseMs: clock.accumulatedPauseMs,
    amrapRounds: clock.amrapRounds,
    blockLogs: extras.blockLogs,
    blockDurationsMs: extras.blockDurationsMs,
    savedAt: new Date().toISOString(),
  }
}

/** Reconstruit une horloge à partir d'un snapshot + maintenant. */
export function fromPersisted(p: PersistedPlayerState, now: number): SessionClock {
  const clock: SessionClock = {
    index: p.index,
    phase: p.phase,
    running: true,
    sessionStartedAt: now - p.sessionElapsedMs,
    blockStartedAt: now - p.blockElapsedMs,
    restEndsAt: p.phase === 'rest' ? now + p.restRemainingMs : null,
    pausedAt: null,
    accumulatedPauseMs: p.accumulatedPauseMs,
    emomSlotStartedAt: now,
    amrapRounds: p.amrapRounds,
  }
  // On reprend en pause pour que l'utilisateur valide avant de relancer
  return pauseClock(clock, now)
}
