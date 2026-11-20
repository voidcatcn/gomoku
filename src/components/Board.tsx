import { useMemo, useRef, useState } from "react";
import { COLUMN_LETTERS, indexOf, pointName, starPoints } from "@/game/logic";
import type { Cell, Move, Stone } from "@/game/types";

const CELL = 40;
const MARGIN = 40;
const STONE_RADIUS = 16.6;
const HOVER_TOLERANCE = 0.72;

interface BoardProps {
  size: number;
  board: Cell[];
  moves: Move[];
  current: Stone;
  winningLine: number[] | null;
  interactive: boolean;
  previewIndex: number | null;
  onPlay: (index: number) => void;
}

export function Board({
  size,
  board,
  moves,
  current,
  winningLine,
  interactive,
  previewIndex,
  onPlay,
}: BoardProps) {
  const view = size * CELL + MARGIN * 2;
  const center = Math.floor((size * size) / 2);

  const [hover, setHover] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(center);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const winning = useMemo(() => new Set(winningLine ?? []), [winningLine]);
  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  const stars = useMemo(() => new Set(starPoints(size)), [size]);

  const xOf = (index: number) => MARGIN + (index % size) * CELL;
  const yOf = (index: number) => MARGIN + Math.floor(index / size) * CELL;

  const nearestPoint = (clientX: number, clientY: number): number | null => {
    const surface = surfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = view / rect.width;
    const scaleY = view / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const pad = CELL / 2 - 1;
    if (
      x < MARGIN - pad ||
      x > view - MARGIN + pad ||
      y < MARGIN - pad ||
      y > view - MARGIN + pad
    ) {
      return null;
    }
    const col = Math.round((x - MARGIN) / CELL);
    const row = Math.round((y - MARGIN) / CELL);

    if (row < 0 || row >= size || col < 0 || col >= size) return null;

    const px = MARGIN + col * CELL;
    const py = MARGIN + row * CELL;
    if (Math.abs(x - px) > CELL * HOVER_TOLERANCE || Math.abs(y - py) > CELL * HOVER_TOLERANCE) {
      return null;
    }

    return indexOf(row, col, size);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const index = nearestPoint(event.clientX, event.clientY);
    if (index === null) return;
    setHover(null);
    onPlay(index);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || event.pointerType !== "mouse") return;
    const index = nearestPoint(event.clientX, event.clientY);
    setHover(index !== null && board[index] === 0 ? index : null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!interactive) return;
    const row = Math.floor(index / size);
    const col = index % size;
    let nextRow = row;
    let nextCol = col;

    switch (event.key) {
      case "ArrowUp":
        nextRow = Math.max(0, row - 1);
        break;
      case "ArrowDown":
        nextRow = Math.min(size - 1, row + 1);
        break;
      case "ArrowLeft":
        nextCol = Math.max(0, col - 1);
        break;
      case "ArrowRight":
        nextCol = Math.min(size - 1, col + 1);
        break;
      case "Home":
        nextCol = 0;
        break;
      case "End":
        nextCol = size - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = indexOf(nextRow, nextCol, size);
    setFocusIndex(next);
    buttonsRef.current[next]?.focus();
    setHover(board[next] === 0 ? next : null);
  };

  const hoverIndex = interactive && hover !== null && board[hover] === 0 ? hover : null;
  const previewOnStone =
    previewIndex !== null && previewIndex >= 0 && board[previewIndex] !== 0 ? previewIndex : null;
  const previewOnEmpty =
    previewIndex !== null && previewIndex >= 0 && board[previewIndex] === 0 ? previewIndex : null;

  const winStart = winningLine && winningLine.length > 1 ? winningLine[0] : null;
  const winEnd = winningLine && winningLine.length > 1 ? winningLine[winningLine.length - 1] : null;

  return (
    <div
      ref={surfaceRef}
      className="board-surface group/board relative aspect-square w-full touch-manipulation overflow-hidden border border-[color-mix(in_oklab,var(--board-line)_48%,transparent)] select-none data-[interactive=true]:cursor-crosshair"
      role="group"
      aria-label={`${size} 路五子棋棋盘`}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
      data-interactive={interactive ? "true" : "false"}
    >
      <svg
        viewBox={`0 0 ${view} ${view}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="stone-black-fill" cx="34%" cy="27%" r="82%">
            <stop offset="0%" stopColor="var(--stone-black-hi)" />
            <stop offset="42%" stopColor="var(--stone-black)" />
            <stop offset="100%" stopColor="#060504" />
          </radialGradient>
          <radialGradient id="stone-white-fill" cx="34%" cy="27%" r="84%">
            <stop offset="0%" stopColor="var(--stone-white-hi)" />
            <stop offset="58%" stopColor="var(--stone-white)" />
            <stop offset="100%" stopColor="#b7a88f" />
          </radialGradient>
          <filter id="stone-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="2.1"
              stdDeviation="2"
              floodColor="#140e06"
              floodOpacity="0.38"
            />
          </filter>
          <filter id="ghost-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow
              dx="0"
              dy="1.8"
              stdDeviation="1.5"
              floodColor="#140e06"
              floodOpacity="0.2"
            />
          </filter>
        </defs>

        <g shapeRendering="geometricPrecision">
          {Array.from({ length: size }, (_, col) => {
            const x = MARGIN + col * CELL;
            return (
              <g key={`col-${col}`}>
                <line
                  x1={x}
                  y1={MARGIN}
                  x2={x}
                  y2={view - MARGIN}
                  stroke="var(--board-line)"
                  strokeWidth={col === 0 || col === size - 1 ? 1.6 : 1}
                  opacity={col === 0 || col === size - 1 ? 0.86 : 0.63}
                />
                <text
                  x={x}
                  y={MARGIN / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--board-line)"
                  fillOpacity="0.82"
                  fontSize="15"
                  letterSpacing="0.08em"
                >
                  {COLUMN_LETTERS[col]}
                </text>
              </g>
            );
          })}

          {Array.from({ length: size }, (_, row) => {
            const y = MARGIN + row * CELL;
            return (
              <g key={`row-${row}`}>
                <line
                  x1={MARGIN}
                  y1={y}
                  x2={view - MARGIN}
                  y2={y}
                  stroke="var(--board-line)"
                  strokeWidth={row === 0 || row === size - 1 ? 1.6 : 1}
                  opacity={row === 0 || row === size - 1 ? 0.86 : 0.63}
                />
                <text
                  x={MARGIN / 2}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--board-line)"
                  fillOpacity="0.78"
                  fontSize="13.5"
                  letterSpacing="0.04em"
                >
                  {size - row}
                </text>
              </g>
            );
          })}

          {Array.from(stars).map((index) => (
            <circle
              key={`star-${index}`}
              cx={xOf(index)}
              cy={yOf(index)}
              r={3}
              fill="var(--board-star)"
              opacity="0.82"
            />
          ))}

          {hoverIndex !== null && (
            <g opacity="0.52" filter="url(#ghost-shadow)">
              <circle
                cx={xOf(hoverIndex)}
                cy={yOf(hoverIndex)}
                r={STONE_RADIUS}
                fill={current === 1 ? "var(--stone-black)" : "var(--stone-white)"}
                opacity="0.52"
              />
              <circle
                cx={xOf(hoverIndex)}
                cy={yOf(hoverIndex)}
                r={STONE_RADIUS - 0.5}
                fill="none"
                stroke="var(--seal)"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
            </g>
          )}

          {moves.map((move) => {
            const isNewest = lastMove?.number === move.number;
            return (
              <g
                key={`${move.number}-${move.index}`}
                className={isNewest ? "animate-stone" : undefined}
              >
                <circle
                  cx={xOf(move.index)}
                  cy={yOf(move.index)}
                  r={STONE_RADIUS}
                  fill={move.player === 1 ? "url(#stone-black-fill)" : "url(#stone-white-fill)"}
                  stroke={move.player === 1 ? "rgba(255,255,255,0.14)" : "rgba(78,62,40,0.38)"}
                  strokeWidth="0.8"
                  filter="url(#stone-shadow)"
                />
                <ellipse
                  cx={xOf(move.index) - 4.5}
                  cy={yOf(move.index) - 5.4}
                  rx="5.2"
                  ry="2.2"
                  fill="#ffffff"
                  opacity={move.player === 1 ? 0.11 : 0.42}
                  transform={`rotate(-36 ${xOf(move.index)} ${yOf(move.index)})`}
                />
              </g>
            );
          })}

          {winStart !== null && winEnd !== null && (
            <g>
              <line
                x1={xOf(winStart)}
                y1={yOf(winStart)}
                x2={xOf(winEnd)}
                y2={yOf(winEnd)}
                stroke="var(--seal)"
                strokeWidth="4.6"
                strokeOpacity="0.14"
                strokeLinecap="square"
              />
              <line
                x1={xOf(winStart)}
                y1={yOf(winStart)}
                x2={xOf(winEnd)}
                y2={yOf(winEnd)}
                stroke="var(--seal)"
                strokeWidth="2"
                strokeOpacity="0.82"
                strokeLinecap="square"
                pathLength={1}
                className="animate-win-line"
                style={
                  {
                    strokeDasharray: 1,
                    "--line-length": 1,
                  } as React.CSSProperties
                }
              />
            </g>
          )}

          {winningLine?.map((index) => (
            <circle
              key={`win-${index}`}
              cx={xOf(index)}
              cy={yOf(index)}
              r={STONE_RADIUS + 3.2}
              fill="none"
              stroke="var(--seal)"
              strokeWidth="1.35"
              opacity="0.9"
            />
          ))}

          {lastMove && !winning.has(lastMove.index) && (
            <circle
              cx={xOf(lastMove.index)}
              cy={yOf(lastMove.index)}
              r={3.2}
              fill="var(--seal)"
              stroke={lastMove.player === 1 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.5)"}
              strokeWidth="0.6"
            />
          )}

          {previewOnStone !== null && (
            <circle
              cx={xOf(previewOnStone)}
              cy={yOf(previewOnStone)}
              r={STONE_RADIUS + 4.5}
              fill="none"
              stroke="var(--seal)"
              strokeWidth="1.4"
              strokeDasharray="3 2.5"
              opacity="0.85"
            />
          )}

          {previewOnEmpty !== null && (
            <g opacity="0.72">
              <rect
                x={xOf(previewOnEmpty) - 18.5}
                y={yOf(previewOnEmpty) - 18.5}
                width="37"
                height="37"
                fill="none"
                stroke="var(--seal)"
                strokeWidth="1.1"
              />
              <circle cx={xOf(previewOnEmpty)} cy={yOf(previewOnEmpty)} r="2" fill="var(--seal)" />
            </g>
          )}
        </g>
      </svg>

      <div className="absolute inset-0">
        {Array.from({ length: size * size }, (_, index) => {
          const row = Math.floor(index / size);
          const col = index % size;
          const occupant = board[index];
          const label = pointName(index, size);
          const state = occupant === 0 ? "空位" : occupant === 1 ? "黑子" : "白子";
          return (
            <button
              key={index}
              ref={(element) => {
                buttonsRef.current[index] = element;
              }}
              type="button"
              className="board-point absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${((MARGIN + col * CELL) / view) * 100}%`,
                top: `${((MARGIN + row * CELL) / view) * 100}%`,
                width: `${(CELL / view) * 100}%`,
                height: `${(CELL / view) * 100}%`,
              }}
              aria-label={`${label}，${state}${interactive ? "，可落子" : ""}`}
              disabled={!interactive}
              tabIndex={interactive ? (index === focusIndex ? 0 : -1) : -1}
              data-point={index}
              onClick={(event) => {
                event.stopPropagation();
                if (interactive) onPlay(index);
              }}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          );
        })}
      </div>
    </div>
  );
}
