import type { AiRequest, AiResult, Difficulty, Stone } from "./types";
import { DIRECTIONS, colOf, indexOf, opponent, rowOf, winningLineAt } from "./logic";

const WIN_SCORE = 1_000_000;
const MATE = 10_000_000;
const INF = 100_000_000;
const WINDOW_SCORE = [0, 1, 14, 150, 1_800, WIN_SCORE] as const;
const SIDE_KEY = 0x9e3779b9;

const SEARCH_PROFILES: Record<
  Difficulty,
  {
    maxDepth: number;
    timeMs: number;
    rootMoves: number;
    innerMoves: number[];
    noise: number;
  }
> = {
  novice: {
    maxDepth: 0,
    timeMs: 60,
    rootMoves: 14,
    innerMoves: [14, 10, 8, 6, 6, 4],
    noise: 0.28,
  },
  adept: {
    maxDepth: 4,
    timeMs: 520,
    rootMoves: 16,
    innerMoves: [16, 12, 10, 8, 8, 6],
    noise: 0.03,
  },
  master: {
    maxDepth: 6,
    timeMs: 1_650,
    rootMoves: 18,
    innerMoves: [18, 12, 10, 8, 8, 6],
    noise: 0,
  },
};

class TimeoutError extends Error {}

interface SearchMove {
  index: number;
  score: number;
}

interface WindowLayout {
  windows: number[][];
  byCell: number[][];
}

function buildWindows(size: number): WindowLayout {
  const windows: number[][] = [];
  const byCell: number[][] = Array.from({ length: size * size }, () => []);

  for (const [dr, dc] of DIRECTIONS) {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const endRow = row + dr * 4;
        const endCol = col + dc * 4;
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

        const cells: number[] = [];
        for (let step = 0; step < 5; step += 1) {
          cells.push(indexOf(row + dr * step, col + dc * step, size));
        }
        const id = windows.length;
        windows.push(cells);
        for (const cell of cells) byCell[cell].push(id);
      }
    }
  }

  return { windows, byCell };
}

function buildNeighborhood(size: number): number[][] {
  const neighbors: number[][] = [];

  for (let index = 0; index < size * size; index += 1) {
    const row = rowOf(index, size);
    const col = colOf(index, size);
    const list: number[] = [];

    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        list.push(indexOf(r, c, size));
      }
    }
    neighbors.push(list);
  }

  return neighbors;
}

function xorshift(seed: number): () => number {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

class Engine {
  readonly size: number;
  readonly board: Uint8Array;
  readonly player: Stone;
  readonly difficulty: Difficulty;

  private readonly windows: number[][];
  private readonly windowsByCell: number[][];
  private readonly neighbors: number[][];
  private readonly blackCount: Uint8Array;
  private readonly whiteCount: Uint8Array;
  private readonly neighborCount: Uint8Array;
  private readonly zobrist: Uint32Array;
  private readonly scores: Record<Stone, number> = { 1: 0, 2: 0 };
  private readonly profile: (typeof SEARCH_PROFILES)[Difficulty];
  private readonly random: () => number;
  private readonly tt = new Map<
    number,
    { depth: number; score: number; flag: "exact" | "lower" | "upper" }
  >();
  private hash = 0;
  private stones = 0;
  private nodes = 0;
  private deadline = 0;
  private now = 0;

  constructor(request: AiRequest) {
    this.size = request.size;
    this.player = request.player;
    this.difficulty = request.difficulty;
    this.profile = SEARCH_PROFILES[request.difficulty];
    this.board = new Uint8Array(request.board);
    this.random = xorshift(request.id * 2654435761 + request.moveCount * 97 + 13);

    const layout = buildWindows(request.size);
    this.windows = layout.windows;
    this.windowsByCell = layout.byCell;
    this.neighbors = buildNeighborhood(request.size);
    this.blackCount = new Uint8Array(this.windows.length);
    this.whiteCount = new Uint8Array(this.windows.length);
    this.neighborCount = new Uint8Array(this.board.length);
    this.zobrist = new Uint32Array(this.board.length * 2);

    const rand = xorshift(0xa5f3c21d);
    for (let index = 0; index < this.zobrist.length; index += 1) {
      this.zobrist[index] = rand();
    }

    for (let index = 0; index < this.board.length; index += 1) {
      const player = this.board[index];
      if (player !== 0) this.registerStone(index, player as Stone);
    }
  }

  choose(): AiResult {
    const start = performance.now();
    this.deadline = start + this.profile.timeMs;
    this.now = start;

    const opening = this.openingMove();
    if (opening !== null) {
      return this.result(opening, 0, 0, 0, start);
    }

    const rootMoves = this.orderedMoves(this.player, this.profile.rootMoves);
    if (rootMoves.length === 0) {
      const fallback = this.firstEmpty();
      return this.result(fallback, 0, 0, 0, start);
    }

    let best = rootMoves[0].index;
    const bestScore = rootMoves[0].score;
    let completedDepth = 0;
    let lastScore = 0;

    if (this.difficulty === "novice") {
      const pool = rootMoves.slice(0, 3);
      const weights = [0.7, 0.21, 0.09];
      let roll = this.random();
      for (let i = 0; i < pool.length; i += 1) {
        roll -= weights[i] ?? 0;
        if (roll <= 0) {
          best = pool[i].index;
          break;
        }
      }
      return this.result(best, 0, performance.now() - start, 0, start);
    }

    for (let depth = 2; depth <= this.profile.maxDepth; depth += 2) {
      try {
        const found = this.searchRoot(depth);
        if (found) {
          best = found.index;
          lastScore = found.score;
          completedDepth = depth;
          if (found.score >= MATE - 100) break;
        }
      } catch (error) {
        if (error instanceof TimeoutError) break;
        throw error;
      }
    }

    return this.result(
      best,
      this.nodes,
      performance.now() - start,
      completedDepth,
      start,
      lastScore || bestScore,
    );
  }

  private result(
    index: number,
    nodes: number,
    elapsed: number,
    depth: number,
    start: number,
    score = 0,
  ): AiResult {
    const actualElapsed = Math.max(0, elapsed || performance.now() - start);
    return {
      id: 0,
      index,
      nodes,
      elapsed: Math.round(actualElapsed),
      depth,
      score,
    };
  }

  private openingMove(): number | null {
    if (this.stones === 0) {
      const center = Math.floor(this.size / 2);
      return indexOf(center, center, this.size);
    }

    if (this.stones === 1) {
      let blackIndex = -1;
      for (let index = 0; index < this.board.length; index += 1) {
        if (this.board[index] === 1) {
          blackIndex = index;
          break;
        }
      }
      if (blackIndex >= 0) {
        const row = rowOf(blackIndex, this.size);
        const col = colOf(blackIndex, this.size);
        const options: Array<[number, number]> = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ];
        for (const [dr, dc] of options) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= this.size || c < 0 || c >= this.size) continue;
          const index = indexOf(r, c, this.size);
          if (this.board[index] === 0) return index;
        }
      }
    }

    return null;
  }

  private searchRoot(depth: number): SearchMove | null {
    const moves = this.orderedMoves(this.player, this.profile.rootMoves);
    if (moves.length === 0) return null;

    let alpha = -INF;
    let best: SearchMove | null = null;
    const total = this.board.length;

    for (const candidate of moves) {
      this.make(candidate.index, this.player);
      let score: number;
      if (winningLineAt(this.board, this.size, candidate.index, this.player)) {
        score = MATE;
      } else if (this.stones === total) {
        score = 0;
      } else {
        score = -this.negamax(depth - 1, -INF, -alpha, opponent(this.player), 1);
      }
      this.unmake(candidate.index, this.player);

      if (score > alpha) {
        alpha = score;
        best = { index: candidate.index, score };
      }
    }

    return best;
  }

  private negamax(depth: number, alpha: number, beta: number, player: Stone, ply: number): number {
    this.nodes += 1;
    if ((this.nodes & 1023) === 0) {
      this.now = performance.now();
      if (this.now >= this.deadline) throw new TimeoutError();
    }

    if (depth <= 0) {
      return this.evaluate(player);
    }

    const alphaStart = alpha;
    const key = (this.hash ^ (player === 2 ? SIDE_KEY : 0)) >>> 0;
    const cached = this.tt.get(key);
    if (cached && cached.depth >= depth) {
      if (cached.flag === "exact") return cached.score;
      if (cached.flag === "lower" && cached.score > alpha) alpha = cached.score;
      if (cached.flag === "upper" && cached.score < beta) beta = cached.score;
      if (alpha >= beta) return cached.score;
    }

    const moves = this.orderedMoves(
      player,
      this.profile.innerMoves[Math.min(depth, this.profile.innerMoves.length - 1)] ?? 6,
    );
    if (moves.length === 0) return 0;

    let best = -INF;
    const total = this.board.length;

    for (const candidate of moves) {
      this.make(candidate.index, player);
      let score: number;
      if (winningLineAt(this.board, this.size, candidate.index, player)) {
        score = MATE - ply;
      } else if (this.stones === total) {
        score = 0;
      } else {
        score = -this.negamax(depth - 1, -beta, -alpha, opponent(player), ply + 1);
      }
      this.unmake(candidate.index, player);

      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }

    const flag = best <= alphaStart ? "upper" : best >= beta ? "lower" : "exact";
    this.tt.set(key, { depth, score: best, flag });
    return best;
  }

  private evaluate(player: Stone): number {
    const mine = this.scores[player];
    const theirs = this.scores[opponent(player)];
    return Math.round(mine - theirs * 1.07);
  }

  private orderedMoves(player: Stone, limit: number): SearchMove[] {
    const wins = this.findImmediateWins(player);
    if (wins.length > 0) {
      return wins.slice(0, 1).map((index) => ({ index, score: WIN_SCORE * 10 }));
    }

    const blocks = this.findImmediateWins(opponent(player));
    if (blocks.length > 0) {
      return blocks.slice(0, 4).map((index) => ({ index, score: WIN_SCORE * 5 }));
    }

    const candidates: SearchMove[] = [];
    const jitter = this.profile.noise;

    for (let index = 0; index < this.board.length; index += 1) {
      if (this.board[index] !== 0 || this.neighborCount[index] === 0) continue;
      const attack = this.potential(index, player);
      const defend = this.potential(index, opponent(player));
      const row = rowOf(index, this.size);
      const col = colOf(index, this.size);
      const center = (this.size - 1) / 2;
      const centrality = -(Math.abs(row - center) + Math.abs(col - center)) * 0.6;
      const noise = jitter > 0 ? (this.random() - 0.5) * jitter * 80 : 0;
      candidates.push({
        index,
        score: attack + defend * 0.94 + centrality + noise,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  }

  private findImmediateWins(player: Stone): number[] {
    const wins: number[] = [];
    for (let index = 0; index < this.board.length; index += 1) {
      if (this.board[index] !== 0 || this.neighborCount[index] === 0) continue;
      if (this.wouldWin(index, player)) wins.push(index);
    }
    return wins;
  }

  private potential(index: number, player: Stone): number {
    let score = 0;
    const windows = this.windowsByCell[index];

    for (const id of windows) {
      const black = this.blackCount[id];
      const white = this.whiteCount[id];

      if (player === 1) {
        if (white === 0) score += WINDOW_SCORE[black + 1] - WINDOW_SCORE[black];
      } else if (black === 0) {
        score += WINDOW_SCORE[white + 1] - WINDOW_SCORE[white];
      }
    }

    return score;
  }

  private wouldWin(index: number, player: Stone): boolean {
    const row = rowOf(index, this.size);
    const col = colOf(index, this.size);

    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;

      for (let step = 1; step < 5; step += 1) {
        const r = row + dr * step;
        const c = col + dc * step;
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) break;
        if (this.board[indexOf(r, c, this.size)] !== player) break;
        count += 1;
      }
      for (let step = 1; step < 5; step += 1) {
        const r = row - dr * step;
        const c = col - dc * step;
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) break;
        if (this.board[indexOf(r, c, this.size)] !== player) break;
        count += 1;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  private make(index: number, player: Stone): void {
    this.board[index] = player;
    this.stones += 1;
    this.hash ^= this.zobrist[index * 2 + (player - 1)];

    for (const id of this.windowsByCell[index]) this.changeWindow(id, player, 1);
    for (const cell of this.neighbors[index]) this.neighborCount[cell] += 1;
  }

  private unmake(index: number, player: Stone): void {
    this.board[index] = 0;
    this.stones -= 1;
    this.hash ^= this.zobrist[index * 2 + (player - 1)];

    for (const id of this.windowsByCell[index]) this.changeWindow(id, player, -1);
    for (const cell of this.neighbors[index]) this.neighborCount[cell] -= 1;
  }

  private registerStone(index: number, player: Stone): void {
    this.board[index] = player;
    this.stones += 1;
    this.hash ^= this.zobrist[index * 2 + (player - 1)];

    for (const id of this.windowsByCell[index]) this.changeWindow(id, player, 1);
    for (const cell of this.neighbors[index]) this.neighborCount[cell] += 1;
  }

  private changeWindow(id: number, player: Stone, delta: 1 | -1): void {
    const black = this.blackCount[id];
    const white = this.whiteCount[id];
    const beforeBlack = white > 0 ? 0 : WINDOW_SCORE[black];
    const beforeWhite = black > 0 ? 0 : WINDOW_SCORE[white];

    if (player === 1) {
      this.blackCount[id] = black + delta;
    } else {
      this.whiteCount[id] = white + delta;
    }

    const nextBlack = this.blackCount[id];
    const nextWhite = this.whiteCount[id];
    const afterBlack = nextWhite > 0 ? 0 : WINDOW_SCORE[nextBlack];
    const afterWhite = nextBlack > 0 ? 0 : WINDOW_SCORE[nextWhite];

    this.scores[1] += afterBlack - beforeBlack;
    this.scores[2] += afterWhite - beforeWhite;
  }

  private firstEmpty(): number {
    for (let index = 0; index < this.board.length; index += 1) {
      if (this.board[index] === 0) return index;
    }
    return -1;
  }
}

export function findBestMove(request: AiRequest): AiResult {
  if (request.board.length !== request.size * request.size) {
    throw new Error("Board dimensions do not match the requested size.");
  }
  const engine = new Engine(request);
  const result = engine.choose();
  return { ...result, id: request.id };
}
