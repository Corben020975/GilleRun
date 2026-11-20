# Arena 51

**Coach 51 envoie. Arena exécute.**

Session player pour KB / PDC / gilet / cross — le bras droit du Grok bot Coach 51.

## Plus-value

| Coach 51 (bot) | Arena 51 (app) |
|---|---|
| Génère la séance | Transcrit → timer |
| Plan / revue | Exécution terrain |
| Mémoire profil | Ghost + log |

## MVP

1. **Inbox** — séances reçues (demos KB / PDC / gilet / cross)
2. **Handoff** — colle le JSON Coach 51 → player
3. **Player** — blocs, repos, côtés KB, charge gilet
4. **Ghost** — toi vs ta dernière même séance
5. **Voice next** — « suivant », « fait », « trop dur »
6. **YouTube Music** — playlist embarquée
7. **Afterglow** — stamp + export log → Coach 51

## Stack

- Vite + React + TypeScript
- LocalStorage (inbox, ghosts, logs)
- Web Speech API (TTS + recognition)

## Contrat bot → app

```json
{
  "id": "coach_live_1",
  "title": "EMOM KB 20'",
  "modality": "KB",
  "durationMin": 22,
  "music": {
    "playlistId": "PLxxxx",
    "playlistUrl": "https://music.youtube.com/playlist?list=PLxxxx",
    "label": "Engine Mix"
  },
  "blocks": [
    { "name": "Swing", "reps": 12, "loadKg": 32, "side": "both", "restSec": 0 }
  ]
}
```

`modality`: `KB` | `PDC` | `Gilet` | `Cross` | `DB` | `Hyrox`  
`side`: `L` | `R` | `both`

## Lancer

```bash
npm install
npm run dev
```

Build :

```bash
npm run build
npm run preview
```

## Design

Thème sombre graphite + ember (`#e8923a`). Typo Bebas Neue / Outfit.  
Vignette widget : `public/icon.jpg`.

## Note YouTube Music

L’embed utilise l’iframe YouTube (playlist). « Ouvrir » lance YouTube Music natif quand dispo.

## Repo

Actuellement hébergé sur `Corben020975/GilleRun` (repo vide réutilisé).  
Renomme-le en **arena-51** dans GitHub → Settings → General → Repository name.
