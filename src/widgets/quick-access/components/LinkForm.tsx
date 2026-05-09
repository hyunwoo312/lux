import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QuickLink } from "@/widgets/quick-access/types";

type LinkFormProps = {
  initial?: QuickLink;
  onSubmit: (title: string, url: string) => void;
  onCancel: () => void;
};

const inputClass = `
  border-border/70 bg-background/40 placeholder:text-muted-foreground/50 focus-visible:border-ring
  focus-visible:ring-ring/25 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none
  focus-visible:ring-2
`;

export function LinkForm({ initial, onSubmit, onCancel }: LinkFormProps) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url.trim()) return;
    onSubmit(title, url);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {initial ? "Edit link" : "Add link"}
      </span>
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="example.com"
        aria-label="Link URL"
        autoFocus
        className={inputClass}
      />
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title (optional)"
        aria-label="Link title"
        className={inputClass}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}
