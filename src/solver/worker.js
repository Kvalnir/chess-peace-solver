// ─────────────────────────────────────────────────────────────────────────────
// Solver Web Worker
// Runs in a separate thread so the board UI stays responsive during solve.
// ─────────────────────────────────────────────────────────────────────────────
import { solve } from "./engine.js";

self.onmessage = ({ data }) => {
  const { boardConfig, pieces, requestId } = data;

  try {
    const solution = solve(boardConfig, pieces);
    self.postMessage({ requestId, solution, error: null });
  } catch (err) {
    self.postMessage({ requestId, solution: null, error: err.message });
  }
};
