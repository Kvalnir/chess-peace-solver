// ─────────────────────────────────────────────────────────────────────────────
// Chess Peace Solver Engine
// Ported from chess_peace_solver.ipynb (Python → JavaScript)
// ─────────────────────────────────────────────────────────────────────────────

export const PIECE_NAMES = {
  K: "King", Q: "Queen", R: "Rook",
  B: "Bishop", N: "Knight", P: "Pawn",
};

export const PIECE_SYMBOLS = {
  WK: "♔", WQ: "♕", WR: "♖", WB: "♗", WN: "♘", WP: "♙",
  BK: "♚", BQ: "♛", BR: "♜", BB: "♝", BN: "♞", BP: "♟",
};

// Heuristic: heavier pieces constrain the board more — place them first
export const PIECE_WEIGHTS = { Q: 6, R: 5, B: 4, K: 3, N: 2, P: 1 };

export const ALL_KINDS  = ["K", "Q", "R", "B", "N", "P"];
export const ALL_COLOURS = ["W", "B"];

// Fast integer key for coordinates on boards ≤ 16 wide
const coordKey = (r, c) => (r << 4) | c;

// ── Board ─────────────────────────────────────────────────────────────────────

export class Board {
  /**
   * @param {number}   rows
   * @param {number}   cols
   * @param {Array}    blocked      — array of [r, c] pairs
   * @param {boolean}  islandsMode  — threats limited to same island
   * @param {boolean}  twoColour    — same-colour pieces are allies (don't threaten)
   */
  constructor(rows, cols, blocked = [], islandsMode = false, twoColour = false) {
    this.rows        = rows;
    this.cols        = cols;
    this.islandsMode = islandsMode;
    this.twoColour   = twoColour;

    // Blocked squares as integer-key Set for O(1) lookup
    this.blockedSet = new Set(blocked.map(([r, c]) => coordKey(r, c)));

    // All non-blocked squares
    this.accessible = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!this.blockedSet.has(coordKey(r, c))) {
          this.accessible.push([r, c]);
        }
      }
    }

    // Island map: coordKey → islandId (only populated in Islands mode)
    this.islandMap = new Map();
    if (islandsMode) this._buildIslands();

    // Precomputed rays: "srcKey,dr,dc" → [[r,c], ...]
    this.rayCache = new Map();
    this._precomputeRays();
  }

  // BFS flood-fill to assign island IDs to each accessible square
  _buildIslands() {
    const visited = new Set();
    let islandId = 0;

    for (const [sr, sc] of this.accessible) {
      const sk = coordKey(sr, sc);
      if (visited.has(sk)) continue;

      const queue = [[sr, sc]];
      visited.add(sk);

      for (let qi = 0; qi < queue.length; qi++) {
        const [r, c] = queue[qi];
        this.islandMap.set(coordKey(r, c), islandId);

        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr, nc = c + dc;
          const nk = coordKey(nr, nc);
          if (!visited.has(nk) && this._inBounds(nr, nc) && !this.blockedSet.has(nk)) {
            visited.add(nk);
            queue.push([nr, nc]);
          }
        }
      }
      islandId++;
    }
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  // Build all sliding-piece rays once at construction time
  _precomputeRays() {
    const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

    for (const [sr, sc] of this.accessible) {
      const srcKey = coordKey(sr, sc);
      for (const [dr, dc] of DIRS) {
        const squares = [];
        let r = sr, c = sc;
        while (true) {
          r += dr; c += dc;
          if (!this._inBounds(r, c) || this.blockedSet.has(coordKey(r, c))) break;
          squares.push([r, c]);
        }
        this.rayCache.set(`${srcKey},${dr},${dc}`, squares);
      }
    }
  }

  _rayContains(sr, sc, dr, dc, tr, tc) {
    const ray = this.rayCache.get(`${coordKey(sr, sc)},${dr},${dc}`);
    if (!ray) return false;
    for (const [r, c] of ray) {
      if (r === tr && c === tc) return true;
    }
    return false;
  }

  /**
   * Returns true if piece at (r1,c1) attacks (r2,c2).
   * Does NOT check two-colour ally exemption.
   */
  attacks(kind, colour, r1, c1, r2, c2) {
    if (this.islandsMode) {
      if (this.islandMap.get(coordKey(r1, c1)) !== this.islandMap.get(coordKey(r2, c2))) {
        return false;
      }
    }

    switch (kind) {
      case "K":
        return Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) === 1;

      case "N": {
        const dr = Math.abs(r2 - r1), dc = Math.abs(c2 - c1);
        return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
      }

      case "R":
        if (r1 === r2) return this._rayContains(r1, c1, 0, c2 > c1 ? 1 : -1, r2, c2);
        if (c1 === c2) return this._rayContains(r1, c1, r2 > r1 ? 1 : -1, 0, r2, c2);
        return false;

      case "B":
        if (Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return false;
        return this._rayContains(r1, c1, r2 > r1 ? 1 : -1, c2 > c1 ? 1 : -1, r2, c2);

      case "Q":
        return (
          this.attacks("R", colour, r1, c1, r2, c2) ||
          this.attacks("B", colour, r1, c1, r2, c2)
        );

      case "P":
        // Pawns capture diagonally forward (Black moves down, White moves up)
        return (
          r2 === r1 + (colour === "B" ? 1 : -1) &&
          Math.abs(c2 - c1) === 1
        );

      default:
        return false;
    }
  }

  /**
   * Returns true if placing A at (r1,c1) and B at (r2,c2) is a conflict.
   * In two-colour mode, allies (same colour) coexist peacefully.
   */
  threatens(kindA, colA, r1, c1, kindB, colB, r2, c2) {
    if (this.twoColour && colA === colB) return false;
    return (
      this.attacks(kindA, colA, r1, c1, r2, c2) ||
      this.attacks(kindB, colB, r2, c2, r1, c1)
    );
  }
}

// ── Solver ────────────────────────────────────────────────────────────────────

/**
 * Find the first valid placement of all pieces.
 *
 * @param {object} boardConfig — { rows, cols, blocked, islandsMode, twoColour }
 * @param {Array}  pieces      — [{ kind, colour, fixedPos: [r,c]|null }, ...]
 * @returns {object|null}      — { pieceIndex: [r, c] } or null if unsolvable
 */
export function solve(boardConfig, pieces) {
  const { rows, cols, blocked, islandsMode, twoColour } = boardConfig;
  const board = new Board(rows, cols, blocked, islandsMode, twoColour);

  // Split into fixed (preset positions) and free (to be placed by solver)
  const fixedIdx = [];
  const freeIdx  = [];
  for (let i = 0; i < pieces.length; i++) {
    (pieces[i].fixedPos !== null ? fixedIdx : freeIdx).push(i);
  }

  // Sort free pieces heaviest-first so we prune the search tree early
  freeIdx.sort(
    (a, b) => (PIECE_WEIGHTS[pieces[b].kind] || 0) - (PIECE_WEIGHTS[pieces[a].kind] || 0)
  );

  // Squares that fixed pieces occupy are unavailable for free pieces
  const fixedSquareKeys = new Set(
    fixedIdx.map((i) => coordKey(...pieces[i].fixedPos))
  );
  const available = board.accessible.filter(
    ([r, c]) => !fixedSquareKeys.has(coordKey(r, c))
  );

  // Placement arrays (index = piece index, value = row/col or -1 if unplaced)
  const placedR = new Int8Array(pieces.length).fill(-1);
  const placedC = new Int8Array(pieces.length).fill(-1);
  const usedKeys = new Set();

  let solution = null;

  // Check whether placing piece[pieceIdx] at (r,c) conflicts with anything placed so far
  function ok(pieceIdx, r, c) {
    const p = pieces[pieceIdx];

    for (const fi of fixedIdx) {
      const fp = pieces[fi];
      const [fr, fc] = fp.fixedPos;
      if (board.threatens(p.kind, p.colour, r, c, fp.kind, fp.colour, fr, fc)) return false;
    }

    for (const pi of freeIdx) {
      if (placedR[pi] === -1) continue; // not yet placed
      const pp = pieces[pi];
      if (board.threatens(p.kind, p.colour, r, c, pp.kind, pp.colour, placedR[pi], placedC[pi])) {
        return false;
      }
    }

    return true;
  }

  function backtrack(depth) {
    if (solution) return;

    if (depth === freeIdx.length) {
      // All free pieces placed — record solution
      const result = {};
      for (const fi of fixedIdx) result[fi] = pieces[fi].fixedPos;
      for (const pi of freeIdx)  result[pi] = [placedR[pi], placedC[pi]];
      solution = result;
      return;
    }

    const pieceIdx = freeIdx[depth];

    for (const [r, c] of available) {
      const k = coordKey(r, c);
      if (usedKeys.has(k) || !ok(pieceIdx, r, c)) continue;

      placedR[pieceIdx] = r;
      placedC[pieceIdx] = c;
      usedKeys.add(k);

      backtrack(depth + 1);

      if (solution) return; // found — unwind immediately

      placedR[pieceIdx] = -1;
      placedC[pieceIdx] = -1;
      usedKeys.delete(k);
    }
  }

  backtrack(0);
  return solution; // null if no valid placement exists
}
