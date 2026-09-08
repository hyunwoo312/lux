import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, LayoutGrid, Rocket, SearchX, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SearchField } from "@/components/SearchField";
import { cn, matchesQuery } from "@/lib/utils";
import { DIALOG_RAIL, RailItem } from "@/components/DialogChrome";
import { collapse, enterTween } from "@/lib/motion";
import { ROW } from "@/lib/row";
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
  if (matchesQuery(group.title, term)) return { visible: true, articles: group.articles };
  const articles = group.articles.filter(
    (article) => matchesQuery(article.title, term) || matchesQuery(article.lead, term),
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
                      setCollapsed((state) => ({ ...state, [group.id]: !state[group.id] }))
                    }
                    aria-expanded={open}
                    className={cn(
                      ROW.nav,
                      `
                        text-ink
                        hover:bg-accent/60
                        justify-between gap-2 rounded-md py-1.5 font-medium
                      `,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="text-ink-4 size-4 shrink-0" aria-hidden />
                      <span className="truncate">{group.title}</span>
                    </span>
                    <motion.span
                      aria-hidden
                      className="flex"
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={enterTween(reduced, "fast")}
                    >
                      <ChevronRight className="text-ink-4 size-3.5" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div className="overflow-hidden" {...collapse(reduced)}>
                        <ul className="border-edge-2 mt-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
                          {articles.map((article) => {
                            const active = article.id === articleId;
                            return (
                              <li key={article.id}>
                                <RailItem
                                  active={active}
                                  layoutId="guide-active-article"
                                  aria-current={active ? "page" : undefined}
                                  onClick={() => onSelect(article.id)}
                                  className={cn("rounded-md py-1.5", active && "font-medium")}
                                >
                                  <span className="truncate">{article.title}</span>
                                </RailItem>
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
