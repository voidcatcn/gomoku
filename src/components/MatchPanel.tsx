import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Undo2,
  TriangleAlert,
} from "lucide-react";
import { MoveList } from "@/components/MoveList";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDuration, pointName } from "@/game/logic";
import { DIFFICULTY_META, STONE_LABEL } from "@/game/meta";
import type { AiStats, GameSettings, GameState, Stone } from "@/game/types";

interface MatchPanelProps {
  game: GameState;
  settings: GameSettings;
  isThinking: boolean;
  aiStats: AiStats | null;
  aiError: string | null;
  canUndo: boolean;
  elapsedMs: number;
  previewIndex: number | null;
  onPreview: (index: number | null) => void;
  onUndo: () => void;
  onNewGame: () => void;
  onPlayAgain: () => void;
  onOpenSettings: () => void;
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch (error) {
      reject(error);
    } finally {
      area.remove();
    }
  });
}

export function MatchPanel({
  game,
  settings,
  isThinking,
  aiStats,
  aiError,
  canUndo,
  elapsedMs,
  previewIndex,
  onPreview,
  onUndo,
  onNewGame,
  onPlayAgain,
  onOpenSettings,
}: MatchPanelProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const over = game.status !== "playing";
  const draw = game.status === "draw";
  const aiTurn = settings.mode === "ai" && game.turn !== settings.humanColor;
  const humanTurn = settings.mode === "ai" && game.turn === settings.humanColor;

  const statusTitle = over
    ? draw
      ? "和棋"
      : `${STONE_LABEL[game.winner ?? 1]}方胜`
    : isThinking
      ? "引擎推演中"
      : humanTurn
        ? "轮到你落子"
        : settings.mode === "local"
          ? `轮到${STONE_LABEL[game.turn]}方`
          : aiTurn
            ? "引擎将要落子"
            : `${STONE_LABEL[game.turn]}方落子`;

  const statusMeta = over
    ? draw
      ? `满盘皆子 · 共 ${game.moves.length} 手 · ${formatDuration(elapsedMs)}`
      : `五子连珠 · 第 ${game.moves.length} 手 · ${formatDuration(elapsedMs)}`
    : `第 ${game.moves.length + 1} 手 · ${settings.mode === "ai" ? `人机 · ${DIFFICULTY_META[settings.difficulty].label}` : "同屏对弈"}`;

  const playerInfo = (color: Stone) => {
    const isHuman = settings.mode === "local" || settings.humanColor === color;
    const label = STONE_LABEL[color];
    if (settings.mode === "local") {
      return {
        name: `${label}方`,
        subtitle: "同屏对弈",
      };
    }
    return {
      name: isHuman ? "你" : "连珠引擎",
      subtitle: isHuman
        ? `执${label} · ${color === 1 ? "先行" : "后手"}`
        : `AI · ${DIFFICULTY_META[settings.difficulty].label} · ${color === 1 ? "先行" : "后手"}`,
    };
  };

  const blackInfo = playerInfo(1);
  const whiteInfo = playerInfo(2);
  const blackMoves = game.moves.filter((move) => move.player === 1).length;
  const whiteMoves = game.moves.filter((move) => move.player === 2).length;

  const handleCopy = async () => {
    if (game.moves.length === 0) return;
    const lines: string[] = [
      `连珠 · 五子棋 · ${game.size} 路自由棋`,
      settings.mode === "ai"
        ? `人机对弈 · ${DIFFICULTY_META[settings.difficulty].label} · 你执${STONE_LABEL[settings.humanColor]}`
        : "双人同屏",
      over ? `结果：${statusTitle} · ${game.moves.length} 手` : `进行中 · ${game.moves.length} 手`,
      "",
    ];

    for (let index = 0; index < game.moves.length; index += 10) {
      const batch = game.moves.slice(index, index + 10);
      lines.push(
        batch
          .map(
            (move) =>
              `${move.number}. ${pointName(move.index, game.size)}${move.player === 1 ? "黑" : "白"}`,
          )
          .join("  "),
      );
    }

    try {
      await copyText(lines.join("\n"));
      setCopied(true);
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="frame-corners relative border border-border bg-card shadow-[0_30px_80px_-64px_rgba(28,20,10,0.75)]">
      <div
        className={cn(
          "relative border-b border-border p-5 transition-colors duration-500",
          over && "bg-[color-mix(in_oklab,var(--seal)_4%,transparent)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="eyebrow flex items-center gap-2 pt-1">
            <span className="inline-block h-px w-5 bg-accent" />
            {over ? "Result / 终局" : "Match / 对局"}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-1 text-muted-foreground"
                onClick={onNewGame}
                aria-label="开始新对局"
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">新局</TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {!over && (
                <span
                  className="stone-chip"
                  data-color={game.turn}
                  data-size="md"
                  aria-hidden="true"
                />
              )}
              <h2 className="text-[27px] leading-none tracking-[0.02em] text-balance">
                {statusTitle}
                {isThinking && (
                  <span
                    className="ml-2 inline-flex translate-y-[-2px] items-center gap-1"
                    aria-hidden="true"
                  >
                    <span className="thinking-dot inline-block size-1 bg-accent" />
                    <span
                      className="thinking-dot inline-block size-1 bg-accent"
                      style={{ animationDelay: "160ms" }}
                    />
                    <span
                      className="thinking-dot inline-block size-1 bg-accent"
                      style={{ animationDelay: "320ms" }}
                    />
                  </span>
                )}
              </h2>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed tracking-[0.08em] text-muted-foreground">
              {statusMeta}
            </p>
          </div>

          {over ? (
            <span
              className="seal animate-seal mt-0.5 grid size-11 shrink-0 text-[19px] leading-none"
              aria-hidden="true"
            >
              {draw ? "和" : "胜"}
            </span>
          ) : (
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center border border-border text-center">
              <span className="text-[16px] leading-none tabular-nums">
                {String(game.moves.length).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[7px] leading-none tracking-[0.16em] text-muted-foreground">
                MOVES
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex min-h-[16px] items-center text-[9px] leading-none tracking-[0.06em] text-muted-foreground/85">
          {settings.mode === "ai" ? (
            isThinking ? (
              <span>棋士正在推演，请稍候。</span>
            ) : aiStats && aiStats.nodes > 0 ? (
              <span>
                上步推演 {aiStats.nodes.toLocaleString("en-US")} 节点 · 深度 {aiStats.depth} ·{" "}
                {(aiStats.elapsed / 1000).toFixed(2)}s
              </span>
            ) : (
              <span>{aiError ? "备用着法已启用。" : "本地计算，不离开这台设备。"}</span>
            )
          ) : (
            <span>黑先白后，轮流落子。</span>
          )}
        </div>

        {over && (
          <div className="mt-4 flex border border-border">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 bg-primary py-2.5 text-[11px] tracking-[0.06em] text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={onPlayAgain}
            >
              <RotateCcw className="size-3.5" />
              再来一局
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-[11px] tracking-[0.06em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="size-3.5" />
              悔棋复盘
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <PlayerCard
          color={1}
          name={blackInfo.name}
          subtitle={blackInfo.subtitle}
          moveCount={blackMoves}
          active={!over && game.turn === 1}
          winner={game.winner === 1}
        />
        <PlayerCard
          color={2}
          name={whiteInfo.name}
          subtitle={whiteInfo.subtitle}
          moveCount={whiteMoves}
          active={!over && game.turn === 2}
          winner={game.winner === 2}
        />
      </div>

      {!over && (
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2.5 text-[11px] tracking-[0.05em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-35"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="size-3.5" />
            悔棋
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2.5 text-[11px] tracking-[0.05em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onOpenSettings}
          >
            <SlidersHorizontal className="size-3.5" />
            对局设置
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">Record / 棋谱</span>
          <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">
            {game.moves.length} 手
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              onClick={handleCopy}
              disabled={game.moves.length === 0}
              aria-label="复制棋谱"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">{copied ? "已复制" : "复制棋谱"}</TooltipContent>
        </Tooltip>
      </div>

      <MoveList moves={game.moves} size={game.size} onPreview={onPreview} />

      {previewIndex !== null && (
        <div className="border-t border-border px-4 py-2 text-[9px] tracking-[0.09em] text-muted-foreground">
          正在查看 · 第 {game.moves.find((move) => move.index === previewIndex)?.number ?? "—"} 手 ·{" "}
          {pointName(previewIndex, game.size)}
        </div>
      )}

      {aiError && (
        <div className="flex items-start gap-2 border-t border-border bg-destructive/5 px-4 py-2.5 text-[9px] leading-relaxed text-destructive">
          <TriangleAlert className="mt-px size-3 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[8px] tracking-[0.18em] text-muted-foreground/70 uppercase">
        <span>Local engine · 无需联网</span>
        <span>
          {game.size} × {game.size}
        </span>
      </div>
    </aside>
  );
}
