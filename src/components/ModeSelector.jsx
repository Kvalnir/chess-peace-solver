/**
 * ModeSelector
 * Tab strip for choosing the active game mode, plus a single status line
 * underneath. The status line does double duty: it shows the mode hint
 * normally, and the solve result when there is one. Sharing one fixed line
 * keeps the result from pushing the board around when it appears.
 */
export default function ModeSelector({ modes, active, hint, result, onChange }) {
  return (
    <div className="setup-strip">
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

      {/* The <p> itself is never remounted, so it stays a live region that
          announces the result; only the text inside is keyed, to fade in. */}
      <p className={`status-line${result ? ` result ${result.kind}` : ""}`} role="status">
        <span className="status-text" key={result ? result.text : active}>
          {result ? result.text : hint}
        </span>
        {result?.time != null && <span className="status-time">{result.time} ms</span>}
      </p>
    </div>
  );
}
