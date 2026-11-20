import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { pointName } from "@/game/logic";
import type { Move } from "@/game/types";

interface MoveListProps {
  moves: Move[];
  size: number;
  onPreview: (index: number | null) => void;
}

export function MoveList({ moves, size, onPreview }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center">
        <div className="grid size-11 place-items-center border border-dashed border-border text-[17px] text-muted-foreground/60">
          谱
        </div>
        <p className="mt-4 text-xs tracking-[0.08em] text-muted-foreground">棋谱尚空</p>
        <p className="mt-1.5 max-w-[15rem] text-[10px] leading-relaxed tracking-[0.04em] text-muted-foreground/70">
          落子之后，每一手都会记在这里。
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="move-scroll max-h-[286px] overflow-y-auto overscroll-contain lg:max-h-[324px]"
      onMouseLeave={() => onPreview(null)}
    >
      <ol className="grid grid-cols-2">
        {moves.map((move, index) => {
          const latest = index === moves.length - 1;
          return (
            <li
              key={move.number}
              className={cn(
                "group/move flex min-w-0 items-center gap-2 border-b border-l-2 border-border/45 border-l-transparent py-[7px] pr-2 pl-2.5 transition-colors",
                index % 2 === 0 && "border-r border-r-border/45",
                latest && "border-l-accent bg-[color-mix(in_oklab,var(--seal)_4%,transparent)]",
              )}
              onMouseEnter={() => onPreview(move.index)}
              title={`第 ${move.number} 手 · ${pointName(move.index, size)} · ${
                move.player === 1 ? "黑" : "白"
              }`}
            >
              <span className="w-5 shrink-0 text-[9px] leading-none tracking-[0.06em] text-muted-foreground/70 tabular-nums">
                {String(move.number).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "min-w-0 text-[11px] leading-none tracking-[0.05em]",
                  latest ? "text-foreground" : "text-foreground/80",
                )}
              >
                {pointName(move.index, size)}
              </span>
              <span
                className="stone-chip ml-auto opacity-90"
                data-color={move.player}
                data-size="sm"
                aria-label={move.player === 1 ? "黑" : "白"}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
