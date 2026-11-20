import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  ["点击 / 轻触", "在交叉点落子"],
  ["方向键", "在棋盘上移动焦点"],
  ["Enter / 空格", "落下棋子"],
  ["U", "悔棋"],
  ["N", "开新局"],
  ["D", "切换明暗"],
  ["?", "打开本指南"],
];

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto bg-popover p-0 sm:max-w-[560px]">
        <div className="dialog-grid relative overflow-hidden border-b border-border px-6 py-6">
          <p className="eyebrow flex items-center gap-2">
            <span className="h-px w-5 bg-accent" />
            Guide / 手谈指南
          </p>
          <DialogTitle className="mt-3 text-[30px] leading-none tracking-[0.04em]">
            落子有道
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-[25rem] text-[11px] leading-relaxed tracking-[0.04em]">
            五子连珠，黑白之间。先连成五子者胜，落子便无悔。
          </DialogDescription>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="eyebrow">Rules / 规则</span>
              <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">01</span>
            </div>
            <p className="border-l-2 border-accent pl-3 text-[11px] leading-[1.9] tracking-[0.03em] text-foreground/85">
              黑方先行，双方轮流在交叉点落子。横、竖、斜任意方向，先连成五子或五子以上者胜。
            </p>
            <p className="mt-2 pl-3.5 text-[10px] leading-relaxed tracking-[0.04em] text-muted-foreground">
              采用自由规则，无三三、四四与长连禁手。棋盘落满仍未分胜负则为和棋。
            </p>
          </section>

          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="eyebrow">Controls / 操作</span>
              <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">02</span>
            </div>
            <dl className="border border-border">
              {shortcuts.map(([key, action], index) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    index !== shortcuts.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <dt className="text-[10px] tracking-[0.05em] text-foreground/80">{action}</dt>
                  <dd>
                    <kbd className="kbd">{key}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="eyebrow">Engine / 引擎</span>
              <span className="text-[9px] tracking-[0.08em] text-muted-foreground/70">03</span>
            </div>
            <p className="text-[10px] leading-[1.9] tracking-[0.04em] text-muted-foreground">
              连珠引擎在本机运行，以棋形评估、候选点排序与迭代加深搜索推演着法。三档棋力分别为入门、棋士与名人。棋谱只保存在本机，不会上传。
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-[color-mix(in_oklab,var(--foreground)_2%,transparent)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[9px] tracking-[0.12em] text-muted-foreground/70">
            连珠 · LIANZHU · 二〇二六
          </span>
          <DialogClose asChild>
            <button
              type="button"
              className="h-8 self-end border border-border px-4 text-[11px] tracking-[0.06em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:self-auto"
            >
              明白了
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
