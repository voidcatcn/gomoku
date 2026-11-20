import { describe, expect, it } from "vitest";
import { findBestMove } from "./engine";
import { createBoard, indexOf, winningLineAt } from "./logic";
import type { Cell, Difficulty, Stone } from "./types";

const DIFFICULTIES: Difficulty[] = ["novice", "adept", "master"];

function makeBoard(points: Array<[number, number, Stone]>, size = 15): Cell[] {
  const board: Cell[] = createBoard(size);
  for (const [row, col, stone] of points) board[indexOf(row, col, size)] = stone;
  return board;
}

function request(
  points: Array<[number, number, Stone]>,
  player: Stone,
  difficulty: Difficulty = "adept",
  size = 15,
) {
  return {
    id: 1,
    board: makeBoard(points, size),
    size,
    player,
    difficulty,
    moveCount: points.length,
  };
}

describe("findBestMove", () => {
  it("opens on the centre of an empty board", () => {
    const result = findBestMove(request([], 1, "novice"));
    expect(result.index).toBe(indexOf(7, 7, 15));
    expect(result.nodes).toBe(0);
  });

  it("answers the first stone on an adjacent point", () => {
    const result = findBestMove(request([[7, 7, 1]], 2));
    const row = Math.floor(result.index / 15);
    const col = result.index % 15;
    expect(Math.max(Math.abs(row - 7), Math.abs(col - 7))).toBe(1);
  });

  it("takes an immediate win", () => {
    const points: Array<[number, number, Stone]> = [
      [7, 3, 2],
      [7, 4, 2],
      [7, 5, 2],
      [7, 6, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ];
    for (const difficulty of DIFFICULTIES) {
      const input = request(points, 2, difficulty);
      const result = findBestMove(input);
      expect([indexOf(7, 2, 15), indexOf(7, 7, 15)]).toContain(result.index);
      input.board[result.index] = 2;
      expect(
        winningLineAt(input.board, 15, result.index, 2),
        `${difficulty} should win`,
      ).not.toBeNull();
    }
  });

  it("blocks an immediate loss", () => {
    const points: Array<[number, number, Stone]> = [
      [7, 3, 1],
      [7, 4, 1],
      [7, 5, 1],
      [7, 6, 1],
      [0, 0, 2],
      [0, 1, 2],
    ];
    for (const difficulty of DIFFICULTIES) {
      const result = findBestMove(request(points, 2, difficulty));
      expect([indexOf(7, 2, 15), indexOf(7, 7, 15)], `${difficulty} must block`).toContain(
        result.index,
      );
    }
  });

  it("always returns an empty in-bounds point", () => {
    const points: Array<[number, number, Stone]> = [
      [7, 7, 1],
      [7, 8, 2],
      [8, 8, 1],
      [6, 6, 2],
    ];
    const input = request(points, 1, "novice");
    const result = findBestMove(input);
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThan(225);
    expect(input.board[result.index]).toBe(0);
  });

  it("rejects malformed boards", () => {
    expect(() =>
      findBestMove({
        id: 1,
        board: createBoard(15).slice(0, 10),
        size: 15,
        player: 1,
        difficulty: "adept",
        moveCount: 0,
      }),
    ).toThrow(/dimensions/i);
  });
});
