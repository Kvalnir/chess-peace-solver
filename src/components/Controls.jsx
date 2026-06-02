import { PIECE_SYMBOLS, PIECE_NAMES, ALL_KINDS } from "../solver/engine.js";

export default function Controls({
  activeTool, onToolChange,
  selectedKind, selectedColour,
  onKindChange, onColourChange,
  mode,
}) {
  const isBlack = selectedColour === "B";
  const showPreset = mode === "Presets";

  // Build tool list — Preset tool only appears in Presets mode
  const tools = [
    { id: "place",  label: "✦ Place"  },
    { id: "block",  label: "█ Block"  },
    ...(showPreset ? [{ id: "preset", label: "○ Preset" }] : []),
    { id: "erase",  label: "✕ Erase"  },
  ];

  return (
    <div className="controls-panel">
      {/* ── Tool bar ── */}
      <div>
        <div className="section-label">Click Tool</div>
        <div className="tool-bar">
          {tools.map(({ id, label }) => (
            <button
              key={id}
              className={`tool-btn${activeTool === id ? " active" : ""}${id === "preset" ? " preset-tool" : ""}`}
              onClick={() => onToolChange(id)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Piece bar ── */}
      <div className="piece-bar-section">
        <div className="piece-bar-header">
          <div className="section-label" style={{ marginBottom: 0 }}>Piece</div>
          <div className="colour-toggle">
            {["W", "B"].map(col => (
              <button
                key={col}
                className={`colour-btn${selectedColour === col ? (col === "B" ? " active black" : " active") : ""}`}
                onClick={() => onColourChange(col)}
              >
                {col === "W" ? "⬜ White" : "⬛ Black"}
              </button>
            ))}
          </div>
        </div>
        <div className="piece-bar">
          {ALL_KINDS.map(kind => (
            <button
              key={kind}
              className={`piece-btn${selectedKind === kind ? (isBlack ? " active black" : " active") : ""}`}
              onClick={() => onKindChange(kind)}
              aria-label={PIECE_NAMES[kind]}
            >
              <span aria-hidden="true">{PIECE_SYMBOLS[selectedColour + kind]}</span>
              <span className="piece-label">{kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
