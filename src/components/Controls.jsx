import { PIECE_SYMBOLS, PIECE_NAMES, ALL_KINDS } from "../solver/engine.js";

/**
 * Controls
 * The top of the control deck: board size, click tool, and — only while the
 * Place tool is active — the piece the tool puts down. Everything is a single
 * unlabelled row so the board above keeps as much height as possible; the
 * piece row is hidden for the other tools because it has no effect on them.
 */
export default function Controls({
  activeTool, onToolChange,
  selectedKind, selectedColour,
  onKindChange, onColourChange,
  mode,
  sizes, boardCols, boardRows, onColsChange, onRowsChange,
  onUndo, onRedo, canUndo, canRedo,
}) {
  const isBlack    = selectedColour === "B";
  const showPreset = mode === "Presets";
  const showPieces = activeTool === "place";
  // Colour only matters for pieces placed by hand — the tray has its own
  // per-colour rows — and only Two-Colour mode distinguishes the two sides.
  const showColour = mode === "Two-Colour";

  // Build tool list — Preset tool only appears in Presets mode
  const tools = [
    { id: "place",  label: "✦ Place"  },
    { id: "block",  label: "█ Block"  },
    ...(showPreset ? [{ id: "preset", label: "○ Preset" }] : []),
    { id: "erase",  label: "✕ Erase"  },
  ];

  return (
    <>
      {/* ── Board size ── */}
      <div className="deck-row size-row">
        <span className="mini-label">Cols</span>
        <div className="chip-group" role="group" aria-label="Columns">
          {sizes.map(n => (
            <button
              key={n}
              className={`chip${boardCols === n ? " active" : ""}`}
              onClick={() => onColsChange(n)}
              aria-label={`${n} columns`}
              aria-pressed={boardCols === n}
            >{n}</button>
          ))}
        </div>
        <span className="mini-label rows">Rows</span>
        <div className="chip-group" role="group" aria-label="Rows">
          {sizes.map(n => (
            <button
              key={n}
              className={`chip${boardRows === n ? " active" : ""}`}
              onClick={() => onRowsChange(n)}
              aria-label={`${n} rows`}
              aria-pressed={boardRows === n}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* ── Click tool ── */}
      <div className="deck-row tool-bar" role="group" aria-label="Click tool">
        {tools.map(({ id, label }) => (
          <button
            key={id}
            className={`tool-btn${activeTool === id ? " active" : ""}${id === "preset" ? " preset-tool" : ""}`}
            onClick={() => onToolChange(id)}
            aria-pressed={activeTool === id}
          >{label}</button>
        ))}

        {/* Undo/redo sit with the tools — they act on the board too. The
            tool buttons are elastic, so this cluster can't overflow the row
            the way it would in the fixed-width size row above. */}
        <div className="history-tools">
          <button
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last edit"
          >↶</button>
          <button
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo last undone edit"
          >↷</button>
        </div>
      </div>

      {/* ── Piece to place (Place tool only) ── */}
      {showPieces && (
        <div className="deck-row piece-bar" role="group" aria-label="Piece to place">
          {ALL_KINDS.map(kind => (
            <button
              key={kind}
              className={`piece-btn${selectedKind === kind ? (isBlack ? " active black" : " active") : ""}`}
              onClick={() => onKindChange(kind)}
              title={PIECE_NAMES[kind]}
              aria-label={PIECE_NAMES[kind]}
              aria-pressed={selectedKind === kind}
            >
              <span aria-hidden="true">{PIECE_SYMBOLS[selectedColour + kind]}</span>
            </button>
          ))}
          {showColour && (
            <div className="colour-toggle" role="group" aria-label="Piece colour">
              {["W", "B"].map(col => (
                <button
                  key={col}
                  className={`colour-btn${selectedColour === col ? (col === "B" ? " active black" : " active") : ""}`}
                  onClick={() => onColourChange(col)}
                  aria-label={col === "W" ? "White" : "Black"}
                  aria-pressed={selectedColour === col}
                >
                  {col === "W" ? "⬜" : "⬛"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
