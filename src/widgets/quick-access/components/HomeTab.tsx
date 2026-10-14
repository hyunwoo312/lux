import { SearchField } from "@/components/SearchField";
import { useLinkEditor } from "@/widgets/quick-access/hooks/useLinkEditor";
import { useId, useRef, useState } from "react";
import type { Transition } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_STANDARD, enterTween } from "@/lib/motion";
import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { PinnedSection } from "@/widgets/quick-access/components/PinnedSection";
import { HomeBrowserSections } from "@/widgets/quick-access/components/HomeBrowserSections";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";

export function HomeTab({ editing, active = true }: { editing: boolean; active?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const morph: Transition = enterTween(reduced, "slow", EASE_STANDARD);
  const { pinnedUrls } = useItemActions();
  const editor = useLinkEditor(editing);
  const { form } = editor;
  const layoutId = useId();
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={editor.root} {...editor.dropEvents} className="relative h-full overflow-hidden">
      <motion.div
        animate={{ x: form ? "-12%" : 0, opacity: form ? 0 : 1 }}
        transition={enterTween(reduced)}
        inert={form ? true : undefined}
        className="flex h-full flex-col gap-2 overflow-hidden"
      >
        <div className="shrink-0 px-0.5 pt-1">
          <SearchField
            value={filter}
            onChange={setFilter}
            label="Filter pinned links"
            placeholder="Find a pin…"
          />
        </div>
        <div
          ref={scrollRef}
          className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        >
          <PinnedSection
            editing={editing}
            formOpen={Boolean(form)}
            filter={filter}
            layoutId={layoutId}
            morph={morph}
            onAdd={editor.add}
            onEdit={editor.edit}
          />

          <HomeBrowserSections editing={editing} active={active} scrollRef={scrollRef} />
        </div>
      </motion.div>

      {editor.dragging && (
        <div
          className="
            bg-card/90 border-primary pointer-events-none absolute inset-1 z-10 grid
            place-items-center rounded-lg border-2 border-dashed p-3 text-center text-body
          "
        >
          Drop a link to pin it
        </div>
      )}
      {form && (
        <motion.div
          layoutId={layoutId}
          transition={morph}
          className="
            bg-popover border-border/60 absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 max-h-full
            overflow-y-auto rounded-lg border p-3 shadow-elev-3
          "
        >
          <LinkForm
            initial={form.mode === "edit" ? form.link : undefined}
            prefillUrl={form.mode === "add" ? form.url : undefined}
            pinnedUrls={pinnedUrls}
            onSubmit={editor.submit}
            onCancel={editor.close}
          />
        </motion.div>
      )}
    </div>
  );
}
