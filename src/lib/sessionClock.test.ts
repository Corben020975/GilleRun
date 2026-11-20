import { describe, expect, it } from 'vitest'
import {
  blockElapsedMs,
  createClock,
  fromPersisted,
  pauseClock,
  restRemainingMs,
  resumeClock,
  sessionElapsedMs,
  startRest,
  startWork,
  toPersisted,
  workRemainingMs,
} from './sessionClock'

describe('sessionClock', () => {
  it('avance le temps de séance et de bloc', () => {
    let c = createClock(1000)
    expect(sessionElapsedMs(c, 1000)).toBe(0)
    expect(blockElapsedMs(c, 3500)).toBe(2500)
    expect(sessionElapsedMs(c, 3500)).toBe(2500)
  })

  it('pause gèle tous les chronos et reprise décale les ancres', () => {
    let c = createClock(0)
    // 5 s de work
    c = pauseClock(c, 5000)
    expect(sessionElapsedMs(c, 5000)).toBe(5000)
    expect(blockElapsedMs(c, 5000)).toBe(5000)
    // 10 s de pause murale — le temps actif ne bouge pas
    expect(sessionElapsedMs(c, 15000)).toBe(5000)
    expect(blockElapsedMs(c, 15000)).toBe(5000)
    // reprise
    c = resumeClock(c, 15000)
    expect(sessionElapsedMs(c, 15000)).toBe(5000)
    expect(blockElapsedMs(c, 15000)).toBe(5000)
    // encore 2 s de work
    expect(sessionElapsedMs(c, 17000)).toBe(7000)
    expect(blockElapsedMs(c, 17000)).toBe(7000)
  })

  it('un bloc durationSec ne se termine pas à la reprise', () => {
    let c = createClock(0)
    // duration 10 s, on pause à 8 s
    expect(workRemainingMs(c, 8000, 10)).toBe(2000)
    c = pauseClock(c, 8000)
    // 5 s plus tard toujours 2 s restantes
    expect(workRemainingMs(c, 13000, 10)).toBe(2000)
    c = resumeClock(c, 13000)
    expect(workRemainingMs(c, 13000, 10)).toBe(2000)
    expect(workRemainingMs(c, 14000, 10)).toBe(1000)
  })

  it('repos basé sur restEndsAt, pas un cumul de dt', () => {
    let c = createClock(0)
    c = startRest(c, 1000, 30) // fin à 31000
    expect(restRemainingMs(c, 1000)).toBe(30000)
    expect(restRemainingMs(c, 11000)).toBe(20000)
    c = pauseClock(c, 11000)
    expect(restRemainingMs(c, 20000)).toBe(20000)
    c = resumeClock(c, 20000)
    // restEndsAt a été décalé de 9 s → toujours 20 s
    expect(restRemainingMs(c, 20000)).toBe(20000)
    expect(restRemainingMs(c, 40000)).toBe(0)
  })

  it('startWork réinitialise le chrono de bloc', () => {
    let c = createClock(0)
    c = startWork(c, 5000, 2)
    expect(c.index).toBe(2)
    expect(blockElapsedMs(c, 5000)).toBe(0)
    expect(blockElapsedMs(c, 7000)).toBe(2000)
  })

  it('persistance / reprise conserve les temps hors pause', () => {
    let c = createClock(0)
    c = startRest(c, 4000, 10)
    const snap = toPersisted(c, 6000, 's1', { blockLogs: [], blockDurationsMs: [4000] })
    expect(snap.sessionElapsedMs).toBe(6000)
    expect(snap.restRemainingMs).toBe(8000)
    const restored = fromPersisted(snap, 100_000)
    // fromPersisted reprend en pause
    expect(restored.pausedAt).toBe(100_000)
    expect(sessionElapsedMs(restored, 100_000)).toBe(6000)
    expect(restRemainingMs(restored, 100_000)).toBe(8000)
    const live = resumeClock(restored, 100_000)
    expect(sessionElapsedMs(live, 101_000)).toBe(7000)
  })
})
