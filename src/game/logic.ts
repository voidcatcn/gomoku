import type { Cell, GameState, Move, Stone } from "./types";

export const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function createBoard(size: number): Cell[] {
  return new Array<Cell>(size * size).fill(0);
}

export function opponent(player: Stone): Stone {
  return player === 1 ? 2 : 1;
}

export function indexOf(row: number, col: number, size: number): number {
  return row * size + col;
}

export function rowOf(index: number, size: number): number {
  return Math.floor(index / size);
}

export function colOf(index: number, size: number): number {
  return index % size;
}

export function isInside(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

/**
 * Returns the complete contiguous run (five or more) created by the stone at
 * `index`, or null when the move is not winning. The board itself is unchanged.
 */
export function winningLineAt(
  board: ArrayLike<number>,
  size: number,
  index: number,
  player: Stone,
): number[] | null {
  const row = rowOf(index, size);
  const col = colOf(index, size);

  for (const [dr, dc] of DIRECTIONS) {
    const run: number[] = [index];

    for (let step = 1; step < size; step += 1) {
      const nextRow = row + dr * step;
      const nextCol = col + dc * step;
      if (!isInside(nextRow, nextCol, size)) break;
      if (board[indexOf(nextRow, nextCol, size)] !== player) break;
      run.push(indexOf(nextRow, nextCol, size));
    }

    for (let step = 1; step < size; step += 1) {
      const nextRow = row - dr * step;
      const nextCol = col - dc * step;
      if (!isInside(nextRow, nextCol, size)) break;
      if (board[indexOf(nextRow, nextCol, size)] !== player) break;
      run.unshift(indexOf(nextRow, nextCol, size));
    }

    if (run.length >= 5) return run;
  }

  return null;
}

export function createGame(size = 15): GameState {
  return {
    size,
    board: createBoard(size),
    moves: [],
    turn: 1,
    status: "playing",
    winner: null,
    winningLine: null,
    startedAt: Date.now(),
    endedAt: null,
  };
}

export interface PlaceResult {
  state: GameState;
  move: Move;
  winningLine: number[] | null;
}

/**
 * Places a stone immutably. Returns null if the move is illegal.
 */
export function placeStone(
  state: GameState,
  index: number,
  player: Stone = state.turn,
): PlaceResult | null {
  if (state.status !== "playing") return null;
  if (player !== state.turn) return null;
  if (index < 0 || index >= state.board.length) return null;
  if (state.board[index] !== 0) return null;

  const board = state.board.slice();
  board[index] = player;
  const winningLine = winningLineAt(board, state.size, index, player);
  const move: Move = { index, player, number: state.moves.length + 1 };
  const full = state.moves.length + 1 >= state.size * state.size;

  return {
    move,
    winningLine,
    state: {
      ...state,
      board,
      moves: [...state.moves, move],
      turn: player === 1 ? 2 : 1,
      status: winningLine ? "won" : full ? "draw" : "playing",
      winner: winningLine ? player : null,
      winningLine,
      endedAt: winningLine || full ? Date.now() : null,
    },
  };
}

export function undoMove(state: GameState): GameState {
  if (state.moves.length === 0) return state;
  const moves = state.moves.slice(0, -1);
  const board = state.board.slice();
  const removed = state.moves[state.moves.length - 1];
  board[removed.index] = 0;

  return {
    ...state,
    board,
    moves,
    turn: removed.player,
    status: "playing",
    winner: null,
    winningLine: null,
    endedAt: null,
  };
}

export function pointName(index: number, size: number): string {
  const row = rowOf(index, size);
  const col = colOf(index, size);
  return `${COLUMN_LETTERS[col] ?? "?"}${size - row}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function starPoints(size: number): number[] {
  if (size === 15) {
    return [
      indexOf(3, 3, size),
      indexOf(3, 11, size),
      indexOf(7, 7, size),
      indexOf(11, 3, size),
      indexOf(11, 11, size),
    ];
  }
  if (size === 19) {
    const lines = [3, 9, 15];
    return lines.flatMap((row) => lines.map((col) => indexOf(row, col, size)));
  }
  return [];
}

/**
 * Cells within `radius` of a stone. Used by the engine and the human-friendly
 * "nearby move" hint.
 */
export function candidateCells(board: readonly Cell[], size: number, radius = 2): number[] {
  const seen = new Uint8Array(board.length);
  const result: number[] = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === 0) continue;
    const row = rowOf(index, size);
    const col = colOf(index, size);

    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (!isInside(r, c, size)) continue;
        const next = indexOf(r, c, size);
        if (board[next] !== 0 || seen[next]) continue;
        seen[next] = 1;
        result.push(next);
      }
    }
  }

  return result;
}
