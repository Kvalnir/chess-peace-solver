# ♟ Chess Peace Solver

A mobile-first Progressive Web App (PWA) for solving [Chess Peace](https://chesspeace.app/) puzzles — place every chess piece so that none can capture another.

**Live app → [kvalnir.github.io/chess-peace-solver](https://kvalnir.github.io/chess-peace-solver/)**

---

## Features

- **All five puzzle modes** — Classic, Multiples, Two-Colour, Islands, Presets
- **Fits any window** — the whole UI always sizes to the viewport with no scrolling; the board grows to fill the space left over after the controls and rebalances on resize, orientation change, or when the result banner appears. If a screen is too small even at the minimum cell size, the page scrolls rather than clipping
- **Light & dark themes** — follows your OS appearance by default; tap the header icon to cycle 🌙 Dark → ☀️ Light → 🖥️ System. Your choice is remembered, and the PWA status-bar colour matches the active theme
- **Tap-to-place & drag-paint** — touch-optimised board interaction
- **Region outlines** — accessible squares get a teal boundary line wherever they meet a blocked square, so the playable area reads clearly at a glance
- **Non-square boards** — set columns and rows independently (4–6)
- **Smart staging tray** — auto-populated with one of each piece in Classic/Islands/Presets modes; stays in sync as you place and remove fixed pieces
- **Preset squares** — mark positions with a circle (○) in Presets mode; every marked square must be occupied in the solution, but pieces may be placed anywhere on the board
- **WebWorker solver** — runs off the main thread so the UI never freezes
- **Solve time display** — shows compute time in milliseconds
- **Offline capable** — works without an internet connection once installed
- **iOS PWA** — install via Safari → Share → Add to Home Screen

---

## How to Use

### Recommended workflow

1. **Set board size** — match your puzzle (Cols × Rows)
2. **Select mode** — choose the puzzle type
3. **Block tool is active by default** — tap squares to mark them blocked
4. **Switch to Preset tool** *(Presets mode only)* — mark squares where pieces must go
5. **Switch to Place tool** — fix any pieces at known positions
6. **Check the staging tray** — adjust counts if needed
7. **Tap Solve** — solution appears on the board in teal

### Board tools

| Tool | Action |
|---|---|
| **✦ Place** | Tap empty square to place selected piece · Tap piece again to remove |
| **█ Block** | Tap to mark a square inaccessible · Tap again to unblock |
| **○ Preset** | *(Presets mode only)* Tap to mark a position that must contain a piece · Tap again to unmark |
| **✕ Erase** | Tap anything to remove it |

**Drag-paint:** Hold and drag across squares to apply the same action to multiple squares at once.

### Puzzle modes

| Mode | Description |
|---|---|
| **Classic** | One of each piece type — tray auto-fills with all six |
| **Multiples** | Multiple copies of the same piece — add as many as needed |
| **Two-Colour** | White and black pieces coexist; only opposite colours threaten each other |
| **Islands** | Blocked squares divide the board; pieces only threaten within their island |
| **Presets** | Mark the squares where pieces must go (○), then stage the pieces — tray auto-fills with all six |

### Staging tray

The tray holds pieces for the solver to auto-place.

- **`+` mode** — tap a piece icon to queue one copy
- **`−` mode** — tap a piece icon to remove one copy
- In Classic / Islands / Presets modes, the tray starts with one of each piece and stays in sync with fixed pieces placed on the board
- Amber count = White pieces queued · Violet count = Black pieces queued *(Two-Colour mode)*

### Reset

Clears the board and restores defaults — tool resets to **Block**, staging tray repopulates for relevant modes.

---

## Colour System

| Colour | Meaning |
|---|---|
| 🟡 Amber | White piece / White player — whether placed by you or by the solver |
| 🟣 Violet | Black piece / Black player — whether placed by you or by the solver |
| 🩵 Teal | Preset markers (○) and accessible-region outlines |

---

## Project Structure

```
chess-peace-solver/
├── .github/workflows/deploy.yml   # GitHub Actions — auto build & deploy
├── public/
│   ├── icons/                     # PWA icons (192px, 512px, apple-touch)
│   └── generate-icons.html        # Open in browser to generate PNG icons
├── src/
│   ├── solver/
│   │   ├── engine.js              # Core backtracking solver (ported from Python)
│   │   └── worker.js              # WebWorker wrapper
│   ├── components/
│   │   ├── Board.jsx              # Interactive grid with drag-paint
│   │   ├── Controls.jsx           # Tool bar + piece bar
│   │   ├── StagingTray.jsx        # Piece queue for the solver
│   │   └── ModeSelector.jsx       # Mode tabs
│   ├── App.jsx                    # Root component & state
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Light + dark themes (light-dark() tokens)
├── index.html                     # iOS PWA meta tags
├── vite.config.js                 # Vite + PWA plugin config
└── package.json
```

---

## Tech Stack

| | |
|---|---|
| Framework | React 18 |
| Bundler | Vite 5 |
| PWA | vite-plugin-pwa (Workbox) |
| Styling | Plain CSS custom properties |
| Solver | Pure JS backtracking, runs in a WebWorker |
| Hosting | GitHub Pages (free) |
| Bundle size | ~52 KB gzipped |

---

## Local Development

Requires [Node.js](https://nodejs.org/) 18 or newer (CI builds on Node 24).

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server with hot reload
npm run build    # produce the production bundle in dist/
npm run preview  # serve the built bundle locally to verify it
```

---

## Deploying Changes

This repo uses GitHub Actions (`.github/workflows/deploy.yml`). Every push to `main` automatically triggers a rebuild and redeploy — no local tools needed.

To update the live app:
1. Commit a change to `main` (edit locally and push, or edit a file directly on GitHub via the pencil icon)
2. Wait ~60 seconds for the Actions workflow to build and deploy
3. The live URL updates automatically

---

## Solver Algorithm

The engine is a direct JavaScript port of the original Python notebook:

- **Backtracking search** with early constraint pruning
- **Heuristic ordering** — heavier pieces placed first (Q → R → B → K → N → P) to fail fast
- **Precomputed ray cache** — all sliding-piece attack lines built once at board initialisation for O(1) lookup during search
- **Island BFS** — flood-fill assigns each accessible square an island ID; threats are filtered to same-island pairs in Islands mode
- **Two-colour exemption** — same-colour pieces skip the threat check entirely
- **Preset square constraint** — in Presets mode, pieces may be placed on any accessible square, but every marked square must be occupied in the final solution; preset squares are tried first and branches are pruned early when remaining empty presets exceed pieces left to place

---

## Credits

Original solver logic — Python notebook  
PWA port — built with Claude (Anthropic)
