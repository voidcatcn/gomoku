import { createGame, placeStone } from "./logic";
import type { GameSettings, GameState, Stone } from "./types";

const SETTINGS_KEY = "lianzhu:settings:v1";
const GAME_KEY = "lianzhu:game:v1";
const THEME_KEY = "lianzhu:theme";

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "ai",
  difficulty: "adept",
  humanColor: 1,
  boardSize: 15,
  sound: true,
};

function isStone(value: unknown): value is Stone {
  return value === 1 || value === 2;
}

export function loadSettings(): GameSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      mode: parsed.mode === "local" || parsed.mode === "ai" ? parsed.mode : DEFAULT_SETTINGS.mode,
      difficulty:
        parsed.difficulty === "novice" ||
        parsed.difficulty === "adept" ||
        parsed.difficulty === "master"
          ? parsed.difficulty
          : DEFAULT_SETTINGS.difficulty,
      humanColor: isStone(parsed.humanColor) ? parsed.humanColor : DEFAULT_SETTINGS.humanColor,
      boardSize: parsed.boardSize === 19 ? 19 : 15,
      sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULT_SETTINGS.sound,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private windows or restricted webviews.
  }
}

export interface SavedGame {
  size: number;
  moves: Array<{ index: number; player: Stone }>;
  startedAt: number;
  endedAt: number | null;
}

export function saveGame(game: GameState): void {
  const payload: SavedGame = {
    size: game.size,
    moves: game.moves.map(({ index, player }) => ({ index, player })),
    startedAt: game.startedAt,
    endedAt: game.endedAt,
  };
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort persistence only.
  }
}

export function loadGame(): GameState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGame>;
    const size = parsed.size === 19 ? 19 : parsed.size === 15 ? 15 : 0;
    if (!size || !Array.isArray(parsed.moves)) return null;
    if (parsed.moves.length > size * size) return null;

    let game = createGame(size);
    game.startedAt = typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now();

    for (let i = 0; i < parsed.moves.length; i += 1) {
      const saved = parsed.moves[i];
      if (!saved || !Number.isInteger(saved.index) || !isStone(saved.player)) return null;
      if (game.status !== "playing") return null;
      if (saved.player !== game.turn) return null;
      const placed = placeStone(game, saved.index, saved.player);
      if (!placed) return null;
      game = placed.state;
    }

    if (typeof parsed.endedAt === "number" && game.status !== "playing") {
      game.endedAt = parsed.endedAt;
    }

    return game;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // Ignore.
  }
}

export function loadTheme(): "light" | "dark" {
  if (typeof localStorage === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Ignore.
  }
  return "light";
}

export function saveTheme(theme: "light" | "dark"): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore.
  }
}
