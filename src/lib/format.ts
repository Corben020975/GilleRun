export function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDelta(ms: number): string {
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : ''
  const abs = Math.abs(ms)
  return `${sign}${formatMs(abs)}`
}

export function modalityLabel(m: string): string {
  return m
}
