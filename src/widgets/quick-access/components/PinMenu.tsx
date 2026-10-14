import { useState } from "react";
import { ArrowUpRight, Check, Copy, Ellipsis, Pencil, PinOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { openUrl, type OpenBehavior } from "@/lib/open-url";
import { usePinMenuFocus } from "@/widgets/quick-access/hooks/usePinMenuFocus";
import { cn } from "@/lib/utils";
import type { QuickLink } from "@/widgets/quick-access/types";

type Props = {
  link: QuickLink;
  openBehavior: OpenBehavior;
  onEdit: () => void;
  onRemove: () => void;
};

export function PinMenu({ link, openBehavior, onEdit, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const focus = usePinMenuFocus(() => setOpen(false));
  const { status, copy } = useCopyToClipboard();
  const message =
    status === "copied"
      ? "Link copied"
      : status === "failed"
        ? "Could not copy link. Try again."
        : "Pin actions";
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={focus.trigger}
          aria-haspopup="menu"
          variant="ghost"
          size="icon-xs"
          aria-label={`Actions for ${link.title}`}
          title={message}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn("text-ink-3 hover:text-ink", status === "failed" && "text-destructive")}
        >
          {status === "copied" ? (
            <Check aria-hidden />
          ) : status === "failed" ? (
            <AlertCircle aria-hidden />
          ) : (
            <Ellipsis aria-hidden />
          )}
        </Button>
      </PopoverTrigger>
      <span role="status" className="sr-only">
        {status !== "idle" ? message : ""}
      </span>
      <PopoverContent
        ref={focus.content}
        align="end"
        role="menu"
        aria-label={`Pin actions for ${link.title}`}
        className="w-44"
        onKeyDown={focus.onKeyDown}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focus.content.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        }}
        onCloseAutoFocus={focus.onCloseAutoFocus}
      >
        <Button
          variant="ghost"
          size="sm"
          role="menuitem"
          className="w-full justify-start"
          onClick={() => run(() => openUrl(link.url, openBehavior))}
        >
          <ArrowUpRight aria-hidden /> Open link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          role="menuitem"
          className="w-full justify-start"
          onClick={() => run(() => copy(link.url))}
        >
          <Copy aria-hidden /> Copy link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          role="menuitem"
          className="w-full justify-start"
          onClick={() => {
            focus.editing.current = true;
            run(onEdit);
          }}
        >
          <Pencil aria-hidden /> Edit link…
        </Button>
        <div role="separator" className="border-border my-1 border-t" />
        <Button
          variant="ghost-destructive"
          size="sm"
          role="menuitem"
          className="w-full justify-start"
          onClick={() => run(onRemove)}
        >
          <PinOff aria-hidden /> Remove pin
        </Button>
      </PopoverContent>
    </Popover>
  );
}
