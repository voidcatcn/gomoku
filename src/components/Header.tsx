import { CircleHelp, Moon, Plus, Sun, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GameSettings } from "@/game/types";
import { DIFFICULTY_META } from "@/game/meta";

interface HeaderProps {
  settings: GameSettings;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onNewGame: () => void;
  onHelp: () => void;
}

function IconAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          className="border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Header({
  settings,
  theme,
  onToggleTheme,
  onToggleSound,
  onNewGame,
  onHelp,
}: HeaderProps) {
  const modeLabel =
    settings.mode === "ai" ? `人机 · ${DIFFICULTY_META[settings.difficulty].label}` : "双人同屏";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-[68px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[76px] lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <div className="seal size-9 shrink-0 text-[19px] leading-none" aria-hidden="true">
            五
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[22px] leading-none tracking-[0.16em]">连珠</span>
              <span className="hidden text-[9px] leading-none tracking-[0.28em] text-muted-foreground uppercase sm:inline">
                Gomoku
              </span>
            </div>
            <p className="mt-1.5 hidden text-[9px] leading-none tracking-[0.16em] text-muted-foreground sm:block">
              五子连珠 · 手谈之乐
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-3 lg:flex">
          <span className="h-px w-7 bg-border" />
          <span className="eyebrow">{modeLabel}</span>
          <span className="h-px w-7 bg-border" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconAction label={settings.sound ? "关闭声音" : "开启声音"} onClick={onToggleSound}>
            {settings.sound ? <Volume2 /> : <VolumeX />}
          </IconAction>
          <IconAction
            label={theme === "dark" ? "切换为宣纸白" : "切换为夜弈黑"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </IconAction>
          <IconAction label="规则与操作" onClick={onHelp}>
            <CircleHelp />
          </IconAction>
          <Button
            type="button"
            className="ml-1.5 h-8 gap-1.5 px-2.5 text-xs sm:px-3"
            onClick={onNewGame}
            aria-label="开始新对局"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">新局</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
