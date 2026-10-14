import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/SearchField";
import { cn } from "@/lib/utils";
import { GoogleSearch } from "@/widgets/news/components/GoogleSearch";
import { SavedToggle } from "@/widgets/news/components/SavedList";
import type { NewsTab } from "@/widgets/news/types";
import { useNews } from "@/widgets/news/useNewsStore";

type Props = {
  tab: NewsTab;
  filter: string;
  onFilter: (value: string) => void;
  showSaved: boolean;
  onSaved: () => void;
  savedCount: number;
  unreadOnly: boolean;
  onUnread: () => void;
};

export function NewsToolbar({
  tab,
  filter,
  onFilter,
  showSaved,
  onSaved,
  savedCount,
  unreadOnly,
  onUnread,
}: Props) {
  const googleQuery = useNews((d) => d.googleQuery);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="min-w-0 flex-1">
        {tab === "google" && !showSaved ? (
          <GoogleSearch query={googleQuery} />
        ) : (
          <SearchField
            value={filter}
            onChange={onFilter}
            label="Filter headlines and sources"
            placeholder="Filter headlines and sources…"
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="xs"
        aria-pressed={unreadOnly}
        onClick={onUnread}
        title="Show only unread headlines"
        className={cn(
          "text-ink-3 gap-1",
          unreadOnly && "text-ink bg-primary/12 ring-1 ring-inset ring-primary/25",
        )}
      >
        <ListFilter className={cn(unreadOnly && "text-primary")} aria-hidden /> Unread
      </Button>
      <SavedToggle count={savedCount} active={showSaved} onToggle={onSaved} />
    </div>
  );
}
