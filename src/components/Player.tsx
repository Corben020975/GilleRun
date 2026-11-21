import { KeepAwake } from '@capacitor-community/keep-awake'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useEffect, useRef, useState } from 'react'
import type { Block, BlockLog, DropKind, GhostSplit, Session } from '../types/session'
import { effectiveBlock } from '../lib/adjust'
import { previewSections, shortSummary } from '../lib/describe'
import { beepBlockStart, beepCountdown, resumeAudio } from '../lib/beeps'
import { formatDelta, formatMs } from '../lib/format'
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
  type PersistedPlayerState,
  type SessionClock,
} from '../lib/sessionClock'
import {
  cueForBlock,
  speak,
  startVoiceListen,
  stopSpeaking,
  type VoiceCommand,
  type VoiceListenHandle,
} from '../lib/speech'
import { clearActivePlayer, saveActivePlayer } from '../lib/storage'

type Stage = 'ready' | 'countdown' | 'play'

function blockSpecs(b: Block): string {
  return [
    b.reps != null ? `${b.reps} reps` : null,
    b.durationSec != null ? `${b.durationSec}s` : null,
    b.side === 'L' ? 'Gauche' : b.side === 'R' ? 'Droite' : null,
    b.loadKg != null ? `${b.loadKg} kg` : null,
    b.vestKg != null ? `Gilet ${b.vestKg}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function nextPreview(session: Session, index: number, logs: BlockLog[]): string {
  const n = effectiveBlock(session.blocks, index + 1, logs)
  if (!n) return 'fin'
  return [n.name, blockSpecs(n)].filter(Boolean).join(' · ')
}

export function Player({
  session,
  ghost,
  lastGhost,
  resumeState,
  onAbort,
  onFinish,
}: {
  session: Session
  ghost: GhostSplit | null
  lastGhost?: GhostSplit | null
  resumeState?: PersistedPlayerState
  onAbort: () => void
  onFinish: (payload: {
    totalMs: number
    blockLogs: BlockLog[]
    blockDurationsMs: number[]
    amrapRounds?: number
  }) => void
}) {
  const [stage, setStage] = useState<Stage>('ready')
  const [countdown, setCountdown] = useState(5)
  const [clock, setClock] = useState<SessionClock>(() => {
    if (resumeState) return fromPersisted(resumeState, performance.now())
    return createClock(performance.now())
  })
  const [now, setNow] = useState(() => performance.now())
  const [voiceOn, setVoiceOn] = useState(false)
  const [beepsOn, setBeepsOn] = useState(true)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [blockLogs, setBlockLogs] = useState<BlockLog[]>(
    () => (resumeState?.blockLogs as BlockLog[]) ?? [],
  )
  const [blockDurationsMs, setBlockDurationsMs] = useState<number[]>(
    () => resumeState?.blockDurationsMs ?? [],
  )
  const [dropOpen, setDropOpen] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [restAnnounced, setRestAnnounced] = useState(false)

  const voiceRef = useRef<VoiceListenHandle | null>(null)
  const lastCmdAt = useRef(0)
  const beepedRef = useRef<Set<string>>(new Set())
  const clockRef = useRef(clock)
  const logsRef = useRef(blockLogs)
  const dursRef = useRef(blockDurationsMs)

  useEffect(() => {
    clockRef.current = clock
  }, [clock])
  useEffect(() => {
    logsRef.current = blockLogs
  }, [blockLogs])
  useEffect(() => {
    dursRef.current = blockDurationsMs
  }, [blockDurationsMs])

  // Bloc courant avec les allègements « Trop dur » déjà appliqués
  const block = effectiveBlock(session.blocks, clock.index, blockLogs)
  const totalSteps = session.blocks.length

  // Keep-awake pendant le player actif
  useEffect(() => {
    if (stage !== 'play') return
    void KeepAwake.keepAwake().catch(() => undefined)
    return () => {
      void KeepAwake.allowSleep().catch(() => undefined)
    }
  }, [stage])

  // Tick d'affichage
  useEffect(() => {
    if (stage !== 'play') return
    let raf = 0
    const loop = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [stage])

  // Fin de repos / durationSec
  useEffect(() => {
    if (stage !== 'play' || !clock.running || clock.pausedAt) return
    const t = performance.now()
    if (clock.phase === 'rest' && restRemainingMs(clock, t) <= 0) {
      advanceToNext(logsRef.current, dursRef.current)
      return
    }
    if (clock.phase === 'work' && block?.durationSec) {
      const left = workRemainingMs(clock, t, block.durationSec)
      if (left === 0) completeWork(false)
    }
  }, [now, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bips 3-2-1
  useEffect(() => {
    if (stage !== 'play' || !beepsOn || clock.pausedAt) return
    const t = performance.now()
    let leftMs = 0
    if (clock.phase === 'rest') leftMs = restRemainingMs(clock, t)
    else if (block?.durationSec) leftMs = workRemainingMs(clock, t, block.durationSec) ?? 0
    else return
    for (const sec of [3, 2, 1] as const) {
      const key = `${clock.index}-${clock.phase}-${sec}`
      if (leftMs <= sec * 1000 && leftMs > sec * 1000 - 200 && !beepedRef.current.has(key)) {
        beepedRef.current.add(key)
        void beepCountdown(sec)
      }
    }
  }, [now, beepsOn, stage, clock, block])

  // Annonce « ensuite » à 10 s du repos
  useEffect(() => {
    if (stage !== 'play' || clock.phase !== 'rest' || clock.pausedAt) return
    const left = restRemainingMs(clock, now)
    if (left <= 10000 && left > 9000 && !restAnnounced && voiceOn) {
      setRestAnnounced(true)
      void speak(`Ensuite : ${nextPreview(session, clock.index, blockLogs)}`)
    }
  }, [now, clock, voiceOn, restAnnounced, session, stage, blockLogs])

  // Persistance : à chaque changement d'état (pas à chaque image — avant, 60 écritures/s)
  // + filet de sécurité toutes les 5 s et quand l'app passe en arrière-plan
  useEffect(() => {
    if (stage !== 'play') return
    const save = () =>
      saveActivePlayer(
        toPersisted(clockRef.current, performance.now(), session.id, {
          blockLogs: logsRef.current,
          blockDurationsMs: dursRef.current,
        }),
      )
    save()
    const id = setInterval(save, 5000)
    const onHide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [clock, blockLogs, blockDurationsMs, session.id, stage])

  // Voix
  useEffect(() => {
    let cancelled = false
    async function run() {
      await voiceRef.current?.stop()
      voiceRef.current = null
      if (!voiceOn || stage !== 'play') {
        setVoiceStatus('')
        return
      }
      const handle = await startVoiceListen((cmd) => {
        const t = Date.now()
        if (t - lastCmdAt.current < 1000) return
        lastCmdAt.current = t
        handleVoice(cmd)
      }, setVoiceStatus)
      if (cancelled) {
        await handle.stop()
        return
      }
      voiceRef.current = handle
    }
    void run()
    return () => {
      cancelled = true
      void voiceRef.current?.stop()
    }
  }, [voiceOn, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Annonce si on active la voix en cours de bloc
  const prevVoice = useRef(false)
  useEffect(() => {
    if (voiceOn && !prevVoice.current && stage === 'play' && block) {
      void speak(
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
    prevVoice.current = voiceOn
  }, [voiceOn, stage, block])

  function handleVoice(cmd: VoiceCommand) {
    if (cmd === 'pause') {
      setClock((c) => pauseClock(c, performance.now()))
      return
    }
    if (cmd === 'resume') {
      setClock((c) => resumeClock(c, performance.now()))
      return
    }
    const c = clockRef.current
    if (c.phase === 'rest') {
      if (cmd === 'next' || cmd === 'done') advanceToNext(logsRef.current, dursRef.current)
      return
    }
    if (cmd === 'drop') setDropOpen(true)
    else completeWork(false)
  }

  async function startCountdown() {
    await resumeAudio()
    setStage('countdown')
    setCountdown(5)
  }

  useEffect(() => {
    if (stage !== 'countdown') return
    if (countdown <= 0) {
      const t = performance.now()
      // Si reprise : on reprend l'horloge en pause ; sinon fresh
      setClock((c) => {
        const base = resumeState && c.pausedAt ? resumeClock(c, t) : createClock(t, c.index)
        return base
      })
      setStage('play')
      beepedRef.current.clear()
      if (beepsOn) void beepBlockStart()
      void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)
      const b = effectiveBlock(session.blocks, clock.index, logsRef.current)
      if (b && voiceOn) {
        void speak(
          cueForBlock({
            name: b.name,
            side: b.side,
            reps: b.reps,
            durationSec: b.durationSec,
            loadKg: b.loadKg,
            vestKg: b.vestKg,
          }),
        )
      }
      return
    }
    if (beepsOn && countdown <= 3) void beepCountdown(countdown as 3 | 2 | 1)
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [stage, countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  function togglePause() {
    const t = performance.now()
    setClock((c) => (c.pausedAt ? resumeClock(c, t) : pauseClock(c, t)))
  }

  function completeWork(dropped: boolean, dropKind?: DropKind) {
    const c = clockRef.current
    const b = session.blocks[c.index]
    if (!b || c.phase !== 'work' || c.pausedAt) return
    const t = performance.now()
    const durationMs = blockElapsedMs(c, t)
    const log: BlockLog = {
      blockId: b.id,
      completedAt: Date.now(),
      durationMs,
      dropped: dropped || undefined,
      dropKind,
    }
    const nextLogs = [...logsRef.current, log]
    const nextDurs = [...dursRef.current, durationMs]
    setBlockLogs(nextLogs)
    setBlockDurationsMs(nextDurs)
    logsRef.current = nextLogs
    dursRef.current = nextDurs
    setDropOpen(false)

    // Temps de repos à appliquer après ce bloc
    let rest = b.restSec ?? 0
    // EMOM : « Fait » avant la fin de la minute = repos jusqu'au top suivant
    if (b.mode === 'emom' && b.durationSec) rest = Math.max(0, b.durationSec - durationMs / 1000)
    if (dropKind === 'skip') rest = 0

    if (rest > 0.3) {
      beepedRef.current.clear()
      const preview = nextPreview(session, c.index, nextLogs)
      // Repos court : « ensuite » annoncé dès le début, pas de 2e annonce à 10 s
      const short = rest <= 12
      setRestAnnounced(short)
      setClock((cl) => startRest(cl, t, rest))
      if (voiceOn) {
        void speak(
          cueForBlock({
            name: 'Repos',
            isRest: true,
            restSec: Math.round(rest),
            nextPreview: short ? preview : undefined,
          }),
        )
      }
    } else {
      advanceToNext(nextLogs, nextDurs)
    }
  }

  function advanceToNext(logs: BlockLog[], durs: number[]) {
    const t = performance.now()
    const next = clockRef.current.index + 1
    if (next >= session.blocks.length) {
      clearActivePlayer()
      void stopSpeaking()
      void KeepAwake.allowSleep().catch(() => undefined)
      onFinish({
        totalMs: sessionElapsedMs(clockRef.current, t),
        blockLogs: logs,
        blockDurationsMs: durs,
        amrapRounds: session.blocks.some((x) => x.mode === 'amrap')
          ? clockRef.current.amrapRounds
          : undefined,
      })
      return
    }
    beepedRef.current.clear()
    setClock((c) => startWork(c, t, next))
    if (beepsOn) void beepBlockStart()
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)
    const b = effectiveBlock(session.blocks, next, logs)
    if (b && voiceOn) {
      void speak(
        cueForBlock({
          name: b.name,
          side: b.side,
          reps: b.reps,
          durationSec: b.durationSec,
          loadKg: b.loadKg,
          vestKg: b.vestKg,
        }),
      )
    }
  }

  function requestQuit() {
    setConfirmQuit(true)
  }

  function confirmQuitYes() {
    // Persiste déjà via l'effet — on quitte
    void stopSpeaking()
    void KeepAwake.allowSleep().catch(() => undefined)
    onAbort()
  }

  // ——— RENDER : READY ———
  if (stage === 'ready') {
    return (
      <div className="player">
        <div className="player-header">
          <button type="button" className="btn btn-ghost" onClick={onAbort}>
            ← Séances
          </button>
          <span className="modality-pill">{session.modality}</span>
        </div>
        <h2 className="block-name" style={{ fontSize: '2.4rem' }}>
          {session.title}
        </h2>
        <p className="hint">
          ~{session.durationMin} min · {shortSummary(session)}
          {resumeState ? ' · reprise en cours' : ''}
          {ghost ? ` · record ${formatMs(ghost.totalMs)}` : ''}
          {lastGhost && lastGhost.finishedAt !== ghost?.finishedAt ? ` · dernière ${formatMs(lastGhost.totalMs)}` : ''}
        </p>
        {session.notes && <p className="session-note">{session.notes}</p>}

        {/* Aperçu complet : on sait ce qui attend avant de lancer */}
        <div className="preview">
          {previewSections(session).map((sec, i) => (
            <div key={i} className="preview-section">
              <p className="preview-title">{sec.title}</p>
              <ol>
                {sec.lines.map((l, j) => (
                  <li key={j}>{l}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-primary btn-block btn-xl" onClick={() => void startCountdown()}>
          {resumeState ? 'Reprendre la séance' : 'Démarrer'}
        </button>

        <div className="voice-toggle">
          <div>
            <div>Commandes vocales</div>
            <div className="hint">Dis « suivant », « fait », « trop dur » ou « pause »</div>
          </div>
          <button
            type="button"
            className={`toggle ${voiceOn ? 'on' : ''}`}
            onClick={() => setVoiceOn((v) => !v)}
          >
            <span />
          </button>
        </div>
        <div className="voice-toggle">
          <div>
            <div>Bips sonores</div>
            <div className="hint">3-2-1 avant chaque changement</div>
          </div>
          <button
            type="button"
            className={`toggle ${beepsOn ? 'on' : ''}`}
            onClick={() => setBeepsOn((v) => !v)}
          >
            <span />
          </button>
        </div>

      </div>
    )
  }

  // ——— COUNTDOWN ———
  if (stage === 'countdown') {
    return (
      <div className="timer-hero" style={{ marginTop: 48 }}>
        <div className="phase-label">Départ</div>
        <p className="clock">{countdown}</p>
        <p className="hint">Mets-toi en place.</p>
      </div>
    )
  }

  // ——— PLAY ———
  if (!block) return null

  const sessMs = sessionElapsedMs(clock, now)
  const blkMs = blockElapsedMs(clock, now)
  const restLeft = restRemainingMs(clock, now)
  const workLeft = workRemainingMs(clock, now, block.durationSec)
  const paused = clock.pausedAt != null

  const clockDisplay =
    clock.phase === 'rest'
      ? formatMs(restLeft)
      : workLeft != null
        ? formatMs(workLeft)
        : formatMs(blkMs)

  const ghostBlockMs = ghost?.blockDurationsMs[clock.index]
  const ghostDelta =
    ghostBlockMs != null && clock.phase === 'work' && !paused ? blkMs - ghostBlockMs : null

  // Progression : blocs faits + fraction du step courant (work ou rest)
  let progress = (clock.index / totalSteps) * 100
  if (clock.phase === 'work' && block.durationSec && workLeft != null) {
    progress += ((1 - workLeft / (block.durationSec * 1000)) / totalSteps) * 100
  } else if (clock.phase === 'rest' && block.restSec) {
    const restTotal = block.restSec * 1000
    progress += ((1 - restLeft / restTotal) / totalSteps) * 100 * 0.15
    // léger poids au repos pour que la barre avance aussi
  } else if (clock.phase === 'work') {
    progress += (0.5 / totalSteps) * 100
  }

  const isAmrap = block.mode === 'amrap'
  // Bloc en répétitions (pas chronométré) → affichage centré sur reps + charge
  const repsMode = block.reps != null && !block.durationSec && !isAmrap
  const loadText = [
    block.side === 'L' ? 'Gauche' : block.side === 'R' ? 'Droite' : null,
    block.loadKg != null ? `${block.loadKg} kg` : null,
    block.vestKg != null ? `gilet ${block.vestKg} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="player player-terrain">
      <div className="player-header">
        <button type="button" className="btn btn-ghost" onClick={requestQuit}>
          Quitter
        </button>
        <span className="modality-pill">{block.roundLabel ?? session.modality}</span>
      </div>

      <div className="timer-hero">
        <div className="phase-label">
          {paused ? 'Pause' : clock.phase === 'rest' ? 'Repos' : 'Effort'}
          {block.roundLabel ? ` · ${block.roundLabel}` : ''}
        </div>
        <h2 className="block-name">
          {clock.phase === 'rest' ? 'Repos' : block.name}
        </h2>
        {clock.phase === 'rest' ? (
          <>
            <div className="block-specs">
              Ensuite : <strong>{nextPreview(session, clock.index, blockLogs)}</strong>
            </div>
            <p className="clock">{clockDisplay}</p>
          </>
        ) : repsMode ? (
          <>
            {/* Exercice en reps : le nombre et la charge en grand, le chrono en petit */}
            <p className="big-reps">
              {block.reps}
              <span>reps</span>
            </p>
            {loadText && <p className="big-load">{loadText}</p>}
            <p className="clock-small">{clockDisplay}</p>
          </>
        ) : (
          <>
            <div className="block-specs">{blockSpecs(block) || '—'}</div>
            <p className="clock">{clockDisplay}</p>
          </>
        )}
        {clock.phase === 'work' && block.notes && <p className="hint">{block.notes}</p>}
        <div className="ghost-row">
          <span>
            Séance <strong>{formatMs(sessMs)}</strong>
          </span>
          {ghostBlockMs != null && clock.phase === 'work' && (
            <span>
              Record <strong>{formatMs(ghostBlockMs)}</strong>{' '}
              {ghostDelta != null && (
                <span className={ghostDelta <= 0 ? 'delta-ahead' : 'delta-behind'}>
                  ({formatDelta(ghostDelta)})
                </span>
              )}
            </span>
          )}
        </div>
        {isAmrap && (
          <p className="hint" style={{ marginTop: 8 }}>
            Tours faits : <strong>{clock.amrapRounds}</strong>
          </p>
        )}
        {clock.phase === 'work' && !isAmrap && (
          <p className="next-line">Ensuite : {nextPreview(session, clock.index, blockLogs)}</p>
        )}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>

      <div className="controls controls-xl">
        <button type="button" className="btn btn-xl" onClick={togglePause}>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
        {isAmrap ? (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={paused}
            onClick={() => setClock((c) => ({ ...c, amrapRounds: c.amrapRounds + 1 }))}
          >
            +1 tour
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={paused}
            onClick={() => {
              if (clock.phase === 'rest') advanceToNext(blockLogs, blockDurationsMs)
              else completeWork(false)
            }}
          >
            {clock.phase === 'rest' ? 'Passer le repos' : 'Fait'}
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger btn-xl"
          disabled={clock.phase === 'rest' || paused}
          onClick={() => setDropOpen(true)}
        >
          Trop dur
        </button>
      </div>

      {voiceOn && voiceStatus && <p className="hint">{voiceStatus}</p>}

      {dropOpen && (
        <div className="panel" style={{ marginTop: 12 }}>
          <p className="section-label">Trop dur — on allège la suite</p>
          <div className="actions-row" style={{ flexDirection: 'column' }}>
            <button type="button" className="btn btn-block" onClick={() => completeWork(true, 'reps')}>
              Moins de reps (−25 %)
            </button>
            <button type="button" className="btn btn-block" onClick={() => completeWork(true, 'load')}>
              Plus léger
            </button>
            <button type="button" className="btn btn-block btn-danger" onClick={() => completeWork(true, 'skip')}>
              Passer l’exercice
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setDropOpen(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div className="panel" style={{ marginTop: 12 }}>
          <p>Quitter ? Tu pourras reprendre la séance depuis la liste.</p>
          <div className="actions-row">
            <button type="button" className="btn" onClick={() => setConfirmQuit(false)}>
              Continuer
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmQuitYes}>
              Quitter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
