import { useCallback, useEffect, useRef, useState } from "react";
import { candidateCells, createGame, opponent, placeStone, undoMove } from "@/game/logic";
import { loadGame, loadSettings, saveGame, saveSettings } from "@/game/storage";
import type { AiRequest, AiResult, AiStats, GameSettings, GameState, Stone } from "@/game/types";
import { useSound } from "./useSound";

interface AiMessage extends Partial<AiResult> {
  id: number;
  error?: string;
}

interface PendingRequest {
  id: number;
  color: Stone;
  timer: number | null;
  settled: boolean;
}

const MIN_THINK_MS = 420;

function fallbackMove(game: GameState): number {
  const candidates = candidateCells(game.board, game.size, 2).filter(
    (index) => game.board[index] === 0,
  );
  if (candidates.length > 0) {
    const center = (game.size - 1) / 2;
    candidates.sort((a, b) => {
      const ar = Math.floor(a / game.size);
      const ac = a % game.size;
      const br = Math.floor(b / game.size);
      const bc = b % game.size;
      return (
        Math.abs(ar - center) +
        Math.abs(ac - center) -
        (Math.abs(br - center) + Math.abs(bc - center))
      );
    });
    return candidates[0];
  }
  const empty = game.board.findIndex((cell) => cell === 0);
  return empty >= 0 ? empty : -1;
}

export function useGomoku() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = loadSettings();
    const stored = loadGame();
    return stored ? { ...saved, boardSize: stored.size } : saved;
  });
  const [game, setGame] = useState<GameState>(() => loadGame() ?? createGame(settings.boardSize));
  const [isThinking, setIsThinking] = useState(false);
  const [aiStats, setAiStats] = useState<AiStats | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);
  const requestSeq = useRef(0);
  const gameRef = useRef(game);
  const settingsRef = useRef(settings);
  const handlerRef = useRef<(message: AiMessage) => void>(() => undefined);
  const playedWinRef = useRef<number | null>(game.status === "won" ? game.endedAt : null);

  const { playStone, playWin } = useSound(settings.sound);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveGame(game);
  }, [game]);

  const cancelPending = useCallback(() => {
    requestSeq.current += 1;
    const pending = pendingRef.current;
    if (pending?.timer != null) window.clearTimeout(pending.timer);
    pendingRef.current = null;
    setIsThinking(false);
  }, []);

  const finishAiMove = useCallback(
    (message: AiMessage) => {
      const pending = pendingRef.current;
      if (!pending || pending.id !== message.id || pending.settled) return;
      if (requestSeq.current !== pending.id) return;
      pending.settled = true;

      const current = gameRef.current;
      if (current.status !== "playing" || current.turn !== pending.color) {
        pendingRef.current = null;
        setIsThinking(false);
        return;
      }

      let index = typeof message.index === "number" ? message.index : -1;
      if (index < 0 || index >= current.board.length || current.board[index] !== 0) {
        index = fallbackMove(current);
      }
      if (index < 0) {
        pendingRef.current = null;
        setIsThinking(false);
        setAiError("棋盘已满，未能找到落点。");
        return;
      }

      const placed = placeStone(current, index, pending.color);
      if (!placed) {
        pendingRef.current = null;
        setIsThinking(false);
        return;
      }

      setGame(placed.state);
      setAiStats({
        nodes: message.nodes ?? 0,
        elapsed: message.elapsed ?? 0,
        depth: message.depth ?? 0,
        score: message.score ?? 0,
      });
      setAiError(message.error ? "引擎离线，已使用备用着法。" : null);
      setIsThinking(false);
      pendingRef.current = null;
      playStone(pending.color);
    },
    [playStone],
  );

  useEffect(() => {
    handlerRef.current = (message: AiMessage) => {
      const pending = pendingRef.current;
      if (!pending || pending.id !== message.id || pending.settled) return;

      if (message.error) {
        if (pending.timer != null) return;
        setAiError("引擎离线，已使用备用着法。");
        const fallback = fallbackMove(gameRef.current);
        const wait = Math.max(0, MIN_THINK_MS - (message.elapsed ?? 0));
        pending.timer = window.setTimeout(() => {
          finishAiMove({
            id: pending.id,
            index: fallback,
            nodes: 0,
            elapsed: MIN_THINK_MS,
            depth: 0,
            score: 0,
            error: "engine-fallback",
          });
        }, wait);
        return;
      }

      if (pending.timer != null) return;
      const elapsed = message.elapsed ?? 0;
      const wait = Math.max(0, MIN_THINK_MS - elapsed);
      if (wait > 0) {
        pending.timer = window.setTimeout(() => finishAiMove(message), wait);
      } else {
        finishAiMove(message);
      }
    };
  });

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../game/ai.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      // Worker construction is a browser API call; surfacing its failure is a
      // legitimate external-system synchronization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiError("无法启动思考引擎，请刷新页面。");
      return;
    }

    workerRef.current = worker;
    setWorkerReady(true);
    worker.addEventListener("message", (event: MessageEvent<AiMessage>) => {
      handlerRef.current(event.data);
    });
    worker.addEventListener("error", () => {
      const pending = pendingRef.current;
      if (!pending || pending.settled) return;
      setAiError("思考引擎发生错误，已启用备用着法。");
      handlerRef.current({
        id: pending.id,
        error: "engine-error",
        elapsed: MIN_THINK_MS,
      });
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current = null;
      requestSeq.current += 1;
      setWorkerReady(false);
      setIsThinking(false);
    };
    // The worker lives for the whole session; game state is passed per request.
  }, []);

  useEffect(() => {
    if (!workerReady) return;
    if (settings.mode !== "ai" || game.status !== "playing") return;

    const aiColor = opponent(settings.humanColor);
    if (game.turn !== aiColor) return;
    if (pendingRef.current) return;

    const worker = workerRef.current;
    if (!worker) return;

    const id = requestSeq.current + 1;
    requestSeq.current = id;
    pendingRef.current = { id, color: aiColor, timer: null, settled: false };
    setIsThinking(true);
    setAiError(null);

    const request: AiRequest = {
      id,
      board: game.board,
      size: game.size,
      player: aiColor,
      difficulty: settings.difficulty,
      moveCount: game.moves.length,
    };
    worker.postMessage(request);
  }, [
    workerReady,
    settings.mode,
    settings.humanColor,
    settings.difficulty,
    game.board,
    game.turn,
    game.status,
    game.size,
    game.moves.length,
  ]);

  useEffect(() => {
    if (game.status === "won" && game.endedAt && playedWinRef.current !== game.endedAt) {
      playedWinRef.current = game.endedAt;
      const timer = window.setTimeout(() => playWin(), 240);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [game.status, game.endedAt, playWin]);

  const playAt = useCallback(
    (index: number) => {
      if (game.status !== "playing" || isThinking) return;
      if (settings.mode === "ai" && game.turn !== settings.humanColor) return;
      const result = placeStone(game, index);
      if (!result) return;
      setGame(result.state);
      playStone(game.turn);
    },
    [game, isThinking, settings.mode, settings.humanColor, playStone],
  );

  const startNewGame = useCallback(
    (patch?: Partial<GameSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      cancelPending();
      setSettings(next);
      setGame(createGame(next.boardSize));
      setAiStats(null);
      setAiError(null);
    },
    [cancelPending],
  );

  const undo = useCallback(() => {
    if (game.moves.length === 0) return;
    if (settings.mode === "ai" && !game.moves.some((move) => move.player === settings.humanColor)) {
      return;
    }

    cancelPending();
    let next = game;

    if (settings.mode === "ai") {
      do {
        next = undoMove(next);
      } while (
        next.moves.length > 0 &&
        !(
          next.turn === settings.humanColor &&
          next.moves[next.moves.length - 1]?.player !== settings.humanColor
        )
      );
    } else {
      next = undoMove(next);
    }

    setGame(next);
    setAiStats(null);
    setAiError(null);
  }, [game, settings.mode, settings.humanColor, cancelPending]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSettings((current) => ({ ...current, sound: enabled }));
  }, []);

  const aiColor = settings.mode === "ai" ? opponent(settings.humanColor) : null;
  const canUndo =
    game.moves.length > 0 &&
    (settings.mode !== "ai" || game.moves.some((move) => move.player === settings.humanColor));

  return {
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
  };
}
