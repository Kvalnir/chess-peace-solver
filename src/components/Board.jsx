import { useRef, useCallback } from "react";
import { PIECE_SYMBOLS } from "../solver/engine.js";

// ── Board ──────────────────────────────────────────────────────────────────────
// Handles:
//   • Tap-to-cycle: empty→place piece, piece→erase, blocked→unblock
//   • Drag-paint: hold & drag to paint multiple cells with the same action
//     determined from the first cell touched.
// ── ───────────────────────────────────────────────────────────────────────────

export default function Board({
  boardSize,
  cells,
  solutionMap,
  activeTool,
  selectedKind,
  selectedColour,
  onCellAction,
}) {
  const gridRef  = useRef(null);
  const paintRef = useRef(null); // { action, visited: Set<"r,c"> }

  // ── Determine what action to apply on a cell ─────────────────
  const getAction = useCallback(
    (r, c) => {
      const key = `${r},${c}`;
      const current = cells[key];

      if (activeTool === "erase") return "erase";

      if (activeTool === "block") {
        return current?.type === "blocked" ? "erase" : "block";
      }

      // "place" tool
      if (current?.type === "fixed") return "erase"; // tap piece to remove
      if (current?.type === "blocked") return null;   // can't place on blocked
      return "place";
    },
    [activeTool, cells]
  );

  // ── Find which board cell is under a pointer coordinate ──────
  const getCellAt = useCallback((clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest?.("[data-row]");
    if (!cell) return null;
    return {
      r: parseInt(cell.dataset.row, 10),
      c: parseInt(cell.dataset.col, 10),
    };
  }, []);

  // ── Pointer down — start paint session ───────────────────────
  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const cell = getCellAt(e.clientX, e.clientY);
      if (!cell) return;

      // Capture so we keep receiving pointermove even outside the grid
      gridRef.current?.setPointerCapture(e.pointerId);

      const { r, c } = cell;
      const cellKey  = `${r},${c}`;
      const action   = getAction(r, c);
      if (!action) return;

      paintRef.current = { action, visited: new Set([cellKey]) };
      onCellAction(r, c, action);
    },
    [getCellAt, getAction, onCellAction]
  );

  // ── Pointer move — paint subsequent cells ─────────────────────
  const handlePointerMove = useCallback(
    (e) => {
      if (!paintRef.current) return;
      const cell = getCellAt(e.clientX, e.clientY);
      if (!cell) return;

      const { r, c } = cell;
      const cellKey  = `${r},${c}`;
      if (paintRef.current.visited.has(cellKey)) return;

      paintRef.current.visited.add(cellKey);
      onCellAction(r, c, paintRef.current.action);
    },
    [getCellAt, onCellAction]
  );

  // ── Pointer up / cancel — end paint ──────────────────────────
  const handlePointerUp = useCallback(() => {
    paintRef.current = null;
  }, []);

  // ── Build cell display data ───────────────────────────────────
  const renderCell = (r, c) => {
    const cellKey    = `${r},${c}`;
    const cellData   = cells[cellKey];
    const solPiece   = solutionMap[cellKey];
    const isLight    = (r + c) % 2 === 0;

    // Determine CSS classes and content
    let className = `board-cell ${isLight ? "light" : "dark"}`;
    let content   = null;

    if (cellData?.type === "blocked") {
      className += " blocked";
      content = <span style={{ fontSize: "0.6em", opacity: 0.5 }}>▪</span>;

    } else if (solPiece) {
      className += " solution-piece";
      content = (
        <span className="piece-glyph" style={{ lineHeight: 1 }}>
          {solPiece.symbol}
        </span>
      );

    } else if (cellData?.type === "fixed") {
      className += " fixed-piece";
      const sym = PIECE_SYMBOLS[cellData.colour + cellData.kind];
      content = (
        <span className="piece-glyph" style={{ lineHeight: 1 }}>
          {sym}
        </span>
      );

    } else {
      // Empty cell — render invisible dot to flush GPU glyph cache
      // (prevents ghost glyphs after piece removal on iOS)
      content = (
        <span
          aria-hidden="true"
          style={{ color: "transparent", fontSize: "4px", userSelect: "none" }}
        >
          ·
        </span>
      );
    }

    return (
      <div
        key={cellKey}
        className={className}
        data-row={r}
        data-col={c}
        role="gridcell"
        aria-label={`${String.fromCharCode(65 + c)}${boardSize - r}`}
      >
        {content}
      </div>
    );
  };

  // ── Grid column template ──────────────────────────────────────
  const colTemplate = `repeat(${boardSize}, var(--cell))`;

  return (
    <div
      ref={gridRef}
      className="board-grid"
      role="grid"
      aria-label="Chess board"
      style={{
        // CSS variable so --cell can divide correctly
        "--board-cols": boardSize,
        gridTemplateColumns: colTemplate,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {Array.from({ length: boardSize }, (_, r) =>
        Array.from({ length: boardSize }, (_, c) => renderCell(r, c))
      )}
    </div>
  );
}
