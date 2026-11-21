import { useState } from 'react'
import { DEFAULT_PROFILE, getSettings, saveSettings } from '../lib/settings'
import { notionPageId } from '../lib/notion'

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState(getSettings)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof typeof s>(k: K, v: (typeof s)[K]) {
    setS((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  function save() {
    // Nouvelle page Notion → on oublie l'ancienne base
    const pageChanged = s.notionPage !== getSettings().notionPage
    saveSettings({ ...s, notionDbId: pageChanged ? '' : s.notionDbId })
    setSaved(true)
  }

  const pageOk = !s.notionPage || notionPageId(s.notionPage) != null

  return (
    <div>
      <div className="player-header" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Séances
        </button>
      </div>
      <h1 className="screen-title">Réglages</h1>

      <p className="section-label">Claude — générer des séances</p>
      <div className="panel">
        <label className="field">
          <span>Clé API Claude</span>
          <input
            type="password"
            value={s.claudeKey}
            onChange={(e) => set('claudeKey', e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
          />
        </label>
        <p className="hint">À créer sur console.anthropic.com › API Keys. Chaque séance générée coûte quelques centimes.</p>
        <label className="field">
          <span>Ton profil (envoyé à Claude)</span>
          <textarea value={s.profile} onChange={(e) => set('profile', e.target.value)} rows={4} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => set('profile', DEFAULT_PROFILE)}>
          Profil par défaut
        </button>
      </div>

      <p className="section-label">Notion — historique</p>
      <div className="panel">
        <label className="field">
          <span>Jeton d’intégration Notion</span>
          <input
            type="password"
            value={s.notionToken}
            onChange={(e) => set('notionToken', e.target.value)}
            placeholder="ntn_…"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Lien de ta base Notion (ou d’une page)</span>
          <input
            value={s.notionPage}
            onChange={(e) => set('notionPage', e.target.value)}
            placeholder="https://www.notion.so/…"
          />
        </label>
        {!pageOk && <p className="error-text">Ce lien ne ressemble pas à un lien Notion.</p>}
        <ol className="hint steps">
          <li>notion.so/my-integrations › Nouvelle intégration › copie le jeton.</li>
          <li>Dans Notion, ouvre ta base de séances › ••• › Connexions › ajoute l’intégration.</li>
          <li>Colle ici le lien de la base. L’app y ajoute chaque séance terminée et Claude lit les dernières avant de générer.</li>
          <li>Pas encore de base ? Mets le lien d’une page : l’app y crée une base « Séances ».</li>
        </ol>
      </div>

      <button type="button" className="btn btn-primary btn-block btn-xl" onClick={save}>
        {saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
      <p className="hint">Les clés restent sur ce téléphone.</p>
    </div>
  )
}
