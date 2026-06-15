import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { PIECE_SYMBOLS, ALL_KINDS } from "./solver/engine.js";
import Board from "./components/Board.jsx";
import Controls from "./components/Controls.jsx";
import StagingTray from "./components/StagingTray.jsx";
import ModeSelector from "./components/ModeSelector.jsx";

const MODES = ["Classic", "Multiples", "Two-Colour", "Islands", "Presets"];

const MODE_HINTS = {
  Classic:       "One of each piece. Add all six to the tray.",
  Multiples:     "Add multiple copies of the same piece to the tray.",
  "Two-Colour":  "White & black pieces coexist. Only opposite colours threaten each other.",
  Islands:       "Block squares to split the board. Pieces only threaten within their island.",
  Presets:       "Mark preset squares (○) where pieces must go, then stage the pieces.",
};

const SIZES = [4, 5, 6];

// ── Theme switcher ──────────────────────────────────────────────
// Cycle order shown on the header button: dark → light → system → dark.
const THEME_NEXT  = { dark: "light", light: "system", system: "dark" };
const THEME_ICON  = { dark: "🌙", light: "☀️", system: "🖥️" };
const THEME_LABEL = { dark: "Dark", light: "Light", system: "System" };
const THEME_BG    = { dark: "#080c10", light: "#e8ebef" };

const getStoredTheme = () => {
  try {
    const t = localStorage.getItem("theme");
    return t in THEME_NEXT ? t : "system";
  } catch { return "system"; }
};

// Modes that auto-populate the staging tray with 1 of each piece
const AUTO_TRAY_MODES = ["Classic", "Islands", "Presets"];

const defaultStaged = () => ALL_KINDS.map(kind => ({ kind, colour: "W" }));

export default function App() {
  const [boardCols, setBoardCols] = useState(5);
  const [boardRows, setBoardRows] = useState(5);
  const [mode,      setMode]      = useState("Classic");
  const [cells,     setCells]     = useState({});

  const [selectedKind,   setSelectedKind]   = useState("Q");
  const [selectedColour, setSelectedColour] = useState("W");
  // Default tool is "block" — configure the board before placing pieces
  const [activeTool, setActiveTool] = useState("block");

  // Auto-populate staging tray for Classic/Islands/Presets on first load
  const [staged,   setStaged]   = useState(defaultStaged());
  const [trayMode, setTrayMode] = useState("add");

  const [solving,   setSolving]   = useState(false);
  const [solution,  setSolution]  = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  const [theme, setTheme] = useState(getStoredTheme);

  const workerRef      = useRef(null);
  const requestIdRef   = useRef(0);
  const solveStartRef  = useRef(0);
  // Mirrors `solving` so callbacks can check it without re-binding on change.
  const solvingRef     = useRef(false);
  // The exact pieces array a solve ran against — solution indices map into
  // this, never into a rebuilt array that the user may have edited since.
  const solvePiecesRef = useRef([]);

  const setSolvingState = useCallback((v) => {
    solvingRef.current = v;
    setSolving(v);
  }, []);

  // (Re)create the solver worker. Called on mount, and again whenever an
  // in-flight solve must be killed — terminate is the only way to stop a
  // busy worker, so cancellation means replacing it with a fresh one.
  const spawnWorker = useCallback(() => {
    workerRef.current?.terminate();
    const w = new Worker(
      new URL("./solver/worker.js", import.meta.url),
      { type: "module" }
    );
    w.onmessage = ({ data }) => {
      const { solution: sol, error, requestId } = data;
      // Ignore responses from solves that were superseded or cleared.
      if (requestId !== requestIdRef.current) return;
      const elapsed = Math.round(performance.now() - solveStartRef.current);
      setSolvingState(false);
      if (error) {
        setResultMsg({ kind: "warning", text: `Engine error: ${error}` });
        setSolution(null);
        return;
      }
      if (sol) {
        setSolution(sol);
        setResultMsg({ kind: "success", text: "Solution found ✓", time: elapsed });
      } else {
        setSolution(null);
        setResultMsg({ kind: "failure", text: "No valid arrangement exists.", time: elapsed });
      }
    };
    w.onerror = () => {
      setSolvingState(false);
      setSolution(null);
      setResultMsg({ kind: "warning", text: "Solver failed — please try again." });
    };
    workerRef.current = w;
  }, [setSolvingState]);

  useEffect(() => {
    spawnWorker();
    return () => workerRef.current?.terminate();
  }, [spawnWorker]);

  // Discard any displayed result AND any in-flight solve. Called on every
  // edit so a stale response can never be mapped onto a changed board, and
  // a superseded worker never burns CPU in the background.
  const invalidate = useCallback(() => {
    requestIdRef.current++;
    if (solvingRef.current) {
      spawnWorker();
      setSolvingState(false);
    }
    setSolution(null);
    setResultMsg(null);
  }, [spawnWorker, setSolvingState]);

  // ── Theme: apply choice, persist, keep PWA status-bar colour in sync ──
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch { /* ignore */ }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const syncMeta = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? THEME_BG.dark : THEME_BG.light);
    };
    syncMeta();
    // Only the System choice needs to react to OS changes (CSS handles the rest).
    if (theme === "system") {
      mq.addEventListener("change", syncMeta);
      return () => mq.removeEventListener("change", syncMeta);
    }
  }, [theme]);

  const cycleTheme = useCallback(() => setTheme(t => THEME_NEXT[t]), []);

  // ── Clip helpers ──────────────────────────────────────────────
  const clipCells = useCallback((rows, cols) => {
    setCells(prev => {
      const next = {};
      for (const [key, data] of Object.entries(prev)) {
        const [r, c] = key.split(",").map(Number);
        if (r < rows && c < cols) next[key] = data;
      }
      return next;
    });
    invalidate();
  }, [invalidate]);

  const handleColsChange = useCallback((n) => {
    setBoardCols(n); setBoardRows(n); clipCells(n, n);
  }, [clipCells]);

  const handleRowsChange = useCallback((n) => {
    setBoardRows(n); clipCells(n, boardCols);
  }, [clipCells, boardCols]);

  // ── Build puzzle for solver ───────────────────────────────────
  const buildPuzzle = useCallback(() => {
    const blocked = [], pieces = [], presetSquares = [];
    for (const [key, data] of Object.entries(cells)) {
      const [r, c] = key.split(",").map(Number);
      if      (data.type === "blocked") blocked.push([r, c]);
      else if (data.type === "fixed")   pieces.push({ kind: data.kind, colour: data.colour, fixedPos: [r, c] });
      else if (data.type === "preset")  presetSquares.push([r, c]);
    }
    for (const { kind, colour } of staged)
      pieces.push({ kind, colour, fixedPos: null });
    return {
      boardConfig: {
        rows: boardRows, cols: boardCols, blocked,
        islandsMode: mode === "Islands",
        twoColour:   mode === "Two-Colour",
        // Only restrict to preset squares when in Presets mode
        presetSquares: mode === "Presets" ? presetSquares : [],
      },
      pieces,
    };
  }, [cells, staged, boardRows, boardCols, mode]);

  // ── Solution display map ──────────────────────────────────────
  // Built from the pieces array captured at solve time, so indices always
  // match. `order` staggers the reveal animation per piece.
  const solutionMap = useMemo(() => {
    if (!solution) return {};
    const pieces = solvePiecesRef.current;
    const map = {};
    let order = 0;
    for (const [idxStr, pos] of Object.entries(solution)) {
      const piece = pieces[Number(idxStr)];
      if (!piece || !pos) continue;
      map[`${pos[0]},${pos[1]}`] = {
        kind: piece.kind, colour: piece.colour,
        symbol: PIECE_SYMBOLS[piece.colour + piece.kind],
        order: order++,
      };
    }
    return map;
  }, [solution]);

  // ── Cell interaction ──────────────────────────────────────────
  // In auto-tray modes, placing a fixed piece removes it from staged,
  // and removing a fixed piece adds it back.
  const handleCellAction = useCallback((r, c, action) => {
    const cellKey     = `${r},${c}`;
    const autoSync    = AUTO_TRAY_MODES.includes(mode);
    const currentCell = cells[cellKey]; // snapshot before update

    setCells(prev => {
      const next = { ...prev };
      const cur  = prev[cellKey];
      // A preset marker covered by a piece/block carries through as
      // `hadPreset` and is restored when the covering state is removed.
      const coversPreset = cur?.type === "preset" || cur?.hadPreset;
      if (action === "place") {
        if (cur?.type === "blocked") return prev;
        if (cur?.type === "fixed") {
          if (cur.hadPreset) next[cellKey] = { type: "preset" };
          else delete next[cellKey];
        } else {
          next[cellKey] = {
            type: "fixed", kind: selectedKind, colour: selectedColour,
            ...(coversPreset && { hadPreset: true }),
          };
        }
      } else if (action === "block") {
        if (cur?.type === "blocked") {
          if (cur.hadPreset) next[cellKey] = { type: "preset" };
          else delete next[cellKey];
        } else {
          next[cellKey] = { type: "blocked", ...(coversPreset && { hadPreset: true }) };
        }
      } else if (action === "preset") {
        if (cur?.type === "preset")  delete next[cellKey];
        else if (!cur || (cur.type !== "fixed" && cur.type !== "blocked"))
          next[cellKey] = { type: "preset" };
      } else if (action === "erase") {
        delete next[cellKey];
      }
      return next;
    });

    // Sync staging tray
    if (autoSync) {
      if (action === "place") {
        if (currentCell?.type === "fixed") {
          // Removing a fixed piece → add it back to staged
          setStaged(prev => [...prev, { kind: currentCell.kind, colour: currentCell.colour }]);
        } else if (!currentCell || currentCell.type === "preset") {
          // Placing a new fixed piece → remove one matching from staged
          setStaged(prev => {
            const idx = prev.findIndex(p => p.kind === selectedKind && p.colour === selectedColour);
            if (idx === -1) return prev;
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          });
        }
      } else if ((action === "erase" || action === "block") && currentCell?.type === "fixed") {
        setStaged(prev => [...prev, { kind: currentCell.kind, colour: currentCell.colour }]);
      }
    }

    invalidate();
  }, [selectedKind, selectedColour, mode, cells, invalidate]);

  // ── Mode change ───────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    invalidate();
    // The Preset tool only exists in Presets mode — fall back to Block
    setActiveTool(t => (t === "preset" && newMode !== "Presets") ? "block" : t);
    // Auto-populate tray if switching into an auto-tray mode with empty tray
    if (AUTO_TRAY_MODES.includes(newMode)) {
      setStaged(prev => prev.length === 0 ? defaultStaged() : prev);
    }
  }, [invalidate]);

  // ── Staging tray ──────────────────────────────────────────────
  const handleTrayClick = useCallback((kind, colour) => {
    invalidate();
    setStaged(prev => {
      if (trayMode === "add") return [...prev, { kind, colour }];
      const idx = [...prev].reverse().findIndex(p => p.kind === kind && p.colour === colour);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return [...prev.slice(0, realIdx), ...prev.slice(realIdx + 1)];
    });
  }, [trayMode, invalidate]);

  // Empty the staging tray without touching the board or board setup.
  const handleClearStaged = useCallback(() => {
    setStaged([]);
    invalidate();
  }, [invalidate]);

  const stagedCounts = useMemo(() => {
    const counts = {};
    for (const { kind, colour } of staged) {
      const k = `${colour}${kind}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [staged]);

  // ── Solve / Cancel ────────────────────────────────────────────
  const handleSolve = useCallback(() => {
    if (solvingRef.current) {
      // The button doubles as Cancel while a solve is running
      invalidate();
      setResultMsg({ kind: "warning", text: "Solve cancelled." });
      return;
    }
    const { boardConfig, pieces } = buildPuzzle();
    if (pieces.length === 0) {
      setResultMsg({ kind: "warning", text: "Add pieces to the staging tray first." });
      return;
    }
    solvePiecesRef.current = pieces;
    setSolvingState(true); setSolution(null); setResultMsg(null);
    solveStartRef.current = performance.now();
    workerRef.current?.postMessage({ boardConfig, pieces, requestId: ++requestIdRef.current });
  }, [buildPuzzle, invalidate, setSolvingState]);

  // ── Clear — resets to block tool and repopulates tray ─────────
  const handleClear = useCallback(() => {
    invalidate(); // discards any in-flight solve
    setCells({});
    setStaged(AUTO_TRAY_MODES.includes(mode) ? defaultStaged() : []);
    setActiveTool("block"); // board setup comes first
  }, [mode, invalidate]);

  const showBlackRow = mode === "Two-Colour";

  return (
    <div className="app">
      <header className="app-header">
        <h1>♟ Chess Peace</h1>
        <span className="tagline">Solver</span>
        <button
          className="theme-toggle"
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABEL[theme]} (tap for ${THEME_LABEL[THEME_NEXT[theme]]})`}
          aria-label={`Theme: ${THEME_LABEL[theme]}. Tap to switch to ${THEME_LABEL[THEME_NEXT[theme]]}.`}
        >
          <span aria-hidden="true">{THEME_ICON[theme]}</span>
        </button>
      </header>

      <ModeSelector
        modes={MODES}
        active={mode}
        hint={MODE_HINTS[mode]}
        onChange={handleModeChange}
      />

      <div className="board-wrap">
        <div className="board-size-row">
          <span className="size-axis-label">Cols</span>
          {SIZES.map(n => (
            <button key={n} className={`size-btn${boardCols===n?" active":""}`} onClick={() => handleColsChange(n)}>{n}</button>
          ))}
          <span className="size-axis-label rows">Rows</span>
          {SIZES.map(n => (
            <button key={n} className={`size-btn${boardRows===n?" active":""}`} onClick={() => handleRowsChange(n)}>{n}</button>
          ))}
        </div>

        <div className="board-area" style={{ "--board-rows": boardRows }}>
          <Board
            boardRows={boardRows}
            boardCols={boardCols}
            cells={cells}
            solutionMap={solutionMap}
            activeTool={activeTool}
            onCellAction={handleCellAction}
          />
        </div>
      </div>

      <Controls
        activeTool={activeTool}
        onToolChange={setActiveTool}
        selectedKind={selectedKind}
        selectedColour={selectedColour}
        onKindChange={setSelectedKind}
        onColourChange={setSelectedColour}
        mode={mode}
      />

      <div className="divider" />

      <StagingTray
        stagedCounts={stagedCounts}
        trayMode={trayMode}
        onTrayModeChange={setTrayMode}
        onPieceClick={handleTrayClick}
        onClear={handleClearStaged}
        showBlackRow={showBlackRow}
      />

      <div className="action-row">
        <button className={`btn-solve${solving ? " solving" : ""}`} onClick={handleSolve}>
          {solving
            ? <><span className="spinner" aria-hidden="true" />Cancel</>
            : "Solve Puzzle ♟"}
        </button>
        <button className="btn-clear" onClick={handleClear}>Reset</button>
      </div>

      {resultMsg && (
        <div className={`result-banner ${resultMsg.kind}`} role="status">
          <span>{resultMsg.text}</span>
          {resultMsg.time != null && (
            <span className="result-time">{resultMsg.time} ms</span>
          )}
        </div>
      )}
    </div>
  );
}
