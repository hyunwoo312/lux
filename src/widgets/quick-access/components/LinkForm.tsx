import type { FormEvent, KeyboardEvent } from "react";
import { useId, useState } from "react";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Favicon } from "@/widgets/quick-access/components/Favicon";
import { useHistorySuggestions } from "@/widgets/quick-access/hooks/useHistorySuggestions";
import { hostnameOf, keyOf } from "@/widgets/quick-access/lib/url";
import type { LinkResult, QuickLink } from "@/widgets/quick-access/types";

type LinkFormProps = {
  initial?: QuickLink;
  pinnedUrls: Set<string>;
  onSubmit: (title: string, url: string) => LinkResult;
  onCancel: () => void;
};

export function LinkForm({ initial, pinnedUrls, onSubmit, onCancel }: LinkFormProps) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();

  const suggestions = useHistorySuggestions(url, focused);
  const matches = suggestions.map((item) => ({ ...item, pinned: pinnedUrls.has(keyOf(item.url)) }));
  const open = focused && !dismissed && matches.length > 0;

  const choose = (item: { title: string; url: string }) => {
    setUrl(item.url);
    setTitle(item.title);
    setError("");
    setDismissed(true);
    setActiveIndex(-1);
  };

  const moveActive = (delta: number) => {
    if (!matches.length) return;
    let index = activeIndex < 0 ? (delta > 0 ? -1 : 0) : activeIndex;
    for (let step = 0; step < matches.length; step += 1) {
      index = (index + delta + matches.length) % matches.length;
      if (!matches[index]?.pinned) {
        setActiveIndex(index);
        return;
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onSubmit(title, url);
    if (result === "ok") return;
    setError(
      result === "duplicate"
        ? "That link is already pinned."
        : "Enter a web address, like example.com",
    );
  };

  const handleUrlKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "Escape") onCancel();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const match = matches[activeIndex];
      if (match && !match.pinned) {
        event.preventDefault();
        choose(match);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <span className="text-ink-3 text-caption font-semibold tracking-wide uppercase">
        {initial ? "Edit link" : "Add link"}
      </span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setDismissed(true);
            setActiveIndex(-1);
          }
        }}
      >
        <PopoverAnchor asChild>
          <Input
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setDismissed(false);
              setActiveIndex(-1);
              setError("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleUrlKeyDown}
            placeholder="example.com"
            aria-label="Link URL"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            autoFocus
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          side="bottom"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)]"
        >
          <div className="max-h-60 overflow-y-auto rounded-lg">
            <ul id={listboxId} role="listbox">
              {matches.map((item, index) => {
                const rowClass =
                  "focus-ring flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left";
                const label = (
                  <>
                    <Favicon url={item.url} size={32} className="size-4 shrink-0 rounded-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{item.title}</span>
                      <span className="text-ink-3 block truncate text-caption">
                        {hostnameOf(item.url)}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.pinned ? (
                      <div
                        id={`${listboxId}-${index}`}
                        role="option"
                        aria-selected={false}
                        aria-disabled
                        className={cn(rowClass, "opacity-50")}
                      >
                        {label}
                        <Pin className="text-primary size-3.5 shrink-0 fill-current" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`${listboxId}-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(item)}
                        className={cn(
                          "press cursor-pointer",
                          rowClass,
                          index === activeIndex ? "bg-accent" : "hover:bg-accent/60",
                        )}
                      >
                        {label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title (optional)"
        aria-label="Link title"
      />
      {error && (
        <p role="alert" className="text-destructive text-caption">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
