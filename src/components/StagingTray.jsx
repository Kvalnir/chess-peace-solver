import { PIECE_SYMBOLS, ALL_KINDS } from "../solver/engine.js";

export default function StagingTray({
  stagedCounts, trayMode, onTrayModeChange, onPieceClick, onClear, showBlackRow,
}) {
  const rows = showBlackRow
    ? [{ colour: "W", label: "W" }, { colour: "B", label: "B" }]
    : [{ colour: "W", label: "" }];

  const hasStaged = Object.values(stagedCounts).some((c) => c > 0);

  return (
    <div className="staging-tray">
      <div className="tray-card">
        {/* Header */}
        <div className="tray-header">
          <span className="tray-title">📦 Staging Tray</span>
          <div className="tray-header-actions">
            <button
              className="tray-clear-btn"
              onClick={onClear}
              disabled={!hasStaged}
              aria-label="Clear all staged pieces"
            >Clear</button>
            <div className="tray-modifier">
              {[{ value: "add", icon: "+" }, { value: "sub", icon: "−" }].map(({ value, icon }) => (
                <button
                  key={value}
                  className={`mod-btn${trayMode === value ? " active" : ""}`}
                  onClick={() => onTrayModeChange(value)}
                  aria-label={value === "add" ? "Add mode" : "Remove mode"}
                >{icon}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Piece rows */}
        {rows.map(({ colour, label }) => {
          const isBlack = colour === "B";
          return (
            <div key={colour} className="tray-row">
              {showBlackRow && (
                <span className={`tray-colour-label${isBlack ? " black" : ""}`}>{label}</span>
              )}
              {ALL_KINDS.map((kind) => {
                const sym = PIECE_SYMBOLS[colour + kind];
                const cnt = stagedCounts[colour + kind] || 0;
                return (
                  <button
                    key={kind}
                    className={`tray-piece-btn${cnt > 0 ? (isBlack ? " has-pieces black" : " has-pieces") : ""}`}
                    onClick={() => onPieceClick(kind, colour)}
                    aria-label={`${isBlack ? "Black" : "White"} ${kind}: ${cnt} staged`}
                  >
                    <span className="tray-sym">{sym}</span>
                    <span className="tray-cnt">{cnt}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        <p className="tray-hint">
          {trayMode === "add" ? "Tap a piece to queue it for auto-placement." : "Tap a piece to remove one from the queue."}
        </p>
      </div>
    </div>
  );
}
