import type { Block, Session, StructureSegment } from '../types/session'

/** Texte lisible pour un exercice : « Swing — 10 reps · 23 kg · repos 30 s » */
export function blockLine(b: Omit<Block, 'id'>): string {
  const bits = [
    b.reps != null ? `${b.reps} reps` : b.durationSec != null ? `${b.durationSec} s` : null,
    b.side === 'L' ? 'gauche' : b.side === 'R' ? 'droite' : null,
    b.loadKg != null ? `${b.loadKg} kg` : null,
    b.vestKg != null ? `gilet ${b.vestKg} kg` : null,
    b.restSec ? `repos ${b.restSec} s` : null,
  ].filter(Boolean)
  return bits.length ? `${b.name} — ${bits.join(' · ')}` : b.name
}

function segmentTitle(seg: StructureSegment): string {
  switch (seg.kind) {
    case 'rounds':
      if (seg.rounds <= 1) return 'Enchaînement'
      return `${seg.rounds} tour${seg.rounds > 1 ? 's' : ''}${
        seg.restBetweenRoundsSec ? ` · repos ${seg.restBetweenRoundsSec} s entre les tours` : ''
      }`
    case 'emom':
      return `EMOM ${seg.minutes} min — un exercice au début de chaque minute`
    case 'amrap':
      return `AMRAP ${seg.minutes} min — un maximum de tours`
    case 'tabata':
      return `Tabata ${seg.rounds} × ${seg.workSec} s effort / ${seg.restSec} s repos`
  }
}

/** Aperçu par parties, pour l'écran avant de démarrer */
export function previewSections(s: Session): { title: string; items: { text: string; name: string }[] }[] {
  const items = (bs: Omit<Block, 'id'>[]) => bs.map((b) => ({ text: blockLine(b), name: b.name }))
  if (s.structure?.length) {
    return s.structure.map((seg) => ({ title: segmentTitle(seg), items: items(seg.blocks) }))
  }
  return [{ title: 'Déroulé', items: items(s.blocks) }]
}

/** Résumé court pour la liste : « 4 tours × 6 exos » */
export function shortSummary(s: Session): string {
  if (s.structure?.length) {
    return s.structure
      .map((seg) => {
        if (seg.kind === 'rounds')
          return seg.rounds > 1 ? `${seg.rounds} tours × ${seg.blocks.length} exos` : `${seg.blocks.length} exos`
        if (seg.kind === 'emom') return `EMOM ${seg.minutes}'`
        if (seg.kind === 'amrap') return `AMRAP ${seg.minutes}'`
        return `Tabata ${seg.rounds}×${seg.workSec}/${seg.restSec}`
      })
      .join(' + ')
  }
  const names = new Set(s.blocks.map((b) => b.name))
  return `${names.size} exercice${names.size > 1 ? 's' : ''}`
}
