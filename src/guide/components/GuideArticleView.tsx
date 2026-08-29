import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DialogHeaderBar } from "@/components/DialogChrome";
import { enterTween, exitTween } from "@/lib/motion";
import { TYPE } from "@/lib/type";
import { ARTICLE_ORDER } from "@/guide/content";
import { ArticleBlock } from "@/guide/components/ArticleBlock";
import type { ArticleLocation } from "@/guide/types";

type Props = {
  location: ArticleLocation;
  onSelect: (articleId: string) => void;
};

export function GuideArticleView({ location, onSelect }: Props) {
  const reduced = useReducedMotion() ?? false;
  const { group, article } = location;
  const index = ARTICLE_ORDER.findIndex((entry) => entry.article.id === article.id);
  const previous = index > 0 ? ARTICLE_ORDER[index - 1] : undefined;
  const next = index >= 0 ? ARTICLE_ORDER[index + 1] : undefined;

  return (
    <>
      <DialogHeaderBar>
        <nav
          aria-label="Breadcrumb"
          className="text-ink-3 flex min-w-0 items-center gap-2 text-caption"
        >
          <span className="shrink-0">{group.title}</span>
          <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
          <span className="text-ink truncate font-medium">{article.title}</span>
        </nav>
      </DialogHeaderBar>
      <div className="scroll-fade scrollbar-inset-b min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={article.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: enterTween(reduced) }}
            exit={{ opacity: 0, transition: exitTween(reduced) }}
            className="mx-auto flex max-w-2xl flex-col gap-10 px-10 pt-6 pb-12"
          >
            <div className="flex flex-col gap-4">
              <DialogTitle className="text-display-sm font-semibold tracking-tight">
                {article.title}
              </DialogTitle>
              <DialogDescription className="text-ink-3 text-body-lg leading-relaxed">
                {article.lead}
              </DialogDescription>
            </div>

            <div className="flex flex-col gap-8">
              {article.blocks.map((block, blockIndex) => (
                <ArticleBlock key={`${block.kind}-${blockIndex}`} block={block} />
              ))}
            </div>

            {(previous ?? next) && (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {previous && (
                    <PagerCard
                      direction="previous"
                      title={previous.article.title}
                      onClick={() => onSelect(previous.article.id)}
                    />
                  )}
                  {next && (
                    <PagerCard
                      direction="next"
                      title={next.article.title}
                      onClick={() => onSelect(next.article.id)}
                    />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function PagerCard({
  direction,
  title,
  onClick,
}: {
  direction: "previous" | "next";
  title: string;
  onClick: () => void;
}) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${isNext ? "Next" : "Previous"}: ${title}`}
      className={cn(
        `
          press-row focus-ring group border-border/60
          hover:bg-accent/50
          flex cursor-pointer flex-col gap-1.5 rounded-xl border border-transparent p-5
          transition-colors
          hover:border-border
        `,
        isNext ? "sm:col-start-2 items-end text-right" : "items-start text-left",
      )}
    >
      <span className={cn(TYPE.eyebrow, "flex items-center gap-1.5")}>
        {!isNext && <ArrowLeft className="size-3" aria-hidden />}
        {isNext ? "Next" : "Previous"}
        {isNext && <ArrowRight className="size-3" aria-hidden />}
      </span>
      <span className="text-ink group-hover:text-primary text-body font-medium transition-colors">
        {title}
      </span>
    </button>
  );
}
