/**
 * ModeSelector
 * Horizontally scrollable tab strip for choosing the active game mode.
 * Shows a brief contextual hint below the tabs.
 */
export default function ModeSelector({ modes, active, hint, onChange }) {
  return (
    <div className="mode-selector">
      <div className="mode-tabs" role="tablist" aria-label="Game mode">
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

      {hint && (
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--sub)",
            marginTop: "6px",
            lineHeight: 1.45,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
