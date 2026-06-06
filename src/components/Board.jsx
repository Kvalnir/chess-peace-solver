import { useRef, useCallback } from "react";
import { PIECE_SYMBOLS } from "../solver/engine.js";

export default function Board({
  boardRows, boardCols, cells, solutionMap,
  activeTool, selectedKind, selectedColour, onCellAction,
}) {
  const gridRef  = useRef(null);
  const paintRef = useRef(null);

  const getAction = useCallback((r, c) => {
    const current = cells[`${r},${c}`];
    if (activeTool === "erase")  return "erase";
    if (activeTool === "block")  return current?.type === "blocked" ? "erase" : "block";
    if (activeTool === "preset") {
      // Can only mark empty squares as preset
      if (current?.type === "fixed" || current?.type === "blocked") return null;
      return current?.type === "preset" ? "erase" : "preset";
    }
    // "place" tool
    if (current?.type === "fixed")   return "erase";
    if (current?.type === "blocked") return null;
    return "place";
  }, [activeTool, cells]);

  const getCellAt = useCallback((x, y) => {
    const el   = document.elementFromPoint(x, y);
    const cell = el?.closest?.("[data-row]");
    if (!cell) return null;
    return { r: parseInt(cell.dataset.row, 10), c: parseInt(cell.dataset.col, 10) };
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const cell = getCellAt(e.clientX, e.clientY);
    if (!cell) return;
    gridRef.current?.setPointerCapture(e.pointerId);
    const { r, c } = cell;
    const action = getAction(r, c);
    if (!action) return;
    paintRef.current = { action, visited: new Set([`${r},${c}`]) };
    onCellAction(r, c, action);
  }, [getCellAt, getAction, onCellAction]);

  const handlePointerMove = useCallback((e) => {
    if (!paintRef.current) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (!cell) return;
    const { r, c } = cell;
    const key = `${r},${c}`;
    if (paintRef.current.visited.has(key)) return;
    paintRef.current.visited.add(key);
    onCellAction(r, c, paintRef.current.action);
  }, [getCellAt, onCellAction]);

  const handlePointerUp = useCallback(() => { paintRef.current = null; }, []);

  const renderCell = (r, c) => {
    const cellKey  = `${r},${c}`;
    const cellData = cells[cellKey];
    const solPiece = solutionMap[cellKey];
    const isLight  = (r + c) % 2 === 0;
    let cls = `board-cell ${isLight ? "light" : "dark"}`;
    let content = null;

    if (cellData?.type === "blocked") {
      cls += " blocked";

    } else if (solPiece) {
      cls += ` solution-piece${solPiece.colour === "B" ? " black" : ""}`;
      content = <span className="piece-glyph">{solPiece.symbol}</span>;
    } else if (cellData?.type === "preset") {
      cls += " preset";
    } else if (cellData?.type === "fixed") {
      cls += ` fixed-piece${cellData.colour === "B" ? " black" : ""}`;
      content = <span className="piece-glyph">{PIECE_SYMBOLS[cellData.colour + cellData.kind]}</span>;
    }

    return (
      <div
        key={cellKey}
        className={cls}
        data-row={r}
        data-col={c}
        role="gridcell"
        aria-label={`${String.fromCharCode(65 + c)}${boardRows - r}`}
      >
        {content}
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className="board-grid"
      role="grid"
      style={{
        "--board-cols": boardCols,
        "--board-rows": boardRows,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {Array.from({ length: boardRows }, (_, r) =>
        Array.from({ length: boardCols }, (_, c) => renderCell(r, c))
      )}
    </div>
  );
}
