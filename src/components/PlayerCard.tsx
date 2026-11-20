import { cn } from "@/lib/utils";
import type { Stone } from "@/game/types";

interface PlayerCardProps {
  color: Stone;
  name: string;
  subtitle: string;
  moveCount: number;
  active: boolean;
  winner: boolean;
}

export function PlayerCard({ color, name, subtitle, moveCount, active, winner }: PlayerCardProps) {
  return (
    <article
      className={cn(
        "relative flex min-w-0 flex-col justify-between p-4 transition-colors duration-300",
        active && "bg-[color-mix(in_oklab,var(--seal)_5%,transparent)]",
      )}
      aria-current={active ? "true" : undefined}
    >
      {active && <span className="absolute inset-x-0 top-0 h-[2px] bg-accent" />}

      <div className="flex items-start justify-between gap-2">
        <span className="stone-chip" data-color={color} data-size="lg" aria-hidden="true" />
        <span className="eyebrow pt-1">{color === 1 ? "BLACK / 黑" : "WHITE / 白"}</span>
      </div>

      <div className="mt-4 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[17px] leading-none tracking-[0.02em]">{name}</h3>
          {active && <span className="live-dot" aria-label="正在行棋" />}
          {winner && (
            <span className="seal size-[18px] shrink-0 text-[10px] leading-none" aria-label="胜者">
              胜
            </span>
          )}
        </div>
        <p className="mt-2 truncate text-[10px] leading-none tracking-[0.09em] text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] leading-none tracking-[0.08em] text-muted-foreground">
        <span>{color === 1 ? "先行" : "后手"}</span>
        <span>{moveCount} 手</span>
      </div>
    </article>
  );
}
