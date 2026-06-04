import { useState, useCallback, useEffect, useRef } from "react";
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

  const workerRef     = useRef(null);
  const requestIdRef  = useRef(0);
  const solveStartRef = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./solver/worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = ({ data }) => {
      const elapsed = Math.round(performance.now() - solveStartRef.current);
      const { solution: sol, error } = data;
      setSolving(false);
      if (error) {
        setResultMsg({ kind: "warning", text: `Engine error: ${error}` });
        setSolution(null);
        return;
      }
      if (sol) {
        setSolution(sol);
        setResultMsg({ kind: "success", text: `Solution found ✓  —  Solved in ${elapsed} ms.` });
      } else {
        setSolution(null);
        setResultMsg({ kind: "failure", text: `No valid solution exists.  —  Solved in ${elapsed} ms.` });
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

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
    setSolution(null); setResultMsg(null);
  }, []);

  const handleColsChange = useCallback((n) => {
    setBoardCols(n); setBoardRows(n); clipCells(n, n);
  }, [clipCells]);

  const handleRowsChange = useCallback((n, currentCols) => {
    setBoardRows(n); clipCells(n, currentCols);
  }, [clipCells]);

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
  const solutionMap = (() => {
    if (!solution) return {};
    const { pieces } = buildPuzzle();
    const map = {};
    for (const [idxStr, pos] of Object.entries(solution)) {
      const piece = pieces[Number(idxStr)];
      if (!piece || !pos) continue;
      map[`${pos[0]},${pos[1]}`] = {
        kind: piece.kind, colour: piece.colour,
        symbol: PIECE_SYMBOLS[piece.colour + piece.kind],
      };
    }
    return map;
  })();

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
      if (action === "place") {
        if (cur?.type === "blocked") return prev;
        if (cur?.type === "fixed")   delete next[cellKey];
        else next[cellKey] = { type: "fixed", kind: selectedKind, colour: selectedColour };
      } else if (action === "block") {
        if (cur?.type === "blocked") delete next[cellKey];
        else next[cellKey] = { type: "blocked" };
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

    setSolution(null); setResultMsg(null);
  }, [selectedKind, selectedColour, mode, cells]);

  // ── Mode change ───────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setSolution(null); setResultMsg(null);
    // Auto-populate tray if switching into an auto-tray mode with empty tray
    if (AUTO_TRAY_MODES.includes(newMode)) {
      setStaged(prev => prev.length === 0 ? defaultStaged() : prev);
    }
  }, []);

  // ── Staging tray ──────────────────────────────────────────────
  const handleTrayClick = useCallback((kind, colour) => {
    setSolution(null); setResultMsg(null);
    setStaged(prev => {
      if (trayMode === "add") return [...prev, { kind, colour }];
      const idx = [...prev].reverse().findIndex(p => p.kind === kind && p.colour === colour);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return [...prev.slice(0, realIdx), ...prev.slice(realIdx + 1)];
    });
  }, [trayMode]);

  const stagedCounts = (() => {
    const counts = {};
    for (const { kind, colour } of staged) {
      const k = `${colour}${kind}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  })();

  // ── Solve ─────────────────────────────────────────────────────
  const handleSolve = useCallback(() => {
    const { boardConfig, pieces } = buildPuzzle();
    if (pieces.length === 0) {
      setResultMsg({ kind: "warning", text: "Add pieces to the staging tray first." });
      return;
    }
    setSolving(true); setSolution(null); setResultMsg(null);
    solveStartRef.current = performance.now();
    workerRef.current?.postMessage({ boardConfig, pieces, requestId: ++requestIdRef.current });
  }, [buildPuzzle]);

  // ── Clear — resets to block tool and repopulates tray ─────────
  const handleClear = useCallback(() => {
    setCells({});
    setStaged(AUTO_TRAY_MODES.includes(mode) ? defaultStaged() : []);
    setSolution(null); setResultMsg(null); setSolving(false);
    setActiveTool("block"); // board setup comes first
  }, [mode]);

  const showBlackRow = mode === "Two-Colour";

  return (
    <div className="app">
      <header className="app-header">
        <h1>♟ Chess Peace</h1>
        <span className="tagline">Solver</span>
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
          <span className="size-axis-label" style={{ marginLeft: 10 }}>Rows</span>
          {SIZES.map(n => (
            <button key={n} className={`size-btn${boardRows===n?" active":""}`} onClick={() => handleRowsChange(n, boardCols)}>{n}</button>
          ))}
        </div>

        <div className="board-area" style={{ "--board-rows": boardRows }}>
          <Board
            boardRows={boardRows}
            boardCols={boardCols}
            cells={cells}
            solutionMap={solutionMap}
            activeTool={activeTool}
            selectedKind={selectedKind}
            selectedColour={selectedColour}
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
        showBlackRow={showBlackRow}
      />

      <div className="action-row">
        <button className="btn-solve" onClick={handleSolve} disabled={solving}>
          {solving ? "Solving…" : "Solve Puzzle ♟"}
        </button>
        <button className="btn-clear" onClick={handleClear}>Reset</button>
      </div>

      {resultMsg && (
        <div className={`result-banner ${resultMsg.kind}`}>
          <span>{resultMsg.text}</span>
        </div>
      )}
    </div>
  );
}
