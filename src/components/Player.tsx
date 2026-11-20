import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlockLog, GhostSplit, Session } from '../types/session'
import { formatDelta, formatMs } from '../lib/format'
import { cueForBlock, speak, startVoiceListen } from '../lib/speech'
import { MusicDock } from './MusicDock'

type Phase = 'work' | 'rest'

export function Player({
  session,
  ghost,
  onAbort,
  onFinish,
}: {
  session: Session
  ghost: GhostSplit | null
  onAbort: () => void
  onFinish: (payload: {
    totalMs: number
    blockLogs: BlockLog[]
    blockDurationsMs: number[]
  }) => void
}) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('work')
  const [running, setRunning] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [blockElapsedMs, setBlockElapsedMs] = useState(0)
  const [restLeftMs, setRestLeftMs] = useState(0)
  const [voiceOn, setVoiceOn] = useState(false)
  const [blockLogs, setBlockLogs] = useState<BlockLog[]>([])
  const [blockDurationsMs, setBlockDurationsMs] = useState<number[]>([])

  const blockStartRef = useRef(performance.now())
  const sessionStartRef = useRef(performance.now())
  const lastTickRef = useRef(performance.now())

  const block = session.blocks[index]
  const done = index >= session.blocks.length

  const ghostBlockMs = ghost?.blockDurationsMs[index]
  const ghostDelta =
    ghostBlockMs != null && phase === 'work' ? blockElapsedMs - ghostBlockMs : null

  const progress = useMemo(() => {
    if (session.blocks.length === 0) return 0
    return Math.min(100, (index / session.blocks.length) * 100)
  }, [index, session.blocks.length])

  useEffect(() => {
    if (!block || done) return
    blockStartRef.current = performance.now()
    setBlockElapsedMs(0)
    setPhase('work')
    if (voiceOn) {
      speak(
        cueForBlock({
          name: block.name,
          side: block.side,
          reps: block.reps,
          durationSec: block.durationSec,
          loadKg: block.loadKg,
          vestKg: block.vestKg,
        }),
      )
    }
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running || done) return
    let raf = 0
    const loop = () => {
      const now = performance.now()
      const dt = now - lastTickRef.current
      lastTickRef.current = now
      setElapsedMs(now - sessionStartRef.current)

      if (phase === 'work') {
        setBlockElapsedMs(now - blockStartRef.current)
        if (block?.durationSec) {
          const left = block.durationSec * 1000 - (now - blockStartRef.current)
          if (left <= 0) {
            completeWork(false)
            return
          }
        }
      } else {
        setRestLeftMs((prev) => {
          const next = prev - dt
          if (next <= 0) {
            advanceAfterRest()
            return 0
          }
          return next
        })
      }
      raf = requestAnimationFrame(loop)
    }
    lastTickRef.current = performance.now()
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, phase, done, index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!voiceOn) return
    const stop = startVoiceListen((cmd) => {
      if (cmd === 'next' || cmd === 'done') completeWork(false)
      if (cmd === 'drop') completeWork(true)
    })
    return stop
  }, [voiceOn, index, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function completeWork(dropped: boolean) {
    if (!block || phase !== 'work') return
    const durationMs = performance.now() - blockStartRef.current
    const log: BlockLog = {
      blockId: block.id,
      completedAt: Date.now(),
      durationMs,
      dropped,
    }
    const nextLogs = [...blockLogs, log]
    const nextDurations = [...blockDurationsMs, durationMs]
    setBlockLogs(nextLogs)
    setBlockDurationsMs(nextDurations)

    const rest = block.restSec ?? 0
    if (rest > 0) {
      setPhase('rest')
      setRestLeftMs(rest * 1000)
      if (voiceOn) speak(cueForBlock({ name: 'Repos', isRest: true, restSec: rest }))
    } else {
      goNext(nextLogs, nextDurations)
    }
  }

  function advanceAfterRest() {
    goNext(blockLogs, blockDurationsMs)
  }

  function goNext(logs: BlockLog[], durations: number[]) {
    const nextIndex = index + 1
    if (nextIndex >= session.blocks.length) {
      setRunning(false)
      onFinish({
        totalMs: performance.now() - sessionStartRef.current,
        blockLogs: logs,
        blockDurationsMs: durations,
      })
      return
    }
    setIndex(nextIndex)
    setPhase('work')
  }

  if (done || !block) {
    return null
  }

  const specs = [
    block.reps != null ? `${block.reps} reps` : null,
    block.durationSec != null ? `${block.durationSec}s` : null,
    block.side === 'L' ? 'Gauche' : block.side === 'R' ? 'Droite' : null,
    block.loadKg != null ? `${block.loadKg} kg` : null,
    block.vestKg != null ? `Gilet ${block.vestKg} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const clockDisplay =
    phase === 'rest'
      ? formatMs(restLeftMs)
      : block.durationSec
        ? formatMs(Math.max(0, block.durationSec * 1000 - blockElapsedMs))
        : formatMs(blockElapsedMs)

  return (
    <div className="player">
      <div className="player-header">
        <button type="button" className="btn btn-ghost" onClick={onAbort}>
          ← Quitter
        </button>
        <span className="modality-pill">{session.modality}</span>
      </div>

      <div className="timer-hero">
        <div className="phase-label">{phase === 'rest' ? 'Repos' : 'Work'}</div>
        <h2 className="block-name">{phase === 'rest' ? 'Repos' : block.name}</h2>
        <div className="block-specs">
          {phase === 'rest' ? `${block.restSec}s` : specs || '—'}
        </div>
        <p className="clock">{clockDisplay}</p>
        <div className="ghost-row">
          <span>
            Séance <strong>{formatMs(elapsedMs)}</strong>
          </span>
          {ghost && ghostBlockMs != null && phase === 'work' && (
            <span>
              Ghost <strong>{formatMs(ghostBlockMs)}</strong>{' '}
              {ghostDelta != null && (
                <span className={ghostDelta <= 0 ? 'delta-ahead' : 'delta-behind'}>
                  ({formatDelta(ghostDelta)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="controls">
        <button
          type="button"
          className="btn"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (phase === 'rest') goNext(blockLogs, blockDurationsMs)
            else completeWork(false)
          }}
        >
          {phase === 'rest' ? 'Skip repos' : 'Fait / Next'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={phase === 'rest'}
          onClick={() => completeWork(true)}
        >
          Trop dur
        </button>
      </div>

      <div className="voice-toggle">
        <div>
          <div>Voice next</div>
          <div className="hint">Dis « suivant », « fait » ou « trop dur »</div>
        </div>
        <button
          type="button"
          className={`toggle ${voiceOn ? 'on' : ''}`}
          aria-pressed={voiceOn}
          onClick={() => setVoiceOn((v) => !v)}
        >
          <span />
        </button>
      </div>

      <MusicDock session={session} />

      <p className="section-label">Blocs</p>
      <div className="upcoming">
        {session.blocks.map((b, i) => (
          <div
            key={b.id}
            className={`upcoming-item ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`}
          >
            <span>
              {b.name}
              {b.side === 'L' ? ' · G' : b.side === 'R' ? ' · D' : ''}
            </span>
            <span>
              {b.reps ? `${b.reps}r` : b.durationSec ? `${b.durationSec}s` : '—'}
              {ghost?.blockDurationsMs[i] != null ? ` · g ${formatMs(ghost.blockDurationsMs[i]!)}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
