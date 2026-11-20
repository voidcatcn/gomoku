export type Stone = 1 | 2;
export type Cell = 0 | Stone;
export type Mode = "ai" | "local";
export type Difficulty = "novice" | "adept" | "master";
export type GameStatus = "playing" | "won" | "draw";

export interface Move {
  index: number;
  player: Stone;
  number: number;
}

export interface GameSettings {
  mode: Mode;
  difficulty: Difficulty;
  humanColor: Stone;
  boardSize: number;
  sound: boolean;
}

export interface GameState {
  size: number;
  board: Cell[];
  moves: Move[];
  turn: Stone;
  status: GameStatus;
  winner: Stone | null;
  winningLine: number[] | null;
  startedAt: number;
  endedAt: number | null;
}

export interface AiRequest {
  id: number;
  board: Cell[];
  size: number;
  player: Stone;
  difficulty: Difficulty;
  moveCount: number;
}

export interface AiResult {
  id: number;
  index: number;
  nodes: number;
  elapsed: number;
  depth: number;
  score: number;
}

export interface AiStats {
  nodes: number;
  elapsed: number;
  depth: number;
  score: number;
}
