import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, LayoutGrid, Rocket, SearchX, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SearchField } from "@/components/SearchField";
import { cn } from "@/lib/utils";
import { DIALOG_RAIL } from "@/components/DialogChrome";
import { DURATION, EASE_OUT, SPRING_CRISP } from "@/lib/motion";
import { GUIDE_GROUPS } from "@/guide/content";
import type { GuideGroup } from "@/guide/types";

const GROUP_ICON: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  widgets: LayoutGrid,
  accounts: ShieldCheck,
};

type Props = {
  articleId: string;
  onSelect: (articleId: string) => void;
};

function matchGroup(group: GuideGroup, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return { visible: true, articles: group.articles };
  if (group.title.toLowerCase().includes(term)) return { visible: true, articles: group.articles };
  const articles = group.articles.filter(
    (article) =>
      article.title.toLowerCase().includes(term) || article.lead.toLowerCase().includes(term),
  );
  return { visible: articles.length > 0, articles };
}

export function GuideNav({ articleId, onSelect }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const results = useMemo(
    () =>
      GUIDE_GROUPS.map((group) => ({ group, ...matchGroup(group, query) })).filter(
        (entry) => entry.visible,
      ),
    [query],
  );

  const searching = query.trim().length > 0;

  return (
    <nav aria-label="Guide topics" className={cn(DIALOG_RAIL, "w-64")}>
      <div className="border-edge-2 border-b p-4">
        <SearchField value={query} onChange={setQuery} label="Search the guide" />
      </div>

      <div className="scroll-fade min-h-0 flex-1 overflow-y-auto p-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <span className="bg-surface-3 text-ink-4 grid size-12 place-items-center rounded-full">
              <SearchX className="size-5" aria-hidden />
            </span>
            <span className="text-ink text-body font-medium">No results found</span>
            <span className="text-ink-3 text-caption">
              Nothing matches “{query.trim()}”. Try a different word.
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {results.map(({ group, articles }) => {
              const open = searching || !collapsed[group.id];
              const Icon = GROUP_ICON[group.id] ?? Rocket;
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((state) => ({ ...state, [group.id]: !collapsed[group.id] }))
                    }
                    aria-expanded={open}
                    className="
                      press-row focus-ring text-ink
                      hover:bg-accent/60
                      flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2
                      py-1.5 text-left text-body font-medium transition-colors
                    "
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="text-ink-4 size-4 shrink-0" aria-hidden />
                      <span className="truncate">{group.title}</span>
                    </span>
                    <motion.span
                      aria-hidden
                      className="flex"
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
                    >
                      <ChevronRight className="text-ink-4 size-3.5" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
                      >
                        <ul className="border-edge-2 mt-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
                          {articles.map((article) => {
                            const active = article.id === articleId;
                            return (
                              <li key={article.id}>
                                <button
                                  type="button"
                                  aria-current={active ? "page" : undefined}
                                  onClick={() => onSelect(article.id)}
                                  className={cn(
                                    `
                                      press-row focus-ring relative flex w-full cursor-pointer
                                      rounded-md px-2 py-1.5 text-left text-body transition-colors
                                    `,
                                    active ? "text-ink font-medium" : "text-ink-3 hover:text-ink",
                                  )}
                                >
                                  {active && (
                                    <motion.span
                                      layoutId="guide-active-article"
                                      className="
                                        bg-primary/12 ring-primary/25 absolute inset-0 rounded-md
                                        ring-1
                                      "
                                      transition={reduced ? { duration: 0 } : SPRING_CRISP}
                                    />
                                  )}
                                  <span className="relative z-10 truncate">{article.title}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
