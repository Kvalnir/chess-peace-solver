import { useState, useCallback, useEffect, useRef } from "react";
import { PIECE_SYMBOLS, ALL_KINDS } from "./solver/engine.js";
import Board from "./components/Board.jsx";
import Controls from "./components/Controls.jsx";
import StagingTray from "./components/StagingTray.jsx";
import ModeSelector from "./components/ModeSelector.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

// Order matches the ChessPeace main game menu
const MODES = ["Classic", "Multiples", "Two-Colour", "Islands", "Presets"];

const MODE_HINTS = {
  Classic:       "One of each piece. Add all six to the tray.",
  Multiples:     "Add multiple copies of the same piece to the tray.",
  "Two-Colour":  "White & black pieces coexist. Only opposite colours threaten each other.",
  Islands:       "Block squares to split the board. Pieces only threaten within their island.",
  Presets:       "Fix pieces on the board first, then stage the rest.",
};

const SIZES = [4, 5, 6];

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Board dimensions (cols change syncs rows; rows are independent) ──
  const [boardCols, setBoardCols] = useState(5);
  const [boardRows, setBoardRows] = useState(5);

  const [mode,      setMode]      = useState("Classic");
  // cells: { "r,c": { type: "fixed"|"blocked", kind?, colour? } }
  const [cells,     setCells]     = useState({});

  // ── Piece selection ──────────────────────────────────────────────────
  const [selectedKind,   setSelectedKind]   = useState("Q");
  const [selectedColour, setSelectedColour] = useState("W");
  const [activeTool,     setActiveTool]     = useState("place");

  // ── Staging tray ─────────────────────────────────────────────────────
  const [staged,   setStaged]   = useState([]);
  const [trayMode, setTrayMode] = useState("add");

  // ── Solve state ──────────────────────────────────────────────────────
  const [solving,   setSolving]   = useState(false);
  const [solution,  setSolution]  = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  // ── Worker ───────────────────────────────────────────────────────────
  const workerRef    = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./solver/worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = ({ data }) => {
      const { solution: sol, error } = data;
      setSolving(false);
      if (error) {
        setResultMsg({ kind: "warning", text: `Engine error: ${error}` });
        setSolution(null);
        return;
      }
      if (sol) {
        setSolution(sol);
        setResultMsg({ kind: "success", text: "Solution found ✓" });
      } else {
        setSolution(null);
        setResultMsg({ kind: "failure", text: "No valid solution exists." });
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  // ── Clip cells to new bounds ─────────────────────────────────────────
  const clipCells = useCallback((rows, cols) => {
    setCells((prev) => {
      const next = {};
      for (const [key, data] of Object.entries(prev)) {
        const [r, c] = key.split(",").map(Number);
        if (r < rows && c < cols) next[key] = data;
      }
      return next;
    });
    setSolution(null);
    setResultMsg(null);
  }, []);

  // Changing cols also syncs rows
  const handleColsChange = useCallback((n) => {
    setBoardCols(n);
    setBoardRows(n);
    clipCells(n, n);
  }, [clipCells]);

  // Rows can be changed independently
  const handleRowsChange = useCallback((n, currentCols) => {
    setBoardRows(n);
    clipCells(n, currentCols);
  }, [clipCells]);

  // ── Build puzzle config for solver ───────────────────────────────────
  const buildPuzzle = useCallback(() => {
    const blocked = [];
    const pieces  = [];
    for (const [key, data] of Object.entries(cells)) {
      const [r, c] = key.split(",").map(Number);
      if (data.type === "blocked")      blocked.push([r, c]);
      else if (data.type === "fixed")   pieces.push({ kind: data.kind, colour: data.colour, fixedPos: [r, c] });
    }
    for (const { kind, colour } of staged) {
      pieces.push({ kind, colour, fixedPos: null });
    }
    return {
      boardConfig: { rows: boardRows, cols: boardCols, blocked, islandsMode: mode === "Islands", twoColour: mode === "Two-Colour" },
      pieces,
    };
  }, [cells, staged, boardRows, boardCols, mode]);

  // ── Solution display map ─────────────────────────────────────────────
  const solutionMap = (() => {
    if (!solution) return {};
    const { pieces } = buildPuzzle();
    const map = {};
    for (const [idxStr, pos] of Object.entries(solution)) {
      const piece = pieces[Number(idxStr)];
      if (!piece || !pos) continue;
      map[`${pos[0]},${pos[1]}`] = { kind: piece.kind, colour: piece.colour, symbol: PIECE_SYMBOLS[piece.colour + piece.kind] };
    }
    return map;
  })();

  // ── Board cell interaction ───────────────────────────────────────────
  const handleCellAction = useCallback((r, c, action) => {
    const cellKey = `${r},${c}`;
    setCells((prev) => {
      const next    = { ...prev };
      const current = prev[cellKey];
      if (action === "place") {
        if (current?.type === "blocked") return prev;
        if (current?.type === "fixed")   delete next[cellKey];
        else next[cellKey] = { type: "fixed", kind: selectedKind, colour: selectedColour };
      } else if (action === "block") {
        if (current?.type === "blocked") delete next[cellKey];
        else next[cellKey] = { type: "blocked" };
      } else if (action === "erase") {
        delete next[cellKey];
      }
      return next;
    });
    setSolution(null);
    setResultMsg(null);
  }, [selectedKind, selectedColour]);

  // ── Mode change ──────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setSolution(null);
    setResultMsg(null);
  }, []);

  // ── Staging tray ─────────────────────────────────────────────────────
  const handleTrayClick = useCallback((kind, colour) => {
    setSolution(null);
    setResultMsg(null);
    setStaged((prev) => {
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

  // ── Solve ────────────────────────────────────────────────────────────
  const handleSolve = useCallback(() => {
    const { boardConfig, pieces } = buildPuzzle();
    if (pieces.length === 0) {
      setResultMsg({ kind: "warning", text: "Add pieces to the staging tray first." });
      return;
    }
    setSolving(true);
    setSolution(null);
    setResultMsg(null);
    workerRef.current?.postMessage({ boardConfig, pieces, requestId: ++requestIdRef.current });
  }, [buildPuzzle]);

  // ── Clear ────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setCells({});
    setStaged([]);
    setSolution(null);
    setResultMsg(null);
    setSolving(false);
  }, []);

  const showBlackRow = mode === "Two-Colour";

  // ── Render ───────────────────────────────────────────────────────────
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
        {/* Cols and Rows on one line */}
        <div className="board-size-row">
          <span className="size-axis-label">Cols</span>
          {SIZES.map((n) => (
            <button key={n} className={`size-btn${boardCols === n ? " active" : ""}`} onClick={() => handleColsChange(n)}>{n}</button>
          ))}
          <span className="size-axis-label" style={{ marginLeft: 10 }}>Rows</span>
          {SIZES.map((n) => (
            <button key={n} className={`size-btn${boardRows === n ? " active" : ""}`} onClick={() => handleRowsChange(n, boardCols)}>{n}</button>
          ))}
        </div>

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

      <Controls
        activeTool={activeTool}
        onToolChange={setActiveTool}
        selectedKind={selectedKind}
        selectedColour={selectedColour}
        onKindChange={setSelectedKind}
        onColourChange={setSelectedColour}
        showColourToggle={mode === "Two-Colour"}
      />

      <div className="divider" style={{ margin: "4px 0" }} />

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
