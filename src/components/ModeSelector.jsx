/**
 * ModeSelector
 * Horizontally scrollable tab strip for choosing the active game mode.
 * Shows a brief contextual hint below the tabs.
 */
export default function ModeSelector({ modes, active, hint, onChange }) {
  return (
    <div className="mode-selector">
      <div
        className="mode-tabs"
        role="tablist"
        aria-label="Game mode"
        style={{ gridTemplateColumns: `repeat(${modes.length}, 1fr)` }}
      >
        {modes.map((mode) => (
          <button
            key={mode}
            role="tab"
            aria-selected={active === mode}
            className={`mode-tab${active === mode ? " active" : ""}`}
            onClick={() => onChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* key remounts the hint on mode change so it fades in */}
      {hint && <p className="mode-hint" key={active}>{hint}</p>}
    </div>
  );
}
