import type { Difficulty, Mode, Stone } from "./types";

export const DIFFICULTY_ORDER: Difficulty[] = ["novice", "adept", "master"];

export const DIFFICULTY_META: Record<Difficulty, { label: string; latin: string; note: string }> = {
  novice: {
    label: "入门",
    latin: "NOVICE",
    note: "凭直觉落子，偶尔会看漏一手。",
  },
  adept: {
    label: "棋士",
    latin: "ADEPT",
    note: "会计算数步，懂得封堵与做活。",
  },
  master: {
    label: "名人",
    latin: "MASTER",
    note: "深度推演，擅长制造双重威胁。",
  },
};

export const MODE_META: Record<Mode, { label: string; latin: string; note: string }> = {
  ai: {
    label: "人机对弈",
    latin: "SOLO",
    note: "与本地引擎手谈一局。",
  },
  local: {
    label: "双人对弈",
    latin: "DUO",
    note: "同屏轮流落子，无需联网。",
  },
};

export const STONE_LABEL: Record<Stone, string> = {
  1: "黑",
  2: "白",
};

export const STONE_ORDER: Record<Stone, string> = {
  1: "先行",
  2: "后手",
};

export function stoneName(color: Stone): string {
  return color === 1 ? "黑方" : "白方";
}
