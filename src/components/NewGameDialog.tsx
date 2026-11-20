import { useState } from "react";
import { ArrowRight, Bot, Check, Grid3X3, Users } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DIFFICULTY_META, DIFFICULTY_ORDER, MODE_META, STONE_LABEL } from "@/game/meta";
import type { GameSettings, Mode } from "@/game/types";

interface NewGameDialogProps {
  open: boolean;
  settings: GameSettings;
  onOpenChange: (open: boolean) => void;
  onStart: (settings: GameSettings) => void;
}

export function NewGameDialog({ open, settings, onOpenChange, onStart }: NewGameDialogProps) {
  const [draft, setDraft] = useState<GameSettings>(settings);

  // App remounts this component each time the dialog opens, so `draft` always
  // starts from the current settings without a prop-syncing effect.

  const selectMode = (mode: Mode) => {
    setDraft((current) => ({ ...current, mode }));
  };

  const start = () => {
    onStart(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto bg-popover p-0 sm:max-w-[590px]">
        <div className="relative overflow-hidden border-b border-border px-6 py-6">
          <div className="dialog-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_92%)] opacity-45" />
          <div className="relative">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-px w-5 bg-accent" />
              New game / 新局
            </p>
            <div className="mt-3 pr-8">
              <DialogTitle className="text-[30px] leading-none tracking-[0.04em]">
                开新局
              </DialogTitle>
              <DialogDescription className="mt-3 max-w-[26rem] text-[11px] leading-relaxed tracking-[0.04em]">
                选择弈法与对手。黑方先行，自由规则，无禁手。
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="eyebrow">Mode / 对弈方式</span>
              <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">01</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="对弈方式">
              {(["ai", "local"] as Mode[]).map((mode) => {
                const meta = MODE_META[mode];
                const selected = draft.mode === mode;
                const Icon = mode === "ai" ? Bot : Users;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectMode(mode)}
                    className={cn(
                      "group relative flex min-h-[104px] flex-col border p-4 text-left transition-all",
                      selected
                        ? "border-foreground bg-[color-mix(in_oklab,var(--foreground)_3.5%,transparent)]"
                        : "border-border hover:border-foreground/35 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex w-full items-start justify-between">
                      <Icon
                        className={cn(
                          "size-4 transition-colors",
                          selected ? "text-accent" : "text-muted-foreground",
                        )}
                      />
                      {selected && (
                        <span className="grid size-4 place-items-center bg-primary text-primary-foreground">
                          <Check className="size-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="mt-4 text-[14px] leading-none tracking-[0.04em]">
                      {meta.label}
                    </span>
                    <span className="mt-2 text-[9px] leading-none tracking-[0.1em] text-muted-foreground">
                      {meta.latin} · {meta.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {draft.mode === "ai" ? (
            <>
              <section>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="eyebrow">Level / 棋力</span>
                  <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">02</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="棋力">
                  {DIFFICULTY_ORDER.map((difficulty) => {
                    const meta = DIFFICULTY_META[difficulty];
                    const selected = draft.difficulty === difficulty;
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDraft((current) => ({ ...current, difficulty }))}
                        className={cn(
                          "flex flex-col items-center justify-center border px-2 py-3 text-center transition-all",
                          selected
                            ? "border-foreground bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-foreground/35 hover:bg-muted/40",
                        )}
                      >
                        <span className="text-[14px] leading-none tracking-[0.06em]">
                          {meta.label}
                        </span>
                        <span
                          className={cn(
                            "mt-1.5 text-[8px] leading-none tracking-[0.16em]",
                            selected ? "text-primary-foreground/60" : "text-muted-foreground",
                          )}
                        >
                          {meta.latin}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 flex items-start gap-2 text-[10px] leading-relaxed tracking-[0.03em] text-muted-foreground">
                  <span className="mt-[3px] inline-block size-1 shrink-0 bg-accent" />
                  {DIFFICULTY_META[draft.difficulty].note}
                </p>
              </section>

              <section>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="eyebrow">Your stones / 执子</span>
                  <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">03</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="执子">
                  {([1, 2] as const).map((color) => {
                    const selected = draft.humanColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            humanColor: color,
                          }))
                        }
                        className={cn(
                          "flex items-center gap-3 border px-4 py-3 text-left transition-all",
                          selected
                            ? "border-foreground bg-[color-mix(in_oklab,var(--foreground)_3.5%,transparent)]"
                            : "border-border hover:border-foreground/35 hover:bg-muted/40",
                        )}
                      >
                        <span className="stone-chip" data-color={color} data-size="md" />
                        <span className="min-w-0">
                          <span className="block text-[12px] leading-none tracking-[0.05em]">
                            执{STONE_LABEL[color]}
                          </span>
                          <span className="mt-1.5 block text-[9px] leading-none tracking-[0.08em] text-muted-foreground">
                            {color === 1 ? "先行 · 你开场" : "后手 · AI 开场"}
                          </span>
                        </span>
                        {selected && <Check className="ml-auto size-3.5 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="flex items-center gap-3 border border-dashed border-border px-4 py-3.5 text-[10px] leading-relaxed tracking-[0.04em] text-muted-foreground">
              <Users className="size-4 shrink-0 text-muted-foreground" />
              双人同屏：黑方先行，轮流落子。适合与身边的人共弈。
            </div>
          )}

          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="eyebrow">Board / 棋盘</span>
              <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">
                {draft.mode === "ai" ? "04" : "02"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="棋盘大小">
              {[15, 19].map((size) => {
                const selected = draft.boardSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDraft((current) => ({ ...current, boardSize: size }))}
                    className={cn(
                      "flex items-center justify-between border px-4 py-3 transition-all",
                      selected
                        ? "border-foreground bg-[color-mix(in_oklab,var(--foreground)_3.5%,transparent)]"
                        : "border-border hover:border-foreground/35 hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Grid3X3
                        className={cn("size-4", selected ? "text-accent" : "text-muted-foreground")}
                      />
                      <span className="text-[12px] leading-none tracking-[0.05em]">
                        {size} × {size}
                      </span>
                    </span>
                    <span className="text-[9px] leading-none tracking-[0.08em] text-muted-foreground">
                      {size === 15 ? "标准" : "宽局"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-[color-mix(in_oklab,var(--foreground)_2%,transparent)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-[9px] leading-none tracking-[0.1em] text-muted-foreground">
            <span className="inline-block size-1 bg-accent" />
            黑方先行 · 自由规则
          </span>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="h-8 border border-border px-3.5 text-[11px] tracking-[0.06em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                取消
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={start}
              className="group flex h-8 items-center gap-2 bg-primary px-4 text-[11px] tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              开始对局
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
