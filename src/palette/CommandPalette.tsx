import { useEffect } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";
import { useTransientScrollbar } from "@/hooks/useTransientScrollbar";
import { fade } from "@/lib/motion";
import { recordPaletteUse } from "@/stores/usePaletteStore";
import { useToastStore } from "@/stores/useToastStore";
import { PaletteFooter } from "@/palette/PaletteFooter";
import { PaletteResults } from "@/palette/PaletteResults";
import { useCommandPaletteStore } from "@/palette/useCommandPaletteStore";

const COUNT_ID = "palette-result-count";
import { usePaletteEntries, type PaletteEntry } from "@/palette/usePaletteEntries";

export function CommandPalette() {
  const open = useCommandPaletteStore((state) => state.open);
  const query = useCommandPaletteStore((state) => state.query);
  const mode = useCommandPaletteStore((state) => state.mode);
  const { closePalette, setQuery, enterScope, leaveScope } = useCommandPaletteStore.getState();
  const scroll = useTransientScrollbar<HTMLDivElement>();
  const reduced = useReducedMotion();

  const { groups, entries, working, emptyMessage } = usePaletteEntries(mode, query, open);

  const runCommand = (run: () => void | Promise<void>) => {
    Promise.resolve()
      .then(run)
      .catch((caught: unknown) => {
        useToastStore.getState().show({
          key: `palette-error-${Date.now()}`,
          message: caught instanceof Error ? caught.message : "That command failed.",
        });
      });
    closePalette();
  };

  const activate = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    if (entry.kind === "result") {
      runCommand(entry.result.run);
      return;
    }
    const { setup } = entry.item;
    if (setup) {
      runCommand(setup.run);
      return;
    }
    if (entry.item.section !== "links") recordPaletteUse(entry.item.id);
    if (entry.item.effect === "scope") {
      enterScope(entry.item);
      return;
    }
    runCommand(entry.item.run);
  };

  const cursor = useComboboxCursor(entries, { enabled: entries.length > 0, onPick: activate });
  const { active } = cursor;

  useEffect(() => {
    scroll.ref.current?.scrollTo({ top: 0 });
  }, [query, mode, scroll.ref]);

  const ContextIcon = mode.kind === "scope" ? mode.command.icon : Search;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    cursor.onInputKeyDown(event);
    if (event.defaultPrevented) return;
    if (event.key === "Backspace" && query === "" && mode.kind === "scope") {
      event.preventDefault();
      leaveScope();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closePalette()}>
      <DialogContent
        surface="glass"
        layout="flush"
        width="lg"
        showClose={false}
        className="top-[12vh] bottom-auto"
        onEscapeKeyDown={(event) => {
          if (mode.kind !== "scope") return;
          event.preventDefault();
          leaveScope();
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        <div
          aria-hidden
          className="
            bg-foreground/6 pointer-events-none absolute -top-20 -left-20 size-64 rounded-full
            blur-3xl
          "
        />

        <div className="border-border relative flex h-14 items-center gap-2.5 border-b px-4">
          {working && <Spinner className="text-ink-2 size-4 shrink-0" />}
          {mode.kind === "scope" && (
            <span
              className="
                bg-accent border-border text-caption text-ink shrink-0 rounded-full border px-2
                py-0.5 font-medium
              "
            >
              {mode.command.label}
            </span>
          )}
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-label="Command palette"
            aria-controls={cursor.listboxId}
            aria-expanded={entries.length > 0}
            aria-autocomplete="list"
            aria-describedby={COUNT_ID}
            aria-activedescendant={entries.length > 0 ? cursor.optionId(active) : undefined}
            placeholder={
              mode.kind === "scope" ? mode.command.placeholder : "Type a command or search…"
            }
            className="
              text-ink
              placeholder:text-ink-2
              text-body h-full min-w-0 flex-1 bg-transparent outline-none
            "
          />
          <ContextIcon className="text-ink-2 size-5 shrink-0" aria-hidden />
        </div>

        <div
          ref={scroll.ref}
          onScroll={scroll.onScroll}
          className="
            scroll-fade scrollbar-transient scrollbar-gutter relative h-[calc(10*2.5rem)]
            overflow-y-auto pr-0 pl-(--scrollbar-width)
          "
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode.kind === "scope" ? mode.command.id : "root"} {...fade(reduced)}>
              <PaletteResults
                groups={groups}
                emptyMessage={emptyMessage}
                listboxId={cursor.listboxId}
                optionId={cursor.optionId}
                active={active}
                onActivate={activate}
                onHover={cursor.setActive}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <p id={COUNT_ID} role="status" aria-live="polite" className="sr-only">
          {entries.length === 0 ? "No results" : `${entries.length} results`}
        </p>

        <PaletteFooter inScope={mode.kind === "scope"} />
      </DialogContent>
    </Dialog>
  );
}
