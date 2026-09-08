import type { FormEvent, KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
import { Favicon } from "@/widgets/quick-access/components/Favicon";
import { useHistorySuggestions } from "@/widgets/quick-access/hooks/useHistorySuggestions";
import { hostnameOf, keyOf } from "@/widgets/quick-access/lib/url";
import type { LinkResult, QuickLink } from "@/widgets/quick-access/types";
import { OptionRow } from "@/components/OptionRow";

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

  const suggestions = useHistorySuggestions(url, focused);
  const matches = useMemo(
    () => suggestions.map((item) => ({ ...item, pinned: pinnedUrls.has(keyOf(item.url)) })),
    [suggestions, pinnedUrls],
  );
  const open = focused && !dismissed && matches.length > 0;

  const choose = (item: { title: string; url: string }) => {
    setUrl(item.url);
    setTitle(item.title);
    setError("");
    setDismissed(true);
  };

  const cursor = useComboboxCursor(matches, {
    enabled: open,
    onPick: choose,
    isDisabled: (item) => item.pinned,
    startInactive: true,
  });

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
    cursor.onInputKeyDown(event);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <span className="text-ink-3 text-caption font-semibold tracking-wide uppercase">
        {initial ? "Edit link" : "Add link"}
      </span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next) setDismissed(true);
        }}
      >
        <PopoverAnchor asChild>
          <Input
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setDismissed(false);
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
            aria-controls={cursor.listboxId}
            aria-activedescendant={cursor.active >= 0 ? cursor.optionId(cursor.active) : undefined}
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
            <ul id={cursor.listboxId} role="listbox">
              {matches.map((item, index) => {
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
                    <OptionRow
                      id={cursor.optionId(index)}
                      active={index === cursor.active}
                      disabled={item.pinned}
                      onActivate={() => cursor.setActive(index)}
                      onPick={() => choose(item)}
                    >
                      {label}
                      {item.pinned && (
                        <Pin className="text-primary size-3.5 shrink-0 fill-current" />
                      )}
                    </OptionRow>
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
