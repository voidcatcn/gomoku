import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "@/components/Board";
import { Header } from "@/components/Header";
import { HelpDialog } from "@/components/HelpDialog";
import { MatchPanel } from "@/components/MatchPanel";
import { NewGameDialog } from "@/components/NewGameDialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatDuration } from "@/game/logic";
import { STONE_LABEL } from "@/game/meta";
import { loadTheme, saveTheme } from "@/game/storage";
import type { GameSettings } from "@/game/types";
import { useGomoku } from "@/hooks/useGomoku";

export default function App() {
  const {
    game,
    settings,
    isThinking,
    aiStats,
    aiError,
    aiColor,
    canUndo,
    playAt,
    undo,
    startNewGame,
    setSoundEnabled,
  } = useGomoku();

  const [theme, setTheme] = useState<"light" | "dark">(() => loadTheme());
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    saveTheme(theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#12110f" : "#f2ede3");
  }, [theme]);

  useEffect(() => {
    if (game.status !== "playing") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [game.status, game.startedAt, game.endedAt]);

  const elapsedMs = useMemo(() => {
    const end = game.endedAt ?? Math.max(now, game.startedAt);
    return Math.max(0, end - game.startedAt);
  }, [game.endedAt, game.startedAt, now]);

  const humanTurn = settings.mode === "local" || game.turn === settings.humanColor;
  const boardInteractive = game.status === "playing" && humanTurn && !isThinking;

  const handleStart = useCallback(
    (next: GameSettings) => {
      setPreviewIndex(null);
      startNewGame(next);
    },
    [startNewGame],
  );

  const handlePlayAgain = useCallback(() => {
    setPreviewIndex(null);
    startNewGame();
  }, [startNewGame]);

  const handleNewGame = useCallback(() => {
    setPreviewIndex(null);
    setNewGameOpen(true);
  }, []);

  const handleUndo = useCallback(() => {
    setPreviewIndex(null);
    undo();
  }, [undo]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!settings.sound);
  }, [setSoundEnabled, settings.sound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (newGameOpen || helpOpen) return;

      const key = event.key.toLowerCase();
      if (key === "u" && canUndo) {
        event.preventDefault();
        handleUndo();
      } else if (key === "n") {
        event.preventDefault();
        handleNewGame();
      } else if (key === "d") {
        event.preventDefault();
        toggleTheme();
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, handleNewGame, handleUndo, helpOpen, newGameOpen, toggleTheme]);

  const turnState =
    game.status === "won"
      ? `${STONE_LABEL[game.winner ?? 1]}方胜`
      : game.status === "draw"
        ? "和棋"
        : isThinking
          ? "引擎推演中"
          : settings.mode === "ai" && game.turn === aiColor
            ? "引擎落子"
            : settings.mode === "ai"
              ? "轮到你"
              : `轮到${STONE_LABEL[game.turn]}方`;

  const announcement =
    game.status === "won"
      ? `${STONE_LABEL[game.winner ?? 1]}方胜，共 ${game.moves.length} 手。`
      : game.status === "draw"
        ? "和棋，棋盘已满。"
        : isThinking
          ? "引擎正在推演。"
          : settings.mode === "ai"
            ? humanTurn
              ? `轮到你落子，执${STONE_LABEL[settings.humanColor]}。`
              : "轮到引擎落子。"
            : `轮到${STONE_LABEL[game.turn]}方落子。`;

  return (
    <TooltipProvider delayDuration={280}>
      <div className="flex min-h-svh flex-col">
        <Header
          settings={settings}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleSound={toggleSound}
          onNewGame={handleNewGame}
          onHelp={() => setHelpOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-7">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:gap-10">
            <section className="min-w-0" aria-label="棋局">
              <div className="mx-auto w-full lg:max-w-[min(100%,calc(100svh-284px))]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-block size-1.5 shrink-0 bg-accent" />
                    <span className="eyebrow whitespace-nowrap">Board / 棋局</span>
                    <span className="hidden h-3 w-px bg-border sm:block" />
                    <span className="hidden text-[9px] tracking-[0.1em] text-muted-foreground sm:inline">
                      自由棋 · 无禁手
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.08em] text-muted-foreground">
                    <span
                      className="stone-chip"
                      data-color={game.winner ?? game.turn}
                      data-size="sm"
                    />
                    <span className="whitespace-nowrap">{turnState}</span>
                    <span className="hidden h-3 w-px bg-border sm:block" />
                    <span className="hidden sm:inline">{game.size} 路</span>
                  </div>
                </div>

                <Board
                  key={game.size}
                  size={game.size}
                  board={game.board}
                  moves={game.moves}
                  current={game.turn}
                  winningLine={game.winningLine}
                  interactive={boardInteractive}
                  previewIndex={previewIndex}
                  onPlay={playAt}
                />

                <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3 text-[10px] tracking-[0.08em] text-muted-foreground">
                  <div className="flex items-center gap-5">
                    <span>
                      手数{" "}
                      <span className="text-foreground tabular-nums">
                        {String(game.moves.length).padStart(2, "0")}
                      </span>
                    </span>
                    <span>
                      用时{" "}
                      <span className="text-foreground tabular-nums">
                        {formatDuration(elapsedMs)}
                      </span>
                    </span>
                    {settings.mode === "ai" && (
                      <span className="hidden sm:inline">执{STONE_LABEL[settings.humanColor]}</span>
                    )}
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    {game.status === "playing" ? (
                      <>
                        <kbd className="kbd">↑↓←→</kbd>
                        <span>选点</span>
                        <kbd className="kbd">Enter</kbd>
                        <span>落子</span>
                      </>
                    ) : (
                      <span>本局已终 · 可复盘或再来一局</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="min-w-0 lg:pt-[27px]">
              <MatchPanel
                game={game}
                settings={settings}
                isThinking={isThinking}
                aiStats={aiStats}
                aiError={aiError}
                canUndo={canUndo}
                elapsedMs={elapsedMs}
                previewIndex={previewIndex}
                onPreview={setPreviewIndex}
                onUndo={handleUndo}
                onNewGame={handleNewGame}
                onPlayAgain={handlePlayAgain}
                onOpenSettings={handleNewGame}
              />
            </div>
          </div>

          <footer className="mt-10 flex flex-col gap-2 border-t border-border pt-4 text-[9px] tracking-[0.16em] text-muted-foreground/70 uppercase sm:flex-row sm:items-center sm:justify-between">
            <span>连珠 · Five in a row</span>
            <span>本地双人 · 本地引擎 · 棋谱不出本机</span>
          </footer>
        </main>

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        <NewGameDialog
          key={newGameOpen ? "new-game-open" : "new-game-closed"}
          open={newGameOpen}
          settings={settings}
          onOpenChange={setNewGameOpen}
          onStart={handleStart}
        />

        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </TooltipProvider>
  );
}
