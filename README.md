# ♟ Chess Peace Solver

A mobile-first Progressive Web App (PWA) for solving [Chess Peace](https://chesspeace.app/) puzzles — place every chess piece so that none can capture another.

**Live app → [kvalnir.github.io/chess-peace-solver](https://kvalnir.github.io/chess-peace-solver/)**

-----

## Features

- **All five puzzle modes** — Classic, Multiples, Two-Colour, Islands, Presets
- **Tap-to-place & drag-paint** — touch-optimised board interaction
- **Non-square boards** — set columns and rows independently (4–6)
- **WebWorker solver** — runs off the main thread so the UI never freezes
- **Solve time display** — shows compute time in milliseconds
- **Offline capable** — works without an internet connection once installed
- **iOS PWA** — install via Safari → Share → Add to Home Screen

-----

## How to Use

### Setting up the board

|Action        |How                                                  |
|--------------|-----------------------------------------------------|
|Place a piece |Select a piece from the bar, tap any empty square    |
|Remove a piece|Tap an existing piece again                          |
|Block a square|Switch to **Block** tool, tap a square               |
|Erase anything|Switch to **Erase** tool, tap a square               |
|Drag-paint    |Hold and drag across squares to apply the same action|

### Puzzle modes

|Mode          |Description                                                               |
|--------------|--------------------------------------------------------------------------|
|**Classic**   |One of each piece type — add all six to the staging tray                  |
|**Multiples** |Multiple copies of the same piece — add as many as needed                 |
|**Two-Colour**|White and black pieces coexist; only opposite colours threaten each other |
|**Islands**   |Blocked squares divide the board; pieces only threaten within their island|
|**Presets**   |Fix pieces at known positions on the board first, then stage the rest     |

### Staging tray

The tray holds pieces for the solver to auto-place.

- **`+` mode** — tap a piece icon to queue one copy
- **`−` mode** — tap a piece icon to remove one copy
- Amber count = White pieces queued · Violet count = Black pieces queued

### Solving

1. Set the board size to match your puzzle (Cols × Rows)
1. Select the correct puzzle mode
1. Add pieces to the staging tray (and optionally fix preset pieces on the board)
1. Tap **Solve Puzzle ♟**
1. The solution appears on the board in teal · Solve time shown below

-----

## Colour System

|Colour  |Meaning                   |
|--------|--------------------------|
|🟡 Amber |White piece / White player|
|🟣 Violet|Black piece / Black player|
|🩵 Teal  |Solver solution output    |

-----

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
│   └── index.css                  # Obsidian dark theme
├── index.html                     # iOS PWA meta tags
├── vite.config.js                 # Vite + PWA plugin config
└── package.json
```

-----

## Tech Stack

|           |                                         |
|-----------|-----------------------------------------|
|Framework  |React 18                                 |
|Bundler    |Vite 5                                   |
|PWA        |vite-plugin-pwa (Workbox)                |
|Styling    |Plain CSS custom properties              |
|Solver     |Pure JS backtracking, runs in a WebWorker|
|Hosting    |GitHub Pages (free)                      |
|Bundle size|~52 KB gzipped                           |

-----

## Deploying Changes

This repo uses GitHub Actions. Every file you commit to `main` automatically triggers a rebuild and redeploy — no local tools needed.

To update the live app:

1. Edit any file directly on GitHub (click the file → pencil icon)
1. Commit to `main`
1. Wait ~60 seconds for the Actions workflow to complete
1. The live URL updates automatically

-----

## Solver Algorithm

The engine is a direct JavaScript port of the original Python notebook:

- **Backtracking search** with early constraint pruning
- **Heuristic ordering** — heavier pieces placed first (Q → R → B → K → N → P) to fail fast
- **Precomputed ray cache** — all sliding-piece attack lines built once at board initialisation for O(1) lookup during search
- **Island BFS** — flood-fill assigns each accessible square an island ID; threats are filtered to same-island pairs in Islands mode
- **Two-colour exemption** — same-colour pieces skip the threat check entirely

-----

## Credits

Original solver logic — Python notebook  
PWA port — built with Claude (Anthropic)