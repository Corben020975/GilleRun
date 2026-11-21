import { useState } from 'react'
import type { Block } from '../types/session'

export type BlockPatch = Pick<Block, 'name' | 'reps' | 'durationSec' | 'loadKg' | 'vestKg'>

/** Champ numérique vide = pas de valeur */
function num(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

/** Modifier un exercice : nom, reps (ou durée), charge, gilet */
export function EditBlockPanel({
  block,
  showApplyNext,
  onSave,
  onCancel,
}: {
  block: Block
  /** Proposer « appliquer aux tours suivants » (pendant la séance) */
  showApplyNext: boolean
  onSave: (patch: BlockPatch, applyNext: boolean) => void
  onCancel: () => void
}) {
  const timed = block.durationSec != null && block.reps == null
  const [name, setName] = useState(block.name)
  const [amount, setAmount] = useState(String((timed ? block.durationSec : block.reps) ?? ''))
  const [load, setLoad] = useState(block.loadKg != null ? String(block.loadKg) : '')
  const [vest, setVest] = useState(block.vestKg != null ? String(block.vestKg) : '')
  const [applyNext, setApplyNext] = useState(true)

  function save() {
    onSave(
      {
        name: name.trim() || block.name,
        reps: timed ? undefined : num(amount),
        durationSec: timed ? num(amount) : block.durationSec,
        loadKg: num(load),
        vestKg: block.vestKg != null || vest.trim() ? num(vest) : undefined,
      },
      applyNext,
    )
  }

  return (
    <div className="panel edit-panel">
      <p className="section-label" style={{ marginTop: 0 }}>
        Modifier l’exercice
      </p>
      <label className="field">
        <span>Exercice</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>{timed ? 'Durée (s)' : 'Reps'}</span>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="field">
          <span>Charge (kg)</span>
          <input inputMode="decimal" value={load} placeholder="—" onChange={(e) => setLoad(e.target.value)} />
        </label>
        <label className="field">
          <span>Gilet (kg)</span>
          <input inputMode="decimal" value={vest} placeholder="—" onChange={(e) => setVest(e.target.value)} />
        </label>
      </div>
      {showApplyNext && (
        <label className="check">
          <input type="checkbox" checked={applyNext} onChange={(e) => setApplyNext(e.target.checked)} />
          Appliquer aussi aux tours suivants
        </label>
      )}
      <div className="actions-row" style={{ marginBottom: 0 }}>
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          Valider
        </button>
      </div>
    </div>
  )
}
