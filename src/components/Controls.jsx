import { PIECE_SYMBOLS, ALL_KINDS } from "../solver/engine.js";

// Friendly tool labels shown on the toolbar buttons
const TOOLS = [
  { id: "place", label: "✦ Place" },
  { id: "block", label: "█ Block" },
  { id: "erase", label: "✕ Erase" },
];

// Short letter names rendered beneath each piece icon
const KIND_LABELS = { K:"King", Q:"Queen", R:"Rook", B:"Bishop", N:"Knight", P:"Pawn" };

export default function Controls({
  activeTool,
  onToolChange,
  selectedKind,
  selectedColour,
  onKindChange,
  onColourChange,
  showColourToggle,
}) {
  return (
    <div className="controls-panel">
      {/* ── Tool bar ── */}
      <div>
        <div className="section-label">Click Tool</div>
        <div className="tool-bar">
          {TOOLS.map(({ id, label }) => (
            <button
              key={id}
              className={`tool-btn${activeTool === id ? " active" : ""}`}
              onClick={() => onToolChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Piece bar ── */}
      <div className="piece-bar-section">
        <div className="piece-bar-header">
          <div className="section-label" style={{ marginBottom: 0 }}>Piece</div>

          {/* Colour toggle — always visible; critical in Two-Colour mode */}
          <div className="colour-toggle">
            {["W", "B"].map((col) => (
              <button
                key={col}
                className={`colour-btn${selectedColour === col ? " active" : ""}`}
                onClick={() => onColourChange(col)}
              >
                {col === "W" ? "White" : "Black"}
              </button>
            ))}
          </div>
        </div>

        <div className="piece-bar">
          {ALL_KINDS.map((kind) => {
            const sym = PIECE_SYMBOLS[selectedColour + kind];
            return (
              <button
                key={kind}
                className={`piece-btn${selectedKind === kind ? " active" : ""}`}
                onClick={() => onKindChange(kind)}
                aria-label={KIND_LABELS[kind]}
              >
                <span aria-hidden="true">{sym}</span>
                <span className="piece-label">{kind}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
