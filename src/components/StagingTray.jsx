import { PIECE_SYMBOLS, ALL_KINDS } from "../solver/engine.js";

/**
 * StagingTray
 * One compact row of piece chips (two rows in Two-Colour mode) with the
 * add/remove/clear cluster pinned to the right, so the chips of both rows
 * stay aligned. Counts live on the chips themselves — no header, no caption.
 */
export default function StagingTray({
  stagedCounts, trayMode, onTrayModeChange, onPieceClick, onClear, showBlackRow,
}) {
  const rows = showBlackRow
    ? [{ colour: "W", label: "W" }, { colour: "B", label: "B" }]
    : [{ colour: "W", label: "" }];

  const hasStaged = Object.values(stagedCounts).some((c) => c > 0);

  return (
    <div className="tray-card" aria-label="Staging tray">
      <div className="tray-rows">
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
                    <span className="tray-sym" aria-hidden="true">{sym}</span>
                    <span className="tray-cnt" aria-hidden="true">{cnt}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="tray-tools">
        {[
          { value: "add", icon: "+", label: "Tap pieces to add them to the tray" },
          { value: "sub", icon: "−", label: "Tap pieces to remove them from the tray" },
        ].map(({ value, icon, label }) => (
          <button
            key={value}
            className={`mod-btn${trayMode === value ? " active" : ""}`}
            onClick={() => onTrayModeChange(value)}
            title={label}
            aria-label={label}
            aria-pressed={trayMode === value}
          >{icon}</button>
        ))}
        <button
          className="mod-btn tray-clear-btn"
          onClick={onClear}
          disabled={!hasStaged}
          title="Empty the tray"
          aria-label="Empty the staging tray"
        >🗑</button>
      </div>
    </div>
  );
}
