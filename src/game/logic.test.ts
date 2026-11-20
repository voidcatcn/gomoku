import { describe, expect, it } from "vitest";
import {
  candidateCells,
  createBoard,
  createGame,
  indexOf,
  placeStone,
  pointName,
  starPoints,
  undoMove,
  winningLineAt,
} from "./logic";
import type { GameState, Stone } from "./types";

function boardWith(points: Array<[number, number, Stone]>, size = 15): GameState {
  const state = createGame(size);
  const board = state.board.slice();
  for (const [row, col, stone] of points) board[indexOf(row, col, size)] = stone;
  return { ...state, board };
}

describe("createGame", () => {
  it("starts empty with black to move", () => {
    const game = createGame(15);
    expect(game.size).toBe(15);
    expect(game.board).toHaveLength(225);
    expect(game.board.every((cell) => cell === 0)).toBe(true);
    expect(game.turn).toBe(1);
    expect(game.status).toBe("playing");
    expect(game.moves).toHaveLength(0);
    expect(game.endedAt).toBeNull();
  });
});

describe("placeStone", () => {
  it("places stones immutably and alternates turns", () => {
    const start = createGame(15);
    const first = placeStone(start, indexOf(7, 7, 15));
    expect(first).not.toBeNull();
    expect(start.board[indexOf(7, 7, 15)]).toBe(0);
    expect(first!.state.board[indexOf(7, 7, 15)]).toBe(1);
    expect(first!.state.turn).toBe(2);
    expect(first!.state.moves).toEqual([{ index: indexOf(7, 7, 15), player: 1, number: 1 }]);

    const second = placeStone(first!.state, indexOf(7, 8, 15));
    expect(second!.state.board[indexOf(7, 8, 15)]).toBe(2);
    expect(second!.state.turn).toBe(1);
  });

  it("rejects occupied points, out-of-range points, wrong turns and finished games", () => {
    const start = createGame(15);
    const after = placeStone(start, indexOf(7, 7, 15))!.state;

    expect(placeStone(after, indexOf(7, 7, 15))).toBeNull();
    expect(placeStone(after, -1)).toBeNull();
    expect(placeStone(after, 225)).toBeNull();
    expect(placeStone(after, indexOf(0, 0, 15), 1)).toBeNull();
    expect(placeStone(start, indexOf(0, 0, 15), 2)).toBeNull();
  });

  it.each([
    {
      name: "horizontal",
      stones: [
        [7, 3],
        [7, 4],
        [7, 5],
        [7, 6],
      ] as Array<[number, number]>,
      winning: [7, 7] as [number, number],
      player: 1 as Stone,
    },
    {
      name: "vertical",
      stones: [
        [3, 7],
        [4, 7],
        [5, 7],
        [6, 7],
      ] as Array<[number, number]>,
      winning: [7, 7] as [number, number],
      player: 1 as Stone,
    },
    {
      name: "descending diagonal",
      stones: [
        [3, 3],
        [4, 4],
        [5, 5],
        [6, 6],
      ] as Array<[number, number]>,
      winning: [7, 7] as [number, number],
      player: 2 as Stone,
    },
    {
      name: "ascending diagonal",
      stones: [
        [3, 11],
        [4, 10],
        [5, 9],
        [6, 8],
      ] as Array<[number, number]>,
      winning: [7, 7] as [number, number],
      player: 2 as Stone,
    },
  ])("detects a $name win", ({ stones, winning, player }) => {
    const game = boardWith(stones.map(([row, col]) => [row, col, player]));
    game.turn = player;
    const result = placeStone(game, indexOf(winning[0], winning[1], 15));
    expect(result).not.toBeNull();
    expect(result!.state.status).toBe("won");
    expect(result!.state.winner).toBe(player);
    expect(result!.state.winningLine).toHaveLength(5);
    expect(result!.state.endedAt).not.toBeNull();
    expect(placeStone(result!.state, indexOf(0, 0, 15))).toBeNull();
  });

  it("counts an overline as a win in free-style rules", () => {
    const game = boardWith([
      [7, 3, 1],
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
      [7, 8, 1],
    ]);
    const result = placeStone(game, indexOf(7, 7, 15));
    expect(result).not.toBeNull();
    expect(result!.state.status).toBe("won");
    expect(result!.state.winningLine).toHaveLength(6);
  });

  it("declares a draw when the board fills without five in a row", () => {
    let game = createGame(4);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const result = placeStone(game, indexOf(row, col, 4));
        expect(result).not.toBeNull();
        game = result!.state;
      }
    }
    expect(game.status).toBe("draw");
    expect(game.winner).toBeNull();
    expect(game.moves).toHaveLength(16);
  });
});

describe("winningLineAt", () => {
  it("returns the whole run for the placed stone", () => {
    const game = boardWith([
      [7, 5, 2],
      [7, 6, 2],
      [7, 7, 2],
      [7, 8, 2],
      [7, 9, 2],
    ]);
    const line = winningLineAt(game.board, 15, indexOf(7, 8, 15), 2);
    expect(line).toEqual([5, 6, 7, 8, 9].map((col) => indexOf(7, col, 15)));
    expect(game.board.filter((cell) => cell === 2)).toHaveLength(5);
  });

  it("returns null for a broken run", () => {
    const game = boardWith([
      [7, 3, 1],
      [7, 4, 1],
      [7, 5, 1],
      [7, 7, 1],
    ]);
    expect(winningLineAt(game.board, 15, indexOf(7, 7, 15), 1)).toBeNull();
  });
});

describe("undoMove", () => {
  it("restores the board, turn and a finished game", () => {
    let game = createGame(15);
    const sequence: Array<[number, number]> = [
      [7, 3],
      [0, 0],
      [7, 4],
      [0, 1],
      [7, 5],
      [0, 2],
      [7, 6],
      [0, 3],
      [7, 7],
    ];
    for (const [row, col] of sequence) {
      game = placeStone(game, indexOf(row, col, 15))!.state;
    }
    expect(game.status).toBe("won");

    const undone = undoMove(game);
    expect(undone.status).toBe("playing");
    expect(undone.winner).toBeNull();
    expect(undone.endedAt).toBeNull();
    expect(undone.board[indexOf(7, 7, 15)]).toBe(0);
    expect(undone.turn).toBe(1);
    expect(undone.moves).toHaveLength(8);

    const twice = undoMove(undone);
    expect(twice.board[indexOf(0, 3, 15)]).toBe(0);
    expect(twice.turn).toBe(2);
    expect(twice.moves).toHaveLength(7);
  });

  it("is a no-op on an empty board", () => {
    const game = createGame(15);
    expect(undoMove(game)).toBe(game);
  });
});

describe("helpers", () => {
  it("formats point names from the top-left origin", () => {
    expect(pointName(indexOf(14, 0, 15), 15)).toBe("A1");
    expect(pointName(indexOf(0, 14, 15), 15)).toBe("O15");
    expect(pointName(indexOf(7, 7, 15), 15)).toBe("H8");
  });

  it("provides the five star points on a 15-line board", () => {
    expect(starPoints(15)).toHaveLength(5);
    expect(starPoints(15)).toContain(indexOf(7, 7, 15));
    expect(starPoints(19)).toHaveLength(9);
    expect(starPoints(9)).toEqual([]);
  });

  it("finds empty cells near existing stones", () => {
    const board = createBoard(15);
    board[indexOf(7, 7, 15)] = 1;
    const candidates = candidateCells(board, 15, 1);
    expect(candidates).toHaveLength(8);
    expect(candidates).not.toContain(indexOf(7, 7, 15));
    expect(candidates).toContain(indexOf(7, 8, 15));
    expect(candidateCells(board, 15, 2)).toHaveLength(24);
  });
});
