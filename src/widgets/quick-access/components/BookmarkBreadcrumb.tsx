import { ArrowLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BookmarkFolder } from "@/widgets/quick-access/types";

type Props = { trail: BookmarkFolder[]; onNavigate: (depth: number) => void };

export function BookmarkBreadcrumb({ trail, onNavigate }: Props) {
  const last = trail.length - 1;
  const parent = trail[last - 1];
  return (
    <nav
      aria-label="Bookmark folders"
      className="flex min-w-0 shrink-0 items-center gap-0.5 pb-1.5"
    >
      <Tooltip content={`Back to ${parent?.title ?? "Bookmarks"}`}>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Back to ${parent?.title ?? "Bookmarks"}`}
          onClick={() => onNavigate(last - 1)}
        >
          <ArrowLeft aria-hidden />
        </Button>
      </Tooltip>
      {trail.map((folder, index) => {
        if (trail.length > 3 && index > 0 && index < last - 1) {
          return index === 1 ? (
            <MoreHorizontal key="ellipsis" aria-hidden className="text-ink-3 size-3 shrink-0" />
          ) : null;
        }
        const current = index === last;
        return (
          <span
            key={folder.id}
            className={cn("flex min-w-0 items-center gap-0.5", current && "flex-1")}
          >
            {index > 0 && <ChevronRight className="text-ink-3 size-3 shrink-0" aria-hidden />}
            <button
              type="button"
              onClick={() => onNavigate(index)}
              aria-current={current ? "page" : undefined}
              disabled={current}
              title={folder.title}
              className={cn(
                "press focus-ring min-w-0 truncate rounded-sm px-1 py-1 text-micro",
                current
                  ? "text-ink font-medium"
                  : "text-ink-3 hover:text-ink max-w-20 cursor-pointer",
              )}
            >
              {folder.title}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
