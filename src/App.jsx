import { useState, useCallback, useEffect, useRef } from "react";
import { PIECE_SYMBOLS, ALL_KINDS } from "./solver/engine.js";
import Board from "./components/Board.jsx";
import Controls from "./components/Controls.jsx";
import StagingTray from "./components/StagingTray.jsx";
import ModeSelector from "./components/ModeSelector.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const MODES = ["Classic", "Presets", "Multiples", "Islands", "Two-Colour"];

const MODE_HINTS = {
  Classic:      "One of each piece. Add all six to the tray.",
  Presets:      "Fix pieces on the board first, then stage the rest.",
  Multiples:    "Add multiple copies of the same piece to the tray.",
  Islands:      "Block squares to split the board. Pieces only threaten within their island.",
  "Two-Colour": "White & black pieces coexist. Only opposite colours threaten each other.",
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Board state ──────────────────────────────────────────────
  const [boardSize, setBoardSize] = useState(5);
  const [mode,      setMode]      = useState("Classic");

  // cells: { "r,c": { type: "fixed"|"blocked", kind?, colour? } }
  const [cells, setCells] = useState({});

  // ── Piece selection ──────────────────────────────────────────
  const [selectedKind,   setSelectedKind]   = useState("Q");
  const [selectedColour, setSelectedColour] = useState("W");

  // ── Tool ────────────────────────────────────────────────────
  // "place" | "block" | "erase"
  const [activeTool, setActiveTool] = useState("place");

  // ── Staging tray ─────────────────────────────────────────────
  // Array of { kind, colour } — order matters for display
  const [staged, setStaged] = useState([]);

  // Tray modifier: "add" | "sub"
  const [trayMode, setTrayMode] = useState("add");

  // ── Solve state ──────────────────────────────────────────────
  const [solving,  setSolving]  = useState(false);
  const [solution, setSolution] = useState(null);  // pieceIndex → [r,c]
  const [resultMsg, setResultMsg] = useState(null); // { kind:"success"|"failure"|"warning", text }

  // ── Worker ───────────────────────────────────────────────────
  const workerRef   = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Vite worker import — must use new URL syntax for bundler to recognise it
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

  // ── Derived: piece config for solver ──────────────────────────
  const buildPuzzle = useCallback(() => {
    const blocked = [];
    const pieces  = [];

    for (const [key, data] of Object.entries(cells)) {
      const [r, c] = key.split(",").map(Number);
      if (data.type === "blocked") {
        blocked.push([r, c]);
      } else if (data.type === "fixed") {
        pieces.push({ kind: data.kind, colour: data.colour, fixedPos: [r, c] });
      }
    }

    for (const { kind, colour } of staged) {
      pieces.push({ kind, colour, fixedPos: null });
    }

    const boardConfig = {
      rows:        boardSize,
      cols:        boardSize,
      blocked,
      islandsMode: mode === "Islands",
      twoColour:   mode === "Two-Colour",
    };

    return { boardConfig, pieces };
  }, [cells, staged, boardSize, mode]);

  // ── Solution display map ───────────────────────────────────────
  // Maps "r,c" → { kind, colour, symbol } for cells that hold solver results
  const solutionMap = (() => {
    if (!solution) return {};
    const { pieces } = buildPuzzle();
    const map = {};
    for (const [idxStr, pos] of Object.entries(solution)) {
      const idx   = Number(idxStr);
      const piece = pieces[idx];
      if (!piece || !pos) continue;
      const [r, c] = pos;
      map[`${r},${c}`] = {
        kind:   piece.kind,
        colour: piece.colour,
        symbol: PIECE_SYMBOLS[piece.colour + piece.kind],
      };
    }
    return map;
  })();

  // ── Board cell interaction ─────────────────────────────────────
  const handleCellAction = useCallback((r, c, action) => {
    const cellKey = `${r},${c}`;
    setCells((prev) => {
      const next = { ...prev };
      const current = prev[cellKey];

      if (action === "place") {
        if (current?.type === "blocked") return prev; // don't place on blocked
        if (current?.type === "fixed") {
          delete next[cellKey]; // tap existing piece to erase
        } else {
          next[cellKey] = { type: "fixed", kind: selectedKind, colour: selectedColour };
        }
      } else if (action === "block") {
        if (current?.type === "blocked") {
          delete next[cellKey]; // toggle off
        } else {
          next[cellKey] = { type: "blocked" }; // replace anything
        }
      } else if (action === "erase") {
        delete next[cellKey];
      }
      return next;
    });
    // Any board change invalidates the current solution
    setSolution(null);
    setResultMsg(null);
  }, [selectedKind, selectedColour]);

  // ── Board resize ───────────────────────────────────────────────
  const handleResize = useCallback((newSize) => {
    setBoardSize(newSize);
    // Remove cells that fall outside the new size
    setCells((prev) => {
      const next = {};
      for (const [key, data] of Object.entries(prev)) {
        const [r, c] = key.split(",").map(Number);
        if (r < newSize && c < newSize) next[key] = data;
      }
      return next;
    });
    setSolution(null);
    setResultMsg(null);
  }, []);

  // ── Mode change ────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setSolution(null);
    setResultMsg(null);
  }, []);

  // ── Staging tray ───────────────────────────────────────────────
  const handleTrayClick = useCallback((kind, colour) => {
    setSolution(null);
    setResultMsg(null);
    setStaged((prev) => {
      if (trayMode === "add") {
        return [...prev, { kind, colour }];
      } else {
        // Remove the last occurrence of this kind+colour
        const idx = [...prev].reverse().findIndex(p => p.kind === kind && p.colour === colour);
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return [...prev.slice(0, realIdx), ...prev.slice(realIdx + 1)];
      }
    });
  }, [trayMode]);

  // Counts per (kind, colour) for tray display
  const stagedCounts = (() => {
    const counts = {};
    for (const { kind, colour } of staged) {
      const k = `${colour}${kind}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  })();

  // ── Solve ──────────────────────────────────────────────────────
  const handleSolve = useCallback(() => {
    const { boardConfig, pieces } = buildPuzzle();

    if (pieces.length === 0) {
      setResultMsg({ kind: "warning", text: "Add pieces to the staging tray first." });
      return;
    }

    setSolving(true);
    setSolution(null);
    setResultMsg(null);

    const reqId = ++requestIdRef.current;
    workerRef.current?.postMessage({ boardConfig, pieces, requestId: reqId });
  }, [buildPuzzle]);

  // ── Clear ──────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setCells({});
    setStaged([]);
    setSolution(null);
    setResultMsg(null);
    setSolving(false);
  }, []);

  // ── Show Black row in tray only when Two-Colour mode active ────
  const showBlackRow = mode === "Two-Colour";

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <h1>♟ Chess Peace</h1>
        <span className="tagline">Solver</span>
      </header>

      {/* ── Mode selector ── */}
      <ModeSelector
        modes={MODES}
        active={mode}
        hint={MODE_HINTS[mode]}
        onChange={handleModeChange}
      />

      {/* ── Board + size picker ── */}
      <div className="board-wrap">
        {/* Board size */}
        <div className="board-size-row">
          <span className="section-label" style={{ marginBottom: 0 }}>Size</span>
          {[4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              className={`size-btn${boardSize === n ? " active" : ""}`}
              onClick={() => handleResize(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Board */}
        <Board
          boardSize={boardSize}
          cells={cells}
          solutionMap={solutionMap}
          activeTool={activeTool}
          selectedKind={selectedKind}
          selectedColour={selectedColour}
          onCellAction={handleCellAction}
        />
      </div>

      {/* ── Controls (tool + piece bar) ── */}
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

      {/* ── Staging tray ── */}
      <StagingTray
        stagedCounts={stagedCounts}
        trayMode={trayMode}
        onTrayModeChange={setTrayMode}
        onPieceClick={handleTrayClick}
        showBlackRow={showBlackRow}
      />

      {/* ── Action buttons ── */}
      <div className="action-row">
        <button
          className="btn-solve"
          onClick={handleSolve}
          disabled={solving}
        >
          {solving ? "Solving…" : "Solve Puzzle ♟"}
        </button>
        <button className="btn-clear" onClick={handleClear}>
          Reset
        </button>
      </div>

      {/* ── Result banner ── */}
      {resultMsg && (
        <div className={`result-banner ${resultMsg.kind}`}>
          <span>{resultMsg.text}</span>
        </div>
      )}
    </div>
  );
}
