import { PIECE_SYMBOLS, ALL_KINDS } from "../solver/engine.js";

/**
 * StagingTray
 * Shows a compact grid of piece buttons.
 * • [+] mode: tap a piece to add one copy to the staged list
 * • [−] mode: tap a piece to remove one copy
 * Count badges update live. Amber highlight means ≥ 1 copy is staged.
 */
export default function StagingTray({
  stagedCounts,    // { "WQ": 2, "WR": 1, ... }
  trayMode,        // "add" | "sub"
  onTrayModeChange,
  onPieceClick,    // (kind, colour) => void
  showBlackRow,    // boolean — show Black piece row in Two-Colour mode
}) {
  const rows = showBlackRow
    ? [{ colour: "W", label: "W" }, { colour: "B", label: "B" }]
    : [{ colour: "W", label: "" }];

  return (
    <div className="staging-tray">
      <div className="tray-card">
        {/* ── Header ── */}
        <div className="tray-header">
          <span className="tray-title">📦 Staging Tray</span>
          <div className="tray-modifier">
            {[
              { value: "add", icon: "+" },
              { value: "sub", icon: "−" },
            ].map(({ value, icon }) => (
              <button
                key={value}
                className={`mod-btn${trayMode === value ? " active" : ""}`}
                onClick={() => onTrayModeChange(value)}
                aria-label={value === "add" ? "Add mode" : "Remove mode"}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Piece rows ── */}
        {rows.map(({ colour, label }) => (
          <div key={colour} className="tray-row">
            {/* Colour label — only shown when both rows are visible */}
            {showBlackRow && (
              <span className="tray-colour-label">{label}</span>
            )}

            {ALL_KINDS.map((kind) => {
              const sym = PIECE_SYMBOLS[colour + kind];
              const cnt = stagedCounts[colour + kind] || 0;
              return (
                <button
                  key={kind}
                  className={`tray-piece-btn${cnt > 0 ? " has-pieces" : ""}`}
                  onClick={() => onPieceClick(kind, colour)}
                  aria-label={`${colour === "W" ? "White" : "Black"} ${kind}: ${cnt} staged`}
                >
                  <span className="tray-sym">{sym}</span>
                  <span className="tray-cnt">{cnt}</span>
                </button>
              );
            })}
          </div>
        ))}

        {/* ── Helper text ── */}
        <p
          style={{
            fontSize: "0.66rem",
            color: "var(--sub)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {trayMode === "add"
            ? "Tap a piece to queue it for auto-placement."
            : "Tap a piece to remove one from the queue."}
        </p>
      </div>
    </div>
  );
}
