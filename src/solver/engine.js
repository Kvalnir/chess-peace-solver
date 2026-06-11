// ─────────────────────────────────────────────────────────────────────────────
// Chess Peace Solver Engine
// ─────────────────────────────────────────────────────────────────────────────

export const PIECE_NAMES = {
  K: "King", Q: "Queen", R: "Rook",
  B: "Bishop", N: "Knight", P: "Pawn",
};

export const PIECE_SYMBOLS = {
  WK: "♔", WQ: "♕", WR: "♖", WB: "♗", WN: "♘", WP: "♙",
  BK: "♚", BQ: "♛", BR: "♜", BB: "♝", BN: "♞", BP: "♟",
};

export const PIECE_WEIGHTS = { Q: 6, R: 5, B: 4, K: 3, N: 2, P: 1 };

export const ALL_KINDS = ["K", "Q", "R", "B", "N", "P"];

const coordKey = (r, c) => (r << 4) | c;

export class Board {
  constructor(rows, cols, blocked = [], islandsMode = false, twoColour = false) {
    this.rows        = rows;
    this.cols        = cols;
    this.islandsMode = islandsMode;
    this.twoColour   = twoColour;
    this.blockedSet  = new Set(blocked.map(([r, c]) => coordKey(r, c)));

    this.accessible = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (!this.blockedSet.has(coordKey(r, c)))
          this.accessible.push([r, c]);

    this.islandMap = new Map();
    if (islandsMode) this._buildIslands();

    this.rayCache = new Map();
    this._precomputeRays();
  }

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
          const nr = r+dr, nc = c+dc, nk = coordKey(nr, nc);
          if (!visited.has(nk) && this._inBounds(nr,nc) && !this.blockedSet.has(nk)) {
            visited.add(nk); queue.push([nr, nc]);
          }
        }
      }
      islandId++;
    }
  }

  _inBounds(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols; }

  _precomputeRays() {
    for (const [sr, sc] of this.accessible) {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const squares = [];
        let r = sr, c = sc;
        while (true) {
          r += dr; c += dc;
          if (!this._inBounds(r,c) || this.blockedSet.has(coordKey(r,c))) break;
          squares.push([r, c]);
        }
        this.rayCache.set(`${coordKey(sr,sc)},${dr},${dc}`, squares);
      }
    }
  }

  _rayContains(sr, sc, dr, dc, tr, tc) {
    const ray = this.rayCache.get(`${coordKey(sr,sc)},${dr},${dc}`);
    if (!ray) return false;
    for (const [r,c] of ray) if (r===tr && c===tc) return true;
    return false;
  }

  attacks(kind, colour, r1, c1, r2, c2) {
    if (this.islandsMode &&
        this.islandMap.get(coordKey(r1,c1)) !== this.islandMap.get(coordKey(r2,c2)))
      return false;
    switch (kind) {
      case "K": return Math.max(Math.abs(r2-r1), Math.abs(c2-c1)) === 1;
      case "N": { const dr=Math.abs(r2-r1),dc=Math.abs(c2-c1); return (dr===1&&dc===2)||(dr===2&&dc===1); }
      case "R":
        if (r1===r2) return this._rayContains(r1,c1,0,c2>c1?1:-1,r2,c2);
        if (c1===c2) return this._rayContains(r1,c1,r2>r1?1:-1,0,r2,c2);
        return false;
      case "B":
        if (Math.abs(r2-r1)!==Math.abs(c2-c1)) return false;
        return this._rayContains(r1,c1,r2>r1?1:-1,c2>c1?1:-1,r2,c2);
      case "Q":
        return this.attacks("R",colour,r1,c1,r2,c2)||this.attacks("B",colour,r1,c1,r2,c2);
      case "P":
        return r2===r1+(colour==="B"?1:-1) && Math.abs(c2-c1)===1;
      default: return false;
    }
  }

  threatens(kA, cA, r1, c1, kB, cB, r2, c2) {
    if (this.twoColour && cA === cB) return false;
    return this.attacks(kA,cA,r1,c1,r2,c2) || this.attacks(kB,cB,r2,c2,r1,c1);
  }
}

// ── Solver ────────────────────────────────────────────────────────────────────
// boardConfig.presetSquares — if non-empty, every preset square must be occupied
// in the final solution, but pieces may be placed on any accessible square.
// Preset squares are tried first; branches where empty presets exceed pieces
// remaining are pruned immediately.

export function solve(boardConfig, pieces) {
  const { rows, cols, blocked, islandsMode, twoColour, presetSquares = [] } = boardConfig;
  const board = new Board(rows, cols, blocked, islandsMode, twoColour);

  const fixedIdx = [], freeIdx = [];
  for (let i = 0; i < pieces.length; i++)
    (pieces[i].fixedPos !== null ? fixedIdx : freeIdx).push(i);

  // Heavier pieces first to fail fast; kind+colour tiebreakers group identical
  // pieces together so the symmetry-breaking rule below can apply to them.
  freeIdx.sort((a, b) =>
    (PIECE_WEIGHTS[pieces[b].kind] || 0) - (PIECE_WEIGHTS[pieces[a].kind] || 0) ||
    (pieces[a].kind < pieces[b].kind ? -1 : pieces[a].kind > pieces[b].kind ? 1 : 0) ||
    (pieces[a].colour < pieces[b].colour ? -1 : pieces[a].colour > pieces[b].colour ? 1 : 0)
  );

  const fixedSquareKeys = new Set(fixedIdx.map(i => coordKey(...pieces[i].fixedPos)));

  const hasPresets = presetSquares.length > 0;
  // Exclude squares already occupied by fixed pieces — usedKeys only tracks free pieces,
  // so the base-case check and filledPresets counter must only cover unfilled presets.
  const presetKeySet = hasPresets
    ? new Set(presetSquares.map(([r,c]) => coordKey(r,c)).filter(k => !fixedSquareKeys.has(k)))
    : null;
  const presetCount = hasPresets ? presetKeySet.size : 0;

  const available = board.accessible.filter(([r, c]) => !fixedSquareKeys.has(coordKey(r, c)));

  if (hasPresets) {
    available.sort((a, b) => {
      const aP = presetKeySet.has(coordKey(...a)) ? 0 : 1;
      const bP = presetKeySet.has(coordKey(...b)) ? 0 : 1;
      return aP - bP;
    });
  }

  let filledPresets = 0;

  const placedR = new Int8Array(pieces.length).fill(-1);
  const placedC = new Int8Array(pieces.length).fill(-1);
  // available[] index chosen at each depth — drives the symmetry-breaking rule
  const availIdxAt = new Int16Array(freeIdx.length);
  const usedKeys = new Set();
  let solution = null;

  function ok(pieceIdx, r, c) {
    const p = pieces[pieceIdx];
    for (const fi of fixedIdx) {
      const fp = pieces[fi], [fr,fc] = fp.fixedPos;
      if (board.threatens(p.kind,p.colour,r,c,fp.kind,fp.colour,fr,fc)) return false;
    }
    for (const pi of freeIdx) {
      if (placedR[pi]===-1) continue;
      const pp = pieces[pi];
      if (board.threatens(p.kind,p.colour,r,c,pp.kind,pp.colour,placedR[pi],placedC[pi])) return false;
    }
    return true;
  }

  function backtrack(depth) {
    if (solution) return;
    if (hasPresets && (presetCount - filledPresets) > (freeIdx.length - depth)) return;
    if (depth === freeIdx.length) {
      if (hasPresets) {
        for (const k of presetKeySet) if (!usedKeys.has(k)) return;
      }
      const result = {};
      for (const fi of fixedIdx) result[fi] = pieces[fi].fixedPos;
      for (const pi of freeIdx)  result[pi] = [placedR[pi], placedC[pi]];
      solution = result;
      return;
    }
    const pieceIdx = freeIdx[depth];
    // Symmetry breaking: identical pieces are interchangeable, so force them
    // into increasing board order — any solution can be reordered to satisfy
    // this, and it prunes the (k!−1)/k! redundant permutations of k copies.
    let startIdx = 0;
    if (depth > 0) {
      const prev = pieces[freeIdx[depth - 1]];
      const cur  = pieces[pieceIdx];
      if (prev.kind === cur.kind && prev.colour === cur.colour)
        startIdx = availIdxAt[depth - 1] + 1;
    }
    for (let ai = startIdx; ai < available.length; ai++) {
      const [r, c] = available[ai];
      const k = coordKey(r,c);
      if (usedKeys.has(k) || !ok(pieceIdx,r,c)) continue;
      const isPreset = hasPresets && presetKeySet.has(k);
      placedR[pieceIdx]=r; placedC[pieceIdx]=c; usedKeys.add(k);
      availIdxAt[depth] = ai;
      if (isPreset) filledPresets++;
      backtrack(depth+1);
      if (solution) return;
      placedR[pieceIdx]=-1; placedC[pieceIdx]=-1; usedKeys.delete(k);
      if (isPreset) filledPresets--;
    }
  }

  backtrack(0);
  return solution;
}
